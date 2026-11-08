import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// Slack tools for pi, acting as the user (xoxp token). Skip the Slack bot
// runtime entirely and call the Web API over HTTPS from-process.
const MCP_JSON = join(homedir(), ".pi/agent/mcp.json");

let cachedToken: string | undefined;
let cachedUsers: Map<string, string> | undefined;

// ponytail: token read from ~/.pi/agent/mcp.json (Slack MCP config) or
// SLACK_TOKEN env. Move to a dedicated SLACK_TOKEN file if mcp.json goes away.
function token(): string {
	if (cachedToken === undefined) {
		const found = process.env.SLACK_TOKEN ?? readTokenFromMcpJson();
		if (!found) {
			// Do not cache the miss: retry resolution on the next call so a
			// fixed mcp.json takes effect without an extension reload.
			throw new Error(
				"No Slack token. Set SLACK_TOKEN env or SLACK_MCP_XOXP_TOKEN in ~/.pi/agent/mcp.json.",
			);
		}
		cachedToken = found;
	}
	return cachedToken;
}

function readTokenFromMcpJson(): string {
	const mcp = JSON.parse(readFileSync(MCP_JSON, "utf8")) as {
		mcpServers?: Record<string, { env?: Record<string, string> }>;
	};
	return mcp.mcpServers?.slack?.env?.SLACK_MCP_XOXP_TOKEN ?? "";
}

type SlackResponse = { ok: boolean; error?: string } & Record<string, unknown>;

async function call(
	method: string,
	params: Record<string, string> = {},
	method_: "GET" | "POST" = "GET",
): Promise<SlackResponse> {
	const url = new URL(`https://slack.com/api/${method}`);
	for (const [key, value] of Object.entries(params)) {
		if (method_ === "GET") {
			url.searchParams.set(key, value);
		}
	}
	let body: string | undefined;
	if (method_ === "POST") {
		body = JSON.stringify(params);
	}
	const response = await fetch(url, {
		method: method_,
		headers: {
			Authorization: `Bearer ${token()}`,
			"Content-Type": "application/json; charset=utf-8",
		},
		body,
	});
	const data = (await response.json()) as SlackResponse;
	if (!data.ok) {
		throw new Error(`slack ${method} failed: ${data.error ?? response.status}`);
	}
	return data;
}

async function userName(userId: string): Promise<string> {
	if (cachedUsers === undefined) {
		cachedUsers = new Map();
	}
	const cached = cachedUsers.get(userId);
	if (cached !== undefined) {
		return cached;
	}
	try {
		const data = await call("users.info", { user: userId });
		const user = data.user as {
			name?: string;
			profile?: { display_name?: string; real_name?: string };
		};
		const name =
			user?.profile?.display_name ||
			user?.profile?.real_name ||
			user?.name ||
			userId;
		cachedUsers.set(userId, name);
		return name;
	} catch {
		return userId;
	}
}

// Slack timestamps are epoch seconds; JS Date wants milliseconds.
const MS_PER_SECOND = 1000;

function tsToDate(ts: string): string {
	return new Date(Number.parseFloat(ts) * MS_PER_SECOND).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
	});
}

async function formatMessages(
	messages: {
		ts: string;
		user?: string;
		text?: string;
		messages?: { text?: string }[];
	}[],
): Promise<string> {
	const lines: string[] = [];
	for (const message of messages) {
		let who = "bot";
		if (message.user) {
			who = await userName(message.user);
		}
		const text =
			message.messages?.map((m) => m.text).join(" ") ?? message.text ?? "";
		lines.push(`[${tsToDate(message.ts)}] ${who}: ${text}`);
	}
	return lines.join("\n");
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "slack_list_channels",
		label: "Slack: List Channels",
		description:
			"List Slack channels the user token can access. Returns id and name per channel. Use with slack_history.",

		parameters: Type.Object({}),
		async execute() {
			const channels: { id: string; name: string }[] = [];
			let cursor = "";
			do {
			const listParams: Record<string, string> = {
				types: "public_channel,private_channel",
				exclude_archived: "true",
				limit: "200",
			};
			if (cursor) {
				listParams.cursor = cursor;
			}
			const data = await call("conversations.list", listParams);
			channels.push(
				...((data.channels as { id: string; name: string }[]) ?? []),
			);
			const metadata = data.response_metadata as {
				next_cursor?: string;
			};
			cursor = metadata?.next_cursor ?? "";
		} while (cursor);
			const text = channels
				.map((channel) => `${channel.id} ${channel.name}`)
				.join("\n");
			return { content: [{ type: "text", text }], details: {} };
		},
	});

	pi.registerTool({
		name: "slack_history",
		label: "Slack: Channel History",
		description:
			"Fetch recent messages from a Slack channel as [time] name: text lines. Pass the channel id from slack_list_channels. Use this to check workspace activity.",
		parameters: Type.Object({
			channel_id: Type.String({ description: "Channel id, e.g. C024G2ZEE" }),
			limit: Type.Optional(
				Type.Number({
					description: "Max messages to fetch (default 10)",
					default: 10,
				}),
			),
		}),
		async execute(_id, params) {
			const data = await call("conversations.history", {
				channel: params.channel_id,
				limit: String(params.limit ?? 10),
			});
			const text = await formatMessages((data.messages as never[]) ?? []);
			return {
				content: [{ type: "text", text: text || "(no messages)" }],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "slack_search",
		label: "Slack: Search Messages",
		description:
			"Search messages across the user's Slack workspace. Returns [time] name: text with channel id in brackets.",
		parameters: Type.Object({
			query: Type.String({
				description: "Slack search query, e.g. 'PyCon' or 'in:general'",
			}),
		}),
		async execute(_id, params) {
			const data = await call("search.messages", { query: params.query });
			const matches =
				(
					data.messages as {
						matches?: {
							ts: string;
							user?: string;
							text?: string;
							channel?: { id: string };
						}[];
					}
				)?.matches ?? [];
			const lines: string[] = [];
			for (const match of matches) {
				let who = "bot";
				if (match.user) {
					who = await userName(match.user);
				}
				lines.push(
					`[${match.channel?.id ?? "?"} ${tsToDate(match.ts)}] ${who}: ${match.text ?? ""}`,
				);
			}
			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: {},
			};
		},
	});

	pi.registerTool({
		// Saves the draft into the target channel's (or thread's) composer, where
		// it shows up in Drafts & Sent for the user to review and send.
		// Never sends the message itself.
		name: "slack_save_draft",
		label: "Slack: Save Draft",
		description:
			"Save a message as a native Slack draft in the target channel (or thread with thread_ts). Shows up in Drafts & Sent for review; the message is NEVER sent. Use instead of posting unless told to send.",
		parameters: Type.Object({
			channel_id: Type.String({
				description: "Target channel id, e.g. C024G2ZEE",
			}),
			text: Type.String({
				description: "Message text (Slack mrkdwn supported)",
			}),
			thread_ts: Type.Optional(
				Type.String({
					description: "Parent message ts to draft a thread reply",
				}),
			),
		}),
		async execute(_id, params) {
			const destination: Record<string, string> = {
				channel_id: params.channel_id,
			};
			if (params.thread_ts) {
				destination.thread_ts = params.thread_ts;
			}
			const data = await call(
				"drafts.create",
				{
					client_msg_id: randomUUID(),
					destinations: JSON.stringify([destination]),
					blocks: JSON.stringify([
						{
							type: "rich_text",
							elements: [
								{
									type: "rich_text_section",
									elements: [{ type: "text", text: params.text }],
								},
							],
						},
					]),
					file_ids: "[]",
					is_from_composer: "true",
				},
				"POST",
			);
			const draft = data.draft as { id?: string };
			let where = `<#${params.channel_id}>`;
			if (params.thread_ts) {
				where = `thread ${params.thread_ts}`;
			}
			return {
				content: [
					{
						type: "text",
						text: `Draft ${draft.id ?? ""} saved for ${where}. User reviews and sends from Slack Drafts & Sent.`,
					},
				],
				details: {},
			};
		},
	});
}
