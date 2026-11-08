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
		if (process.env.SLACK_TOKEN) {
			cachedToken = process.env.SLACK_TOKEN;
		} else {
			const mcp = JSON.parse(readFileSync(MCP_JSON, "utf8")) as {
				mcpServers?: Record<string, { env?: Record<string, string> }>;
			};
			cachedToken = mcp.mcpServers?.slack?.env?.SLACK_MCP_XOXP_TOKEN ?? "";
		}
		if (!cachedToken) {
			throw new Error(
				"No Slack token. Set SLACK_TOKEN env or SLACK_MCP_XOXP_TOKEN in ~/.pi/agent/mcp.json.",
			);
		}
	}
	return cachedToken;
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
	const response = await fetch(url, {
		method: method_,
		headers: {
			Authorization: `Bearer ${token()}`,
			"Content-Type": "application/json; charset=utf-8",
		},
		body: method_ === "POST" ? JSON.stringify(params) : undefined,
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
		const user = data.user as { name?: string; profile?: { display_name?: string; real_name?: string } };
		const name =
			user?.profile?.display_name || user?.profile?.real_name || user?.name || userId;
		cachedUsers.set(userId, name);
		return name;
	} catch {
		return userId;
	}
}

function tsToDate(ts: string): string {
	return new Date(Number.parseFloat(ts) * 1000).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
	});
}

async function formatMessages(messages: {
	ts: string;
	user?: string;
	text?: string;
	messages?: { text?: string }[];
}[]): Promise<string> {
	const lines: string[] = [];
	for (const message of messages) {
		const who = message.user ? await userName(message.user) : "bot";
		const text = message.messages?.map((m) => m.text).join(" ") ?? message.text ?? "";
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
			const data = await call("conversations.list", {
				types: "public_channel,private_channel",
				exclude_archived: "true",
				limit: "200",
			});
			const text = (data.channels as { id: string; name: string }[])
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
			limit: Type.Number({
				description: "Max messages to fetch (default 10)",
				default: 10,
			}),
		}),
		async execute(_id, params) {
			const data = await call("conversations.history", {
				channel: params.channel_id,
				limit: String(params.limit ?? 10),
			});
			const text = await formatMessages(
				(data.messages as never[]) ?? [],
			);
			return { content: [{ type: "text", text: text || "(no messages)" }], details: {} };
		},
	});

	pi.registerTool({
		name: "slack_search",
		label: "Slack: Search Messages",
		description:
			"Search messages across the user's Slack workspace. Returns [time] name: text with channel id in brackets.",
		parameters: Type.Object({
			query: Type.String({ description: "Slack search query, e.g. 'PyCon' or 'in:general'" }),
		}),
		async execute(_id, params) {
			const data = await call("search.messages", { query: params.query });
			const matches =
				(data.messages as { matches?: { ts: string; user?: string; text?: string; channel?: { id: string } }[] })
					?.matches ?? [];
			const lines: string[] = [];
			for (const match of matches) {
				const who = match.user ? await userName(match.user) : "bot";
				lines.push(`[${match.channel?.id ?? "?"} ${tsToDate(match.ts)}] ${who}: ${match.text ?? ""}`);
			}
			return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
		},
	});

	pi.registerTool({
		name: "slack_post",
		label: "Slack: Post Message",
		description:
			"Post a message to a Slack channel as the user. channel_id from slack_list_channels.",
		parameters: Type.Object({
			channel_id: Type.String({ description: "Channel id, e.g. C024G2ZEE" }),
			text: Type.String({ description: "Message text (Slack mrkdwn supported)" }),
		}),
		async execute(_id, params) {
			await call(
				"chat.postMessage",
				{ channel: params.channel_id, text: params.text },
				"POST",
			);
			return { content: [{ type: "text", text: "posted" }], details: {} };
		},
	});
}
