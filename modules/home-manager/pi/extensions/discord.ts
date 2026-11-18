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
const WAIT_TIMEOUT_MS = 20_000;
const CALL_TIMEOUT_MS = 15_000;
const POLL_MS = 250;
const PAGE_SETTLE_MS = 500;

// The page is usable once the message list or the composer is mounted.
const READY_EXPRESSION = `document.querySelector('[data-list-id="chat-messages"]') || document.querySelector('[role="textbox"][data-slate-editor="true"]')`;

// The tab we navigate to is the tab that receives the typed draft, so only
// Discord hosts may be navigated to. Anything else is a leak.
const DISCORD_HOSTS = new Set([
	"discord.com",
	"canary.discord.com",
	"ptb.discord.com",
]);
const URL_SCHEME = /^https?:\/\//;
const BARE_ID = /^\d{5,}$/;
const CHANNEL_PATH = /\/channels\/(@me|\d+)\/(\d+)/;

const SETUP_HINT = `Chrome DevTools Protocol not reachable at ${CDP_BASE}. Start Chrome with a separate profile (Chrome 136+ ignores the flag on the default profile), then open https://discord.com/channels/@me and log in:

  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-discord" &`;

interface Target {
	id: string;
	type: string;
	url: string;
	webSocketDebuggerUrl?: string;
}

async function targets(): Promise<Target[]> {
	try {
		const response = await fetch(`${CDP_BASE}/json/list`);
		return (await response.json()) as Target[];
	} catch (error) {
		throw new Error(SETUP_HINT, { cause: error });
	}
}

interface Pending {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

class Cdp {
	readonly #ws: WebSocket;
	#nextId = 1;
	readonly #pending = new Map<number, Pending>();

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
			clearTimeout(pending.timer);
			if (message.error) {
				pending.reject(new Error(message.error.message ?? "CDP error"));
			} else {
				pending.resolve(message.result);
			}
		});
		// A closed tab leaves every outstanding command unsettled, so settle
		// them here instead of letting a tool wait forever.
		ws.addEventListener("close", () => {
			this.#fail(new Error("CDP socket closed"));
		});
		ws.addEventListener("error", () => {
			this.#fail(new Error("CDP socket error"));
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

	#fail(error: Error): void {
		for (const pending of this.#pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.#pending.clear();
	}

	call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
		const id = this.#nextId;
		this.#nextId += 1;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.#pending.delete(id);
				reject(
					new Error(`CDP ${method} timed out after ${CALL_TIMEOUT_MS} ms`),
				);
			}, CALL_TIMEOUT_MS);
			this.#pending.set(id, { resolve, reject, timer });
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
			throw new Error(`page script failed: ${result.exceptionDetails.text}`);
		}
		return result.result?.value as T;
	}

	close(): void {
		this.#ws.close();
	}
}

// biome-ignore lint/correctness/useQwikValidLexicalScope: not a Qwik project.
const sleep = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

async function waitFor(
	cdp: Cdp,
	expression: string,
	ms = WAIT_TIMEOUT_MS,
): Promise<void> {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (await cdp.eval<boolean>(`!!(${expression})`)) {
			return;
		}
		await sleep(POLL_MS);
	}
	throw new Error(`timed out waiting for ${expression} on the Discord page`);
}

function toAbsoluteUrl(input: string): URL {
	if (URL_SCHEME.test(input)) {
		return new URL(input);
	}
	return new URL(`https://${input}`);
}

// Accepts a full Discord channel URL, a scheme-less path, or a bare channel id.
// Anything else is rejected: a channel that cannot be resolved must not fall
// back to whatever tab happens to be open, or a draft lands in the wrong place.
// Direct messages use @me in place of a guild id.
function parseChannelPath(input: string): { guild: string; channel: string } {
	if (BARE_ID.test(input)) {
		return { guild: "", channel: input };
	}
	const parsed = toAbsoluteUrl(input);
	if (!DISCORD_HOSTS.has(parsed.hostname)) {
		throw new Error(`Refusing to open a non-Discord URL: ${input}`);
	}
	const match = parsed.pathname.match(CHANNEL_PATH);
	if (!match) {
		throw new Error(`No channel id in URL: ${input}`);
	}
	return { guild: match[1], channel: match[2] };
}

async function resolveChannelUrl(cdp: Cdp, input: string): Promise<string> {
	const { guild, channel } = parseChannelPath(input.trim());
	if (guild) {
		return `https://discord.com/channels/${guild}/${channel}`;
	}
	// A bare id resolves against the guild of the tab's current channel.
	const [, , currentGuild] = (
		await cdp.eval<string>("location.pathname")
	).split("/");
	if (!currentGuild) {
		throw new Error("Pass a full channel URL so the guild id is known.");
	}
	return `https://discord.com/channels/${currentGuild}/${channel}`;
}

async function withPage<T>(
	channel: string,
	run: (cdp: Cdp, url: string) => Promise<T>,
): Promise<T> {
	const open = (await targets()).filter(
		(target) => target.type === "page" && target.webSocketDebuggerUrl,
	);
	let target = open.find((item) => item.url.includes("discord.com/channels"));
	if (!target) {
		target = open.find((item) => item.url.includes("discord.com"));
	}
	if (!target) {
		const created = await fetch(
			`${CDP_BASE}/json/new?${encodeURIComponent("https://discord.com/channels/@me")}`,
			{ method: "PUT" },
		).catch((error) => {
			throw new Error(SETUP_HINT, { cause: error });
		});
		target = (await created.json()) as Target;
	}
	if (!target?.webSocketDebuggerUrl) {
		throw new Error(`No Discord tab in Chrome at ${CDP_BASE}.`);
	}
	const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
	try {
		const url = await resolveChannelUrl(cdp, channel);
		const current = await cdp.eval<string>("location.href");
		if (!current.startsWith(url)) {
			await cdp.call("Page.navigate", { url });
			await waitFor(cdp, `location.href.startsWith(${JSON.stringify(url)})`);
		}
		await waitFor(cdp, READY_EXPRESSION);
		return await run(cdp, url);
	} finally {
		cdp.close();
	}
}

// Runs in the page. Discord's class names are hashed, so rely on stable
// attributes: list id, message ids, message-content ids, <time>, username prefix.
const READ_MESSAGES = `(() => {
	const list = document.querySelector('[data-list-id="chat-messages"]') || document.querySelector('[class*="messagesWrapper"] [role="list"]');
	if (!list) return { error: 'no message list rendered (still loading, or not a text channel)' };
	const rows = [...list.querySelectorAll('li[id^="chat-messages-"]')];
	let author = '?';
	const messages = [];
	for (const row of rows) {
		const name = (row.querySelector('[class*="username"]')?.textContent || '').trim() || row.querySelector('img[alt]')?.getAttribute('alt') || '';
		if (name) author = name;
		const body = row.querySelector('[id^="message-content-"]');
		const text = (body?.innerText || '').trim();
		const reply = row.querySelector('[id*="repliedTextContent"]') !== null;
		messages.push({ author, time: row.querySelector('time')?.getAttribute('datetime') || '', text: reply ? '(reply) ' + text : text });
	}
	return { messages };
})()`;

// Focuses the composer, puts the caret at the end, and returns its text, so one
// call covers both "can I type here" and "what is already typed". Discord has no
// draft endpoint, so the composer itself is the only draft storage.
const COMPOSER_STATE = `(() => {
	const box = document.querySelector('[class*="channelTextArea"] [role="textbox"]') || document.querySelector('[role="textbox"][data-slate-editor="true"]');
	if (!box) return null;
	box.focus();
	const selection = window.getSelection();
	if (selection) { selection.selectAllChildren(box); selection.collapseToEnd(); }
	return box.innerText;
})()`;

interface PageMessage {
	author: string;
	time: string;
	text: string;
}

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
				await sleep(PAGE_SETTLE_MS);
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
			"Type a reply into the target Discord channel's composer in the user's logged-in Chrome tab and leave it unsent, so Discord stores it as a native draft. NEVER sends the message. Use this instead of posting. Refuses to run if the composer already holds text.",
		parameters: Type.Object({
			channel: Type.String({
				description:
					"Channel URL, e.g. https://discord.com/channels/123/456 (a bare channel id also works inside a guild)",
			}),
			text: Type.String({ description: "Draft text, newlines allowed" }),
		}),
		async execute(_id, params) {
			const report = await withPage(params.channel, async (cdp) => {
				const existing = await cdp.eval<string | null>(COMPOSER_STATE);
				if (existing === null) {
					throw new Error(
						"composer not found: is this a channel you can post in?",
					);
				}
				if (existing.trim() !== "") {
					throw new Error(`composer already holds text:\n${existing}`);
				}
				// Insert the whole draft in one call. Discord's Slate editor drops
				// the line breaks when each line is typed separately.
				const text = params.text.replace(/\r\n/g, "\n");
				await cdp.call("Input.insertText", { text });
				const composed = await cdp.eval<string | null>(COMPOSER_STATE);
				const probe = text.split("\n").find((line) => line.trim() !== "");
				if (!(composed && probe && composed.includes(probe))) {
					throw new Error(
						`text did not land in the composer (composer now: ${JSON.stringify(composed)})`,
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
