import { spawn } from "node:child_process";
import process from "node:process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// Discord tools for pi that stay inside what the Discord client itself shows and
// does. The previous version scraped the DOM and typed into the composer over the
// Chrome DevTools Protocol, which is an automated client and a scrape: both are
// against Discord's terms.
//
// What is left is deliberately small:
//
// - discord_history opens the channel in the Discord tab and screenshots it, then
//   hands the image to the model, which reads the messages from the picture.
//   Nothing is read out of the page.
// - discord_copy_draft puts a reply on the system clipboard. The human pastes it
//   into Discord.
//
// Opening a tab and navigating it is what a user does with a browser, so that
// stays. What is gone is reading the DOM, dispatching keystrokes, and calling any
// Discord API.
const CDP_BASE = process.env.DISCORD_CDP_URL ?? "http://127.0.0.1:9222";
const CALL_TIMEOUT_MS = 15_000;
const PAGE_SETTLE_MS = 1500;
const NAVIGATE_SETTLE_MS = 6000;

const DISCORD_HOSTS = new Set([
	"discord.com",
	"canary.discord.com",
	"ptb.discord.com",
]);
const URL_SCHEME = /^https?:\/\//;
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
		// A closed tab leaves every outstanding command unsettled, so settle them
		// here instead of letting a tool wait forever.
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

	close(): void {
		this.#ws.close();
	}
}

// biome-ignore lint/correctness/useQwikValidLexicalScope: not a Qwik project.
const sleep = (ms: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

// Only Discord channel URLs are accepted: the tab is navigated to whatever the
// caller passes, so anything else would open an unrelated page in the browser the
// user is logged into.
function channelUrl(input: string): string {
	const parsed = new URL(URL_SCHEME.test(input) ? input : `https://${input}`);
	if (!DISCORD_HOSTS.has(parsed.hostname)) {
		throw new Error(`Refusing to open a non-Discord URL: ${input}`);
	}
	if (!CHANNEL_PATH.test(parsed.pathname)) {
		throw new Error(`No channel id in URL: ${input}`);
	}
	return parsed.href;
}

// The tab is chosen from Chrome's own target list. A Discord tab is reused when
// there is one; otherwise a tab is opened, which is a browser action rather than
// anything Discord-specific. The page is never asked for its content: only
// Page.navigate and Page.captureScreenshot are used.
async function captureDiscordTab(
	url: string,
): Promise<{ url: string; data: string }> {
	const open = (await targets()).filter(
		(target) => target.type === "page" && target.webSocketDebuggerUrl,
	);
	let target =
		open.find((item) => item.url.includes("discord.com/channels")) ??
		open.find((item) => item.url.includes("discord.com"));
	let navigate = true;
	if (target?.url.startsWith(url)) {
		navigate = false;
	} else if (!target) {
		const created = await fetch(
			`${CDP_BASE}/json/new?${encodeURIComponent(url)}`,
			{ method: "PUT" },
		).catch((error) => {
			throw new Error(SETUP_HINT, { cause: error });
		});
		target = (await created.json()) as Target;
		// The new tab is already loading the URL.
		navigate = false;
	}
	if (!target?.webSocketDebuggerUrl) {
		throw new Error(`Could not open a Discord tab in Chrome at ${CDP_BASE}.`);
	}
	const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
	try {
		if (navigate) {
			await cdp.call("Page.navigate", { url });
			await sleep(NAVIGATE_SETTLE_MS);
		} else {
			// Give a channel that is still painting a moment to finish.
			await sleep(PAGE_SETTLE_MS);
		}
		const shot = (await cdp.call("Page.captureScreenshot", {
			format: "png",
		})) as { data?: string };
		if (!shot.data) {
			throw new Error("Page.captureScreenshot returned no image data");
		}
		return { url, data: shot.data };
	} finally {
		cdp.close();
	}
}

const CLIPBOARD_COMMANDS: Record<string, string[]> = {
	darwin: ["pbcopy"],
	win32: ["clip"],
	linux: ["wl-copy"],
};

function copyToClipboard(text: string): Promise<void> {
	const command = CLIPBOARD_COMMANDS[process.platform];
	if (!command) {
		throw new Error(`No clipboard command known for ${process.platform}`);
	}
	return new Promise((resolve, reject) => {
		const child = spawn(command[0], command.slice(1));
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`${command[0]} exited with status ${code}`));
			}
		});
		child.stdin.end(text);
	});
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "discord_history",
		label: "Discord: Read Channel Screenshot",
		description:
			"Open a Discord channel in the user's logged-in Discord tab in Chrome, screenshot it, and return the image. Read the messages from the image; the newest message is at the bottom. Nothing is read out of the page and nothing is typed into Discord, so the user keeps driving Discord and this only opens the channel and looks at the screen.",
		parameters: Type.Object({
			channel: Type.String({
				description:
					"Discord channel URL, e.g. https://discord.com/channels/123/456. Direct messages use /channels/@me/<id>.",
			}),
		}),
		async execute(_id, params) {
			const shot = await captureDiscordTab(channelUrl(params.channel));
			return {
				content: [
					{
						type: "text",
						text: `Screenshot of ${shot.url}. Read the messages from the image, oldest at the top, newest at the bottom.`,
					},
					{ type: "image", data: shot.data, mimeType: "image/png" },
				],
				details: {},
			};
		},
	});

	pi.registerTool({
		name: "discord_copy_draft",
		label: "Discord: Copy Draft",
		description:
			"Copy a reply to the system clipboard so the user can paste it into Discord themselves. Nothing is sent to Discord and nothing is typed into it.",
		parameters: Type.Object({
			text: Type.String({ description: "Text to copy to the clipboard" }),
		}),
		async execute(_id, params) {
			await copyToClipboard(params.text);
			return {
				content: [
					{
						type: "text",
						text: `Copied ${params.text.length} characters to the clipboard. Paste it into Discord yourself.`,
					},
				],
				details: {},
			};
		},
	});
}
