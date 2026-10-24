import process from "node:process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// TryHackMe extension: fetch TryHackMe room content as Markdown so the agent
// can read room tasks and give hints. TryHackMe sits behind a Vercel security
// checkpoint that blocks plain HTTP clients, so room pages are fetched through
// the Jina Reader proxy (r.jina.ai), which renders the page and returns clean
// Markdown. Override the reader base URL with THM_READER_URL if needed.
// Only free/public rooms are accessible; session-cookie auth for subscriber
// rooms is intentionally not supported.

const DEFAULT_READER = "https://r.jina.ai";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const NOT_FOUND_PREFIXES = [
	"Title: TryHackMe | Cyber Security Training", // generic 404 page
	"Title: Hacktivities", // invalid room code page
];

function retryOrThrow(
	roomCode: string,
	readerBase: string,
	reason: string,
	attempt: number,
): Promise<string> {
	if (attempt >= MAX_ATTEMPTS) {
		return Promise.reject(
			new Error(
				`Failed to fetch room '${roomCode}' (${reason}). The reader proxy may be rate-limited; try again in a minute or set THM_READER_URL to another instance.`,
			),
		);
	}
	return sleep(RETRY_DELAY_MS * attempt).then(() =>
		fetchRoomMarkdown(roomCode, readerBase, attempt + 1),
	);
}

function fetchRoomMarkdown(
	roomCode: string,
	readerBase: string,
	attempt = 1,
): Promise<string> {
	return fetch(readerUrl(roomCode, readerBase), {
		headers: { Accept: "text/plain" },
	}).then(async (response) => {
		if (!response.ok) {
			return retryOrThrow(
				roomCode,
				readerBase,
				`HTTP ${response.status}`,
				attempt,
			);
		}
		const text = await response.text();
		// The Vercel challenge page renders through the reader with its
		// checkpoint title; treat that as a transient failure and retry.
		if (text.includes("Vercel Security Checkpoint")) {
			return retryOrThrow(
				roomCode,
				readerBase,
				"Vercel security checkpoint",
				attempt,
			);
		}
		if (NOT_FOUND_PREFIXES.some((prefix) => text.startsWith(prefix))) {
			throw new Error(`Room '${roomCode}' not found. Check the room code.`);
		}
		return text;
	});
}

// Room codes verified against tryhackme.com on 2026-02-15. Add a code only
// after fetching it once and checking the page title.
const CURATED_TOPICS: Record<string, string[]> = {
	"Linux Fundamentals": [
		"linuxfundamentalspart1",
		"linuxfundamentalspart2",
		"linuxfundamentalspart3",
	],
	Networking: ["nmap01"],
	"Security / Pentesting": ["metasploitintro"],
};

export function roomUrl(roomCode: string): string {
	return `https://tryhackme.com/room/${encodeURIComponent(roomCode)}`;
}

export function readerUrl(roomCode: string, readerBase: string): string {
	return `${readerBase.replace(/\/$/, "")}/${roomUrl(roomCode)}`;
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "thm_get_room",
		label: "TryHackMe: Get Room",
		description:
			"Fetch a TryHackMe room page as Markdown: description, all tasks, theory, commands, and questions. Free/public rooms only. Use it to read a room before or while solving it; give hints rather than full answer walkthroughs.",
		parameters: Type.Object({
			room_code: Type.String({
				description:
					"Room identifier from the room URL, e.g. 'linuxfundamentalspart1'",
			}),
		}),
		async execute(_toolCallId, params) {
			const readerBase = process.env.THM_READER_URL ?? DEFAULT_READER;
			const text = await fetchRoomMarkdown(params.room_code, readerBase);
			return { content: [{ type: "text", text }], details: {} };
		},
	});

	pi.registerTool({
		name: "thm_get_curated_topics",
		label: "TryHackMe: Curated Topics",
		description:
			"List verified free TryHackMe rooms grouped by category. Use it to pick a room to play, then fetch its content with thm_get_room.",
		parameters: Type.Object({}),
		async execute() {
			const text = JSON.stringify(CURATED_TOPICS, null, 2);
			return { content: [{ type: "text", text }], details: {} };
		},
	});
}
