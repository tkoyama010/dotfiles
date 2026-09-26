import process from "node:process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// Transifex API v3 extension: lets the agent list untranslated strings and
// save translations via the public REST API. Requires TX_TOKEN (Bearer token
// from https://app.transifex.com/user/settings/).

const API = "https://rest.api.transifex.com";

type JsonApiItem = {
	id: string;
	attributes: Record<string, unknown>;
	relationships?: Record<string, { data?: { id: string } }>;
};

type JsonApiResponse = {
	data: JsonApiItem[];
	included?: JsonApiItem[];
	links?: { next?: string | null };
};

function token(): string {
	const value = process.env.TX_TOKEN;
	if (!value) {
		throw new Error(
			"TX_TOKEN is not set. Generate an API token at https://app.transifex.com/user/settings/ and export TX_TOKEN.",
		);
	}
	return value;
}

async function txGet(path: string): Promise<JsonApiResponse> {
	const response = await fetch(
		path.startsWith("http") ? path : `${API}${path}`,
		{
			headers: {
				Accept: "application/vnd.api+json",
				Authorization: `Bearer ${token()}`,
			},
		},
	);
	if (!response.ok) {
		throw new Error(
			`Transifex API ${response.status}: ${await response.text()}`,
		);
	}
	return (await response.json()) as JsonApiResponse;
}

function resourceId(org: string, project: string, resource: string): string {
	return `o:${org}:p:${project}:r:${resource}`;
}

/** Return the (slot id, key, source) triples of untranslated strings from a resource_translations response. */
export function pickUntranslated(
	response: JsonApiResponse,
): Array<{ id: string; key: string; source: string }> {
	const includedById = new Map<string, JsonApiItem>(
		(response.included ?? []).map((item) => [item.id, item]),
	);
	const result: Array<{ id: string; key: string; source: string }> = [];
	for (const item of response.data) {
		if (item.attributes.strings?.other) continue;
		const resourceString = includedById.get(
			item.relationships?.resource_string?.data?.id ?? "",
		);
		if (!resourceString) continue;
		result.push({
			id: item.id,
			key: String(resourceString.attributes.key ?? ""),
			source: String(resourceString.attributes.strings?.other ?? ""),
		});
	}
	return result;
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "transifex_list_resources",
		label: "Transifex: List Resources",
		description:
			"List resources (slug, name, categories) in a Transifex project. Uses TX_TOKEN env var.",
		parameters: Type.Object({
			org: Type.String({ description: "Organization slug" }),
			project: Type.String({ description: "Project slug" }),
		}),
		async execute(_toolCallId, params) {
			const query = new URLSearchParams({
				"filter[project]": `o:${params.org}:p:${params.project}`,
			});
			const json = await txGet(`/resources?${query}`);
			const text = JSON.stringify(
				json.data.map((r) => ({
					slug: r.attributes.slug,
					name: r.attributes.name,
					categories: r.attributes.categories,
				})),
				null,
				2,
			);
			return { content: [{ type: "text", text }], details: {} };
		},
	});

	pi.registerTool({
		name: "transifex_get_untranslated",
		label: "Transifex: Get Untranslated",
		description:
			"Fetch untranslated strings (slot id, key, source text) for one resource and language. Translate them with transifex_translate.",
		parameters: Type.Object({
			org: Type.String({ description: "Organization slug" }),
			project: Type.String({ description: "Project slug" }),
			resource: Type.String({ description: "Resource slug" }),
			lang: Type.String({ description: "Target language code, e.g. ja" }),
			limit: Type.Optional(
				Type.Number({ description: "Max strings to return (default 50)" }),
			),
		}),
		async execute(_toolCallId, params) {
			const limit = params.limit ?? 50;
			const query = new URLSearchParams({
				"filter[resource]": resourceId(
					params.org,
					params.project,
					params.resource,
				),
				"filter[language]": `l:${params.lang}`,
				include: "resource_string",
				"page[limit]": "100",
			});
			const untranslated: Array<{ id: string; key: string; source: string }> =
				[];
			let path: string | undefined = `/resource_translations?${query}`;
			while (path && untranslated.length < limit) {
				const json = await txGet(path);
				untranslated.push(...pickUntranslated(json));
				path = json.links?.next ?? undefined;
				if (path) path = path.startsWith("http") ? path : `${API}${path}`;
			}
			const text = JSON.stringify(untranslated.slice(0, limit), null, 2);
			return { content: [{ type: "text", text }], details: {} };
		},
	});

	pi.registerTool({
		name: "transifex_translate",
		label: "Transifex: Save Translation",
		description:
			"Save translations for untranslated strings. Pass one entry per string: the slot id and translated text from transifex_get_untranslated. Omit text to copy the source string unchanged (for markup/identifier strings that must not be translated).",
		parameters: Type.Object({
			translations: Type.Array(
				Type.Object({
					id: Type.String({ description: "Resource translation slot id" }),
					text: Type.Optional(
						Type.String({
							description: "Translated text; omit to copy the source string",
						}),
					),
				}),
			),
		}),
		async execute(_toolCallId, params) {
			const saved: string[] = [];
			const failed: Array<{ id: string; error: string }> = [];
			for (const { id, text } of params.translations) {
				let value = text;
				if (value === undefined) {
					// Copy source: fetch the slot with its resource_string.
					try {
						const json = await txGet(
							`/resource_translations/${id}?include=resource_string`,
						);
						value = String(json.included?.[0]?.attributes.strings?.other ?? "");
					} catch (error) {
						failed.push({ id, error: String(error) });
						continue;
					}
				}
				const response = await fetch(`${API}/resource_translations/${id}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/vnd.api+json",
						Accept: "application/vnd.api+json",
						Authorization: `Bearer ${token()}`,
					},
					body: JSON.stringify({
						data: {
							id,
							type: "resource_translations",
							attributes: { strings: { other: value } },
						},
					}),
				});
				if (response.ok) {
					saved.push(id);
				} else {
					failed.push({
						id,
						error: `${response.status}: ${await response.text()}`,
					});
				}
			}
			const text = JSON.stringify({ saved, failed }, null, 2);
			return { content: [{ type: "text", text }], details: {} };
		},
	});
}
