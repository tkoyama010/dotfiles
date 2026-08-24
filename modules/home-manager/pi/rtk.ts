// RTK Pi extension — rewrites bash commands to use rtk for token savings.
// Requires: rtk >= 0.23.0 in PATH.
//
// This is a thin delegating extension: all rewrite logic lives in `rtk rewrite`,
// which is the single source of truth (src/discover/registry.rs).
// To add or change rewrite rules, edit the Rust registry — not this file.
//
// Exit code contract for `rtk rewrite`:
//   0 + stdout  Rewrite found → mutate command
//   1           No RTK equivalent → pass through unchanged
//   3 + stdout  Rewrite (advisory) → mutate command

import process from "node:process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

const REWRITE_TIMEOUT_MS = 2000;
const MIN_SUPPORTED_RTK_MINOR = 23;

// Parse "X.Y.Z" semver, return [major, minor, patch] or null.
function parseSemver(raw: string): [number, number, number] | null {
	const m = raw.trim().match(/(\d+)\.(\d+)\.(\d+)/);
	if (!m) {
		return null;
	}
	return [
		Number.parseInt(m[1], 10),
		Number.parseInt(m[2], 10),
		Number.parseInt(m[3], 10),
	];
}

// Calls `rtk rewrite`; returns the rewritten command or null (pass through).
async function rewriteCommand(
	pi: ExtensionAPI,
	cmd: string,
	signal?: AbortSignal,
): Promise<string | null> {
	const result = await pi.exec("rtk", ["rewrite", cmd], {
		timeout: REWRITE_TIMEOUT_MS,
		signal,
	});
	if (result.killed) {
		return null;
	}
	if (result.code !== 0 && result.code !== 3) {
		return null;
	}
	return result.stdout.trim() || null;
}

export default async function (pi: ExtensionAPI) {
	// Probe rtk version at load time; disables extension if missing or too old.
	const ver = await pi.exec("rtk", ["--version"], {
		timeout: REWRITE_TIMEOUT_MS,
	});
	if (ver.code !== 0) {
		return;
	}

	// Warn and bail if rtk predates 0.23.0 (when `rtk rewrite` was introduced).
	const parsed = parseSemver(ver.stdout.replace(/^rtk\s+/, ""));
	if (parsed) {
		const [major, minor] = parsed;
		if (major === 0 && minor < MIN_SUPPORTED_RTK_MINOR) {
			return;
		}
	}

	pi.on("tool_call", async (event, ctx) => {
		try {
			if (!isToolCallEventType("bash", event)) {
				return;
			}

			const cmd = event.input.command;
			if (typeof cmd !== "string" || cmd.trim() === "") {
				return;
			}

			if (cmd.startsWith("rtk ")) {
				return;
			}
			if (process.env.RTK_DISABLED === "1") {
				return;
			}

			// Delegate to RTK.
			const rewritten = await rewriteCommand(pi, cmd, ctx.signal);
			if (rewritten && rewritten !== cmd) {
				event.input.command = rewritten;
			}
		} catch {}
	});
}
