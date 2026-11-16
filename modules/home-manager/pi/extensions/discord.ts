import process from "node:process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// Discord tools for pi without a bot: drive the user's own logged-in Discord
// web client over the Chrome DevTools Protocol. Reads what is rendered on the
// page and leaves reply text in the composer, which Discord persists as a
// native draft. No bot token, no user token, no Discord API calls.
// ponytail: UI scraping, not the REST API. Discord has no draft endpoint, so
// the composer is the only place a draft can live. Add the REST API later only
// if reading far history matters more than ToS risk.
const CDP_BASE = process.env.DISCORD_CDP_URL ?? "http://127.0.0.1:9222";

const SETUP_HINT = `Chrome DevTools Protocol not reachable at ${CDP_BASE}.
Start Chrome with a separate profile (Chrome 136+ ignores the flag on the
default profile), then open https://discord.com/channels/@me and log in:

  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
    --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-discord" &`;

type Target = {
	id: string;
	type: string;
	url: string;
	webSocketDebuggerUrl?: string;
};

async function targets(): Promise<Target[]> {
	try {
		const response = await fetch(`${CDP_BASE}/json/list`);
		return (await response.json()) as Target[];
	} catch {
		throw new Error(SETUP_HINT);
	}
}

type Pending = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
};

class Cdp {
	#ws: WebSocket;
	#nextId = 1;
	#pending = new Map<number, Pending>();

	private constructor(ws: WebSocket) {
		this.#ws = ws;
		ws.addEventListener("message", (event) => {
			const raw = event.data;
			if (typeof raw !== "string") {
				return;
			}
			const message = JSON.parse(raw) as {
				id?: number;
				result?: unknown;
				error?: { message?: string };
			};
			if (message.id === undefined) {
				return;
			}
			const pending = this.#pending.get(message.id);
			if (pending === undefined) {
				return;
			}
			this.#pending.delete(message.id);
			if (message.error) {
				pending.reject(new Error(message.error.message ?? "CDP error"));
			} else {
				pending.resolve(message.result);
			}
		});
	}

	static connect(url: string): Promise<Cdp> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(url);
			ws.addEventListener("open", () => resolve(new Cdp(ws)), {
				once: true,
			});
			ws.addEventListener("error", () => reject(new Error(SETUP_HINT)), {
				once: true,
			});
		});
	}

	call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
		const id = this.#nextId++;
		return new Promise((resolve, reject) => {
			this.#pending.set(id, { resolve, reject });
			this.#ws.send(JSON.stringify({ id, method, params }));
		});
	}

	async eval<T>(expression: string): Promise<T> {
		const result = (await this.call("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		})) as {
			result?: { value?: T };
			exceptionDetails?: { text?: string };
		};
		if (result.exceptionDetails) {
			throw new Error(
				`page script failed: ${result.exceptionDetails.text ?? "unknown"}`,
			);
		}
		return result.result?.value as T;
	}

	close(): void {
		this.#ws.close();
	}
}

const sleep = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

async function waitFor(cdp: Cdp, expression: string, ms = 20_000): Promise<void> {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (await cdp.eval<boolean>(`!!(${expression})`)) {
			return;
		}
		await sleep(250);
	}
	throw new Error(`timed out waiting for ${expression} on the Discord page`);
}

// Accepts a full channel URL or a bare channel id. Bare ids resolve against the
// guild of the tab's current channel.
async function resolveChannelUrl(
	cdp: Cdp,
	input: string,
): Promise<string | undefined> {
	const trimmed = input.trim();
	if (/^https?:\/\//.test(trimmed)) {
		return trimmed;
	}
	const match = trimmed.match(
		/discord(?:app)?\.com\/channels\/([^/?#\s]+)\/([^/?#\s]+)/,
	);
	if (match) {
		return `https://discord.com/channels/${match[1]}/${match[2]}`;
	}
	const bare = trimmed;
	if (!/^\d{5,}$/.test(bare)) {
		return undefined;
	}
	const current = await cdp.eval<string>("location.pathname");
	const guild = current.split("/")[2];
	if (!guild) {
		throw new Error(
			"Pass a full channel URL (or open any channel in the Discord tab first) so the guild id is known.",
		);
	}
	return `https://discord.com/channels/${guild}/${bare}`;
}

async function withPage<T>(
	channel: string | undefined,
	run: (cdp: Cdp, url: string) => Promise<T>,
): Promise<T> {
	const open = (await targets()).filter(
		(target) => target.type === "page" && target.webSocketDebuggerUrl,
	);
	let target = open.find((item) => item.url.includes("discord.com/channels"));
	if (!target) {
		target = open.find((item) => item.url.includes("discord.com"));
	}
	if (!target && channel) {
		const created = await fetch(
			`${CDP_BASE}/json/new?${encodeURIComponent("https://discord.com/channels/@me")}`,
			{ method: "PUT" },
		).catch(() => {
			throw new Error(SETUP_HINT);
		});
		target = (await created.json()) as Target;
	}
	if (!target?.webSocketDebuggerUrl) {
		throw new Error(
			`No Discord tab in Chrome at ${CDP_BASE}. Open https://discord.com/channels/@me and log in.`,
		);
	}
	const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
	try {
		const url = channel ? await resolveChannelUrl(cdp, channel) : undefined;
		if (url) {
			const current = await cdp.eval<string>("location.href");
			if (!current.startsWith(url)) {
				await cdp.call("Page.navigate", { url });
				await waitFor(cdp, `location.href.startsWith(${JSON.stringify(url)})`);
			}
			await waitFor(
				cdp,
				`document.querySelector('[data-list-id="chat-messages"]') || document.querySelector('[role="textbox"][data-slate-editor="true"]')`,
			);
		}
		return await run(cdp, url ?? (await cdp.eval<string>("location.href")));
	} finally {
		cdp.close();
	}
}

// Runs in the page. Discord's class names are hashed, so rely on stable
// attributes: list id, message ids, message-content ids, <time>, username prefix.
const READ_MESSAGES = `(() => {
	const list = document.querySelector('[data-list-id="chat-messages"]')
		|| document.querySelector('[class*="messagesWrapper"] [role="list"]');
	if (!list) {
		return { error: 'no message list rendered (still loading, or not a text channel)' };
	}
	const rows = [...list.querySelectorAll('li[id^="chat-messages-"]')];
	let author = '?';
	const messages = [];
	for (const row of rows) {
		const name = (row.querySelector('[class*="username"]')?.textContent || '').trim()
			|| row.querySelector('img[alt]')?.getAttribute('alt')
			|| '';
		if (name) author = name;
		const body = row.querySelector('[id^="message-content-"]');
		const text = (body?.innerText || '').trim();
		const reply = row.querySelector('[id*="repliedTextContent"]') !== null;
		messages.push({
			author,
			time: row.querySelector('time')?.getAttribute('datetime') || '',
			text: reply ? '(reply) ' + text : text,
		});
	}
	return { messages };
})()`;

type PageMessage = { author: string; time: string; text: string };

function formatTime(iso: string): string {
	if (!iso) {
		return "??:??";
	}
	return new Date(iso).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

const FOCUS_COMPOSER = `(() => {
	const box = document.querySelector('[class*="channelTextArea"] [role="textbox"]')
		|| document.querySelector('[role="textbox"][data-slate-editor="true"]');
	if (!box) return false;
	box.focus();
	const selection = window.getSelection();
	if (selection) {
		selection.selectAllChildren(box);
		selection.collapseToEnd();
	}
	return true;
})()`;

const COMPOSER_TEXT = `(() => {
	const box = document.querySelector('[class*="channelTextArea"] [role="textbox"]')
		|| document.querySelector('[role="textbox"][data-slate-editor="true"]');
	return box ? box.innerText : null;
})()`;

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "discord_history",
		label: "Discord: Channel History",
		description:
			"Read messages rendered in a Discord channel of the user's logged-in Discord web tab in Chrome (no bot, UI scrape). Pass a channel URL from the browser. Returns [time] author: text lines, oldest first.",
		parameters: Type.Object({
			channel: Type.String({
				description:
					"Channel URL, e.g. https://discord.com/channels/123/456 (a bare channel id also works inside a guild)",
			}),
		}),
		async execute(_id, params) {
			const text = await withPage(params.channel, async (cdp) => {
				// Nudge the list so a fresh navigation has messages mounted.
				await sleep(500);
				const result = await cdp.eval<{
					messages?: PageMessage[];
					error?: string;
				}>(READ_MESSAGES);
				if (result.error) {
					throw new Error(result.error);
				}
				const lines = (result.messages ?? []).map(
					(message) =>
						`[${formatTime(message.time)}] ${message.author}: ${message.text || "(embed/attachment)"}`,
				);
				return lines.join("\n");
			});
			return {
				content: [{ type: "text", text: text || "(no messages rendered)" }],
				details: {},
			};
		},
	});

	pi.registerTool({
		// Types into the Discord composer and leaves it there. Discord keeps
		// unsent composer text as a draft (DRAFT badge in the channel list).
		// Enter is never sent, so the message stays unsent.
		name: "discord_save_draft",
		label: "Discord: Save Draft",
		description:
			"Type a reply into the target Discord channel's composer in the user's logged-in Chrome tab and leave it unsent, so Discord stores it as a native draft. NEVER sends the message. Use this instead of posting.",
		parameters: Type.Object({
			channel: Type.String({
				description:
					"Channel URL, e.g. https://discord.com/channels/123/456 (a bare channel id also works inside a guild)",
			}),
			text: Type.String({ description: "Draft text, newlines allowed" }),
		}),
		async execute(_id, params) {
			const report = await withPage(params.channel, async (cdp) => {
				if (!(await cdp.eval<boolean>(FOCUS_COMPOSER))) {
					throw new Error(
						"composer not found: is this a channel you can post in, and is Discord fully loaded?",
					);
				}
				const lines = params.text.replace(/\r\n/g, "\n").split("\n");
				for (const [index, line] of lines.entries()) {
					if (index > 0) {
						// Shift+Enter: line break without sending.
						for (const type of ["keyDown", "keyUp"]) {
							await cdp.call("Input.dispatchKeyEvent", {
								type,
								key: "Enter",
								code: "Enter",
								windowsVirtualKeyCode: 13,
								modifiers: 8,
							});
						}
					}
					if (line !== "") {
						await cdp.call("Input.insertText", { text: line });
					}
				}
				const composed = await cdp.eval<string | null>(COMPOSER_TEXT);
				if (!composed?.includes(lines[lines.length - 1].slice(0, 20))) {
					throw new Error(
						`text did not land in the composer (composer now: ${JSON.stringify(composed ?? "")})`,
					);
				}
				return composed;
			});
			return {
				content: [
					{
						type: "text",
						text: `Draft left in the composer, unsent:\n${report}\nReview and press Enter in Discord yourself to send.`,
					},
				],
				details: {},
			};
		},
	});
}
