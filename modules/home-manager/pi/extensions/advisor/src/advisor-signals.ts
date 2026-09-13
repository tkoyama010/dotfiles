/**
 * Pure logic for turning tool results into advisor signals: per-run event
 * summaries, stage detection, and the nudge heuristic. Deliberately free of
 * pi imports so it stays unit-testable with plain `node --test`.
 */

export type AdvisorStage = "initial" | "recovery" | "final-check";

export interface AdvisorStageInfo {
	stage: AdvisorStage;
	reason: string;
}

export interface RunToolEvent {
	toolName: string;
	summary: string;
	command?: string;
	isError: boolean;
	timestamp: number;
}

export type ExecutorSignals = {
	phase: "exploring" | "mutating" | "verifying" | "stuck";
	mutationsCount: number;
	verificationCommands: string[];
	recentFailures: string[];
};

/** Structural subset of pi's ToolResultEvent — keeps this module pi-free. */
export type ToolResultLike = {
	toolName: string;
	input?: Record<string, unknown>;
	content?: unknown;
	isError: boolean;
	details?: unknown;
};

function squeezeWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

function extractPrimaryText(content: unknown): string {
	if (!Array.isArray(content)) return "";
	return content
		.filter((block): block is { type: string; text: string } => Boolean(block) && typeof block === "object" && (block as { type?: string }).type === "text")
		.map((block) => block.text)
		.join("\n")
		.trim();
}

export function extractBashExitCode(text: string): number | undefined {
	// Pi's bash tool reports failures as "Command exited with code N".
	const match = text.match(/exit(?:ed)?\s+(?:with\s+)?code:?\s*(\d+)/i);
	if (!match) return undefined;
	const code = Number.parseInt(match[1], 10);
	return Number.isNaN(code) ? undefined : code;
}

export function countPatchChanges(patch: string): { added: number; removed: number } {
	let added = 0;
	let removed = 0;
	for (const line of patch.split("\n")) {
		if (line.startsWith("+++") || line.startsWith("---")) continue;
		if (line.startsWith("+")) added++;
		else if (line.startsWith("-")) removed++;
	}
	return { added, removed };
}

export function summarizeToolResult(event: ToolResultLike): RunToolEvent {
	const { toolName, input, content, isError } = event;
	const text = extractPrimaryText(content);
	const oneLine = squeezeWhitespace(text).slice(0, 140);

	switch (toolName) {
		case "read": {
			const path = typeof input?.path === "string" ? input.path : "(unknown path)";
			return { toolName, summary: `read ${path}`, isError, timestamp: Date.now() };
		}
		case "edit":
		case "write": {
			const path = typeof input?.path === "string" ? input.path : "(unknown path)";
			const patch = (event.details as { patch?: unknown } | undefined)?.patch;
			let changeStats = "";
			if (typeof patch === "string" && patch.length > 0) {
				const { added, removed } = countPatchChanges(patch);
				changeStats = ` (+${added}/-${removed})`;
			}
			return { toolName, summary: `${toolName} ${path}${changeStats}`, isError, timestamp: Date.now() };
		}
		case "bash": {
			const command = typeof input?.command === "string" ? squeezeWhitespace(input.command).slice(0, 140) : undefined;
			const exitCode = extractBashExitCode(text);
			const suffix = exitCode !== undefined ? ` (exit ${exitCode})` : isError ? " (error)" : "";
			return {
				toolName,
				summary: `$ ${command ?? "(unknown command)"}${suffix}`,
				command,
				isError: isError || (exitCode !== undefined && exitCode !== 0),
				timestamp: Date.now(),
			};
		}
		default:
			return {
				toolName,
				summary: oneLine ? `${toolName}: ${oneLine}` : toolName,
				isError,
				timestamp: Date.now(),
			};
	}
}

const VERIFICATION_SEGMENT_PATTERNS: RegExp[] = [
	/^(?:npx\s+|bunx\s+)?(?:jest|vitest|pytest|rspec|tsc|eslint|biome|mocha|ava)\b/,
	/^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|tests|check|lint|typecheck|build)\b/,
	/^cargo\s+(?:test|check|clippy|build)\b/,
	/^go\s+(?:test|vet|build)\b/,
	/^make\s+(?:test|check|lint|build)\b/,
	/^node\s+--test\b/,
	/^python3?\s+-m\s+pytest\b/,
];

export function isVerificationCommand(command?: string): boolean {
	if (!command) return false;
	// Match per pipeline segment against the leading token, so paths like
	// `cat tests/foo.test.ts` don't register as verification runs.
	return command.split(/&&|\|\||;|\|/).some((segment) => {
		const normalized = segment.trim().replace(/^(?:\w+=\S+\s+)+/, "");
		return VERIFICATION_SEGMENT_PATTERNS.some((pattern) => pattern.test(normalized));
	});
}

export function detectStage(events: RunToolEvent[], callNumber: number): AdvisorStageInfo {
	const hasMutation = events.some((event) => event.toolName === "edit" || event.toolName === "write");
	const hasVerification = events.some((event) => event.toolName === "bash" && isVerificationCommand(event.command));
	const recentFailure = [...events].reverse().find((event) => event.isError);
	const explorationCount = events.filter((event) => event.toolName === "read" || event.toolName === "bash").length;

	if (hasMutation && hasVerification) {
		return {
			stage: "final-check",
			reason: "Implementation changes exist and verification output is already in the transcript.",
		};
	}

	if (recentFailure) {
		return {
			stage: "recovery",
			reason: `Recent failure signal: ${recentFailure.summary}`,
		};
	}

	if (hasMutation && callNumber > 1) {
		return {
			stage: "recovery",
			reason: "Implementation has started and the executor is checking course again before finishing.",
		};
	}

	if (!hasMutation && explorationCount >= 2) {
		return {
			stage: "initial",
			reason: "Exploratory reads or commands have happened, but the executor has not committed to file changes yet.",
		};
	}

	if (hasMutation) {
		return {
			stage: "recovery",
			reason: "Implementation is in progress, but there is not enough verification evidence yet for a final check.",
		};
	}

	return {
		stage: "initial",
		reason: "The executor is still in the early orientation phase.",
	};
}

export function buildExecutorSignals(events: RunToolEvent[]): ExecutorSignals {
	const mutationsCount = events.filter((e) => e.toolName === "edit" || e.toolName === "write").length;
	const verificationCommands = events
		.filter((e): e is RunToolEvent & { command: string } => e.toolName === "bash" && isVerificationCommand(e.command))
		.map((e) => e.command);
	const recentFailures = events
		.filter((e) => e.isError)
		.slice(-3)
		.map((e) => e.summary);

	let phase: ExecutorSignals["phase"] = "exploring";
	if (mutationsCount > 0 && verificationCommands.length > 0) {
		phase = "verifying";
	} else if (mutationsCount > 0) {
		phase = "mutating";
	} else if (recentFailures.length > 0) {
		phase = "stuck";
	}

	return { phase, mutationsCount, verificationCommands, recentFailures };
}

export function shouldNudge(
	events: Pick<RunToolEvent, "toolName" | "command">[],
	advisorCallsThisRun: number,
	advisorEnabled: boolean,
	maxUsesPerRun: number,
): string | null {
	if (!advisorEnabled) return null;
	if (advisorCallsThisRun >= maxUsesPerRun) return null;

	const hasMutation = events.some((e) => e.toolName === "edit" || e.toolName === "write");
	const hasVerification = events.some((e) => e.toolName === "bash" && isVerificationCommand(e.command));

	if (hasMutation && !hasVerification) {
		return "Code changed, tests not run. Consider advisor({stage: 'final-check'})";
	}
	return null;
}
