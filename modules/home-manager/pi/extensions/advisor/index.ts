/**
 * Advisor Extension
 *
 * Registers an LLM-callable tool named `advisor` that allows the executor model
 * to consult a stronger "advisor" model for strategic guidance on complex decisions.
 *
 * Design follows the advisor tool pattern: the executor keeps doing the work and
 * only calls the advisor when it needs strategic guidance — not for syntax-level
 * questions or routine implementation steps.
 *
 * The advisor:
 * - Sees a curated transcript plus the executor's current system prompt
 * - Returns strategic guidance (plan, correction, or stop signal)
 * - Cannot call tools — only provides text advice
 * - Is invoked at the executor's discretion
 *
 * Commands:
 * - /advisor on [provider/model] — Enable advisor tool (persists to config)
 * - /advisor off                 — Disable advisor tool (persists to config)
 * - /advisor config [key=value]  — Show/edit advisor configuration
 * - /advisor                     — Show status or manually trigger consultation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { completeSimple, type Message, type TextContent, type ThinkingContent, type ThinkingLevel } from "@earendil-works/pi-ai";
import { getAgentDir, keyHint, type ExtensionAPI, type ToolRenderResultOptions } from "@earendil-works/pi-coding-agent";
import { buildAdvisorMessages } from "./src/advisor-messages.ts";
import {
	buildExecutorSignals,
	detectStage,
	shouldNudge,
	summarizeToolResult,
	type AdvisorStage,
	type AdvisorStageInfo,
	type RunToolEvent,
} from "./src/advisor-signals.ts";
import { Container, Spacer, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

interface AdvisorConfig {
	enabled: boolean;
	provider: string;
	model: string;
	maxUsesPerRun: number;
	maxTokens: number;
	reasoning: ThinkingLevel;
	maxContextMessages: number;
}

interface AdvisorUsage {
	inputTokens: number;
	outputTokens: number;
	model: string;
}

interface AdvisorDetails {
	usage?: AdvisorUsage;
	callNumber: number;
	stage?: AdvisorStage;
	error?: string;
	message?: string;
}

const DEFAULT_CONFIG: AdvisorConfig = {
	enabled: false,
	provider: "anthropic",
	model: "claude-fable-5",
	maxUsesPerRun: 3,
	// Adaptive-thinking models count thinking tokens against the output cap;
	// 8k left too little room for the actual advice at reasoning=high.
	maxTokens: 16384,
	reasoning: "high",
	maxContextMessages: 18,
};

const MAX_SYSTEM_PROMPT_CHARS = 12000;
const RECENT_TOOL_SUMMARY_COUNT = 8;

const VALID_REASONING_LEVELS: ThinkingLevel[] = ["minimal", "low", "medium", "high", "xhigh"];

const ADVISOR_SYSTEM_PROMPT = `You are a senior engineering advisor. The executor model is doing the work; you observe the transcript and provide strategic guidance when consulted.

Your role:
- You see a curated subset of the executor's context: a truncated transcript, tool activity summaries (not full outputs), and its system prompt
- If the evidence is too thin to judge, say so — never fill gaps with guesses
- You cannot call tools or produce user-facing output
- Your advice directly shapes the executor's next actions

What you provide depends on the stage:
1. PLAN — when the executor is still exploring: shortest viable approach, main risk to avoid, first concrete steps (here the verdict judges the exploration direction so far)
2. CORRECTION — when trajectory is weak: what to stop doing, why, and the corrected path
3. VERIFICATION — when implementation appears done: missing evidence, unmet requirements, or explicit sign-off

Output format:
- Lead with a one-sentence verdict: "On track", "Course-correct", or "Not done yet"
- Follow with numbered action items (max 5) the executor should take next
- If the transcript lacks the evidence to settle a point, make your FIRST action item the exact command or file read that would settle it (e.g. "run npm test and re-consult"), instead of guessing
- Reference specific files, commands, or error signals from the transcript
- If you disagree with evidence the executor gathered, state the conflict explicitly — don't silently override

Keep it short. The executor will read your advice and immediately act on it.`;

function configPath(): string {
	return join(getAgentDir(), "advisor.json");
}

function loadConfig(): AdvisorConfig {
	const path = configPath();
	if (!existsSync(path)) return { ...DEFAULT_CONFIG };
	try {
		const raw = JSON.parse(readFileSync(path, "utf-8"));
		return {
			enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_CONFIG.enabled,
			provider: typeof raw.provider === "string" ? raw.provider : DEFAULT_CONFIG.provider,
			model: typeof raw.model === "string" ? raw.model : DEFAULT_CONFIG.model,
			maxUsesPerRun: typeof raw.maxUsesPerRun === "number" ? raw.maxUsesPerRun : DEFAULT_CONFIG.maxUsesPerRun,
			maxTokens: typeof raw.maxTokens === "number" ? raw.maxTokens : DEFAULT_CONFIG.maxTokens,
			reasoning: VALID_REASONING_LEVELS.includes(raw.reasoning) ? raw.reasoning : DEFAULT_CONFIG.reasoning,
			maxContextMessages: typeof raw.maxContextMessages === "number" ? raw.maxContextMessages : DEFAULT_CONFIG.maxContextMessages,
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

function saveConfig(config: AdvisorConfig): void {
	const path = configPath();
	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
}

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	return `${(count / 1000000).toFixed(1)}M`;
}

const STAGE_LABELS: Record<AdvisorStage, string> = {
	"initial": "initial",
	"recovery": "recovery",
	"final-check": "final check",
};

function stageLabel(stage: AdvisorStage): string {
	return STAGE_LABELS[stage];
}

const STAGE_DIRECTIVES: Record<AdvisorStage, string> = {
	"initial": "Executor is still exploring. Provide: (1) the shortest viable approach, (2) the main risk to avoid, (3) 2-3 concrete first steps.",
	"recovery": "Executor hit friction or is off-track. Provide: (1) what went wrong, (2) what to stop doing, (3) corrected path forward.",
	"final-check": "Implementation appears done. Verify: (1) re-read the original user request at the top of the transcript — are all of ITS requirements met, including explicit constraints? (2) is verification evidence sufficient? (3) any missing edge cases? Give explicit sign-off or list what's missing.",
};

function stageDirective(stage: AdvisorStage): string {
	return STAGE_DIRECTIVES[stage];
}

function squeezeWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

function buildActiveToolsSummary(pi: ExtensionAPI): string {
	const activeToolNames = new Set(pi.getActiveTools().filter((name) => name !== "advisor"));
	const activeTools = pi
		.getAllTools()
		.filter((tool) => activeToolNames.has(tool.name))
		.sort((a, b) => a.name.localeCompare(b.name));

	if (activeTools.length === 0) return "- No active tools recorded";

	return activeTools
		.map((tool) => `- ${tool.name}: ${squeezeWhitespace(tool.description).slice(0, 160)}`)
		.join("\n");
}

function buildRecentToolActivity(events: RunToolEvent[]): string {
	if (events.length === 0) return "";
	return events
		.slice(-RECENT_TOOL_SUMMARY_COUNT)
		.map((event) => `- ${event.summary}`)
		.join("\n");
}

// Stage specifics live in the final context message next to the freshest
// evidence (see buildAdvisorMessages); the system prompt stays stage-agnostic.
function buildAdvisorPrompt(executorSystemPrompt: string, activeToolsSummary: string): string {
	const trimmedSystemPrompt = executorSystemPrompt.trim();
	const boundedSystemPrompt = trimmedSystemPrompt.length > MAX_SYSTEM_PROMPT_CHARS
		? `${trimmedSystemPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS).trimEnd()}\n[executor system prompt truncated for advisor context]`
		: trimmedSystemPrompt;

	return `${ADVISOR_SYSTEM_PROMPT}

Executor system prompt:
<<<SYSTEM_PROMPT
${boundedSystemPrompt}
SYSTEM_PROMPT>>>

Active tools available to the executor:
${activeToolsSummary}`;
}

function buildPreview(text: string, lines: number): { preview: string; truncated: boolean } {
	const split = text.split("\n");
	if (split.length <= lines) return { preview: text, truncated: false };
	return { preview: `${split.slice(0, lines).join("\n")}\n…`, truncated: true };
}

export default function advisorExtension(pi: ExtensionAPI) {
	let config = loadConfig();
	let usesThisRun = 0;
	let runToolEvents: RunToolEvent[] = [];

	pi.on("agent_start", async (_, ctx) => {
		usesThisRun = 0;
		runToolEvents = [];
		ctx.ui.setStatus("advisor-nudge", undefined);
	});

	// tool_result carries the tool input and typed details directly, so no
	// tool_execution_start/end bookkeeping is needed.
	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName === "advisor") return;
		runToolEvents.push(summarizeToolResult(event));

		const hint = shouldNudge(runToolEvents, usesThisRun, config.enabled, config.maxUsesPerRun);
		ctx.ui.setStatus("advisor-nudge", hint ?? undefined);
	});

	pi.on("session_start", async () => {
		config = loadConfig();
		updateToolRegistration();
	});

	function updateToolRegistration() {
		const activeTools = pi.getActiveTools();
		if (config.enabled) {
			if (!activeTools.includes("advisor")) {
				pi.setActiveTools([...activeTools, "advisor"]);
			}
			return;
		}
		if (activeTools.includes("advisor")) {
			pi.setActiveTools(activeTools.filter((tool) => tool !== "advisor"));
		}
	}

	pi.registerTool({
		name: "advisor",
		label: "Consult advisor",
		description: `Consult a stronger model for strategic guidance. Returns a verdict (On track / Course-correct / Not done yet) plus numbered action items.
The advisor sees the conversation transcript, your system prompt, and recent tool activity. It cannot call tools.`,
		promptSnippet: "advisor({ stage? }): consult stronger model for strategic guidance → verdict + action items",
		promptGuidelines: [
			"Call advisor({ stage: 'initial' }) for non-trivial tasks after 2-3 reads, before committing to an approach",
			"Call advisor({ stage: 'recovery' }) when stuck, confused, or after a failed attempt",
			"Call advisor({ stage: 'final-check' }) after implementation + verification, before declaring complete",
			"Call advisor() with no args to auto-detect the stage",
			"Do not call advisor for syntax questions, API lookups, routine steps, tasks completable in <5 tool calls, or when your current plan is working",
			"You remain executor: advisor only advises. Execute returned action items unless evidence contradicts — then state the conflict explicitly instead of silently ignoring",
		],
		parameters: Type.Object({
			stage: Type.Optional(Type.Union([Type.Literal("initial"), Type.Literal("recovery"), Type.Literal("final-check")])),
		}),

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			config = loadConfig();
			ctx.ui.setStatus("advisor-nudge", undefined);

			if (usesThisRun >= config.maxUsesPerRun) {
				return {
					content: [{ type: "text", text: `Advisor usage limit reached (${config.maxUsesPerRun} per run). Continue without advisor guidance.` }],
					details: { error: "max_uses_exceeded", callNumber: usesThisRun } as AdvisorDetails,
				};
			}

			const model = ctx.modelRegistry.find(config.provider, config.model);
			if (!model) {
				return {
					content: [{ type: "text", text: `Advisor model ${config.provider}/${config.model} not found. Continue without advice.` }],
					details: { error: "model_not_found", callNumber: usesThisRun } as AdvisorDetails,
				};
			}

			const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
			if (!auth.ok || !auth.apiKey) {
				const errorMsg = auth.ok ? "No API key" : auth.error;
				return {
					content: [{ type: "text", text: `${errorMsg} for advisor model ${config.provider}/${config.model}. Continue without advice.` }],
					details: { error: "no_api_key", callNumber: usesThisRun } as AdvisorDetails,
				};
			}

			const stageInfo: AdvisorStageInfo = params.stage
				? { stage: params.stage, reason: "Executor explicitly signaled this stage." }
				: detectStage(runToolEvents, usesThisRun + 1);
			const recentToolActivity = buildRecentToolActivity(runToolEvents);
			const branch = ctx.sessionManager.getBranch();
			const signals = buildExecutorSignals(runToolEvents);
			const advisorMessages = buildAdvisorMessages(
				branch,
				{ ...stageInfo, directive: stageDirective(stageInfo.stage) },
				recentToolActivity,
				config.maxContextMessages,
				signals,
			);
			if (advisorMessages.length === 0) {
				return {
					content: [{ type: "text", text: "No conversation context available for advisor. Continue without advice." }],
					details: { error: "no_context", callNumber: usesThisRun, stage: stageInfo.stage } as AdvisorDetails,
				};
			}

			// Only count uses once all preconditions passed and a real model call is about to happen.
			usesThisRun++;

			const executorSystemPrompt = ctx.getSystemPrompt();
			const advisorPrompt = buildAdvisorPrompt(executorSystemPrompt, buildActiveToolsSummary(pi));

			try {
				const response = await completeSimple(
					model,
					{
						systemPrompt: advisorPrompt,
						// Safe cast: assistant entries are spread from real AssistantMessages
						// (text-only content), synthetic entries are well-formed UserMessages.
						messages: advisorMessages as Message[],
					},
					{
						apiKey: auth.apiKey,
						headers: auth.headers,
						maxTokens: config.maxTokens,
						signal,
						reasoning: config.reasoning,
						// Session-affine cache routing: repeated consultations replay
						// mostly the same prefix, so let the provider cache it.
						sessionId: ctx.sessionManager.getSessionId(),
					},
				);

				const textBlocks = response.content.filter((b): b is TextContent => b.type === "text");
				const thinkingBlocks = response.content.filter((b): b is ThinkingContent => b.type === "thinking");
				const adviceText = textBlocks.map((b) => b.text).join("\n").trim();
				const thinkingText = thinkingBlocks.map((b) => b.thinking).join("\n").trim();

				// If no text but thinking exists, use thinking as fallback
				const finalText = adviceText || (thinkingText ? `(thinking)\n${thinkingText}` : "");

				const usage: AdvisorUsage = {
					inputTokens: response.usage?.input ?? 0,
					outputTokens: response.usage?.output ?? 0,
					model: config.model,
				};

				// Detect silent failures: empty content with no error thrown
				if (!finalText && !response.errorMessage) {
					return {
						content: [{ type: "text", text: `(Advisor returned empty response — model: ${config.provider}/${config.model}, stop: ${response.stopReason}). Check that the model supports this API format.` }],
						details: { usage, callNumber: usesThisRun, stage: stageInfo.stage, error: "empty_response" } as AdvisorDetails,
					};
				}

				pi.appendEntry("advisor-usage", usage);

				return {
					content: [{ type: "text", text: finalText || response.errorMessage || "(Advisor returned empty response)" }],
					details: { usage, callNumber: usesThisRun, stage: stageInfo.stage, error: response.errorMessage ? "model_error" : undefined } as AdvisorDetails,
				};
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `Advisor call failed: ${msg}. Continue without advice.` }],
					details: { error: "execution_failed", message: msg, callNumber: usesThisRun, stage: stageInfo.stage } as AdvisorDetails,
				};
			}
		},

		renderCall() {
			return new Container();
		},

		renderResult(result, options: ToolRenderResultOptions, theme, _context) {
			const details = result.details as AdvisorDetails | undefined;
			const text = result.content[0]?.type === "text" ? result.content[0].text : "(no advice)";

			if (options.isPartial) {
				return new Text(theme.fg("muted", "Advisor…"), 0, 0);
			}

			if (details?.error) {
				return new Text(theme.fg("error", "Advisor unavailable: ") + theme.fg("dim", text), 0, 0);
			}

			const container = new Container();
			let header = theme.fg("toolTitle", theme.bold("Advisor"));
			if (details?.stage) header += " " + theme.fg("muted", stageLabel(details.stage));
			if (details?.callNumber) header += theme.fg("dim", ` #${details.callNumber}/${config.maxUsesPerRun}`);
			container.addChild(new Text(header, 0, 0));
			container.addChild(new Spacer(1));

			if (options.expanded) {
				container.addChild(new Text(text, 0, 0));
			} else {
				const preview = buildPreview(text, 6);
				container.addChild(new Text(preview.preview, 0, 0));
				if (preview.truncated) {
					container.addChild(new Spacer(1));
					container.addChild(new Text(theme.fg("muted", keyHint("app.tools.expand", "to expand")), 0, 0));
				}
			}

			if (details?.usage) {
				container.addChild(new Spacer(1));
				container.addChild(
					new Text(
						theme.fg("dim", `↑${formatTokens(details.usage.inputTokens)} ↓${formatTokens(details.usage.outputTokens)} ${details.usage.model}`),
						0,
						0,
					),
				);
			}

			return container;
		},
	});

	pi.registerCommand("advisor", {
		description: "Manage advisor tool: on, off, config, ask",
		getArgumentCompletions: (prefix) => {
			const subcommands = ["on", "off", "config", "ask"];
			const trimmed = prefix.trim();
			if (!trimmed.includes(" ")) {
				const matches = subcommands.filter((s) => s.startsWith(trimmed));
				return matches.length > 0 ? matches.map((s) => ({ value: s, label: s })) : null;
			}

			const parts = trimmed.split(/\s+/);
			if (parts[0] === "config" && parts.length <= 2) {
				const keys = ["provider=", "model=", "maxUsesPerRun=", "maxTokens=", "reasoning=", "maxContextMessages="];
				const lastPart = parts[parts.length - 1] ?? "";
				const matches = keys.filter((k) => k.startsWith(lastPart));
				return matches.length > 0 ? matches.map((k) => ({ value: `config ${k}`, label: k })) : null;
			}

			return null;
		},
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/);
			const subcommand = parts[0]?.toLowerCase() || "";
			const rest = parts.slice(1).join(" ");

			switch (subcommand) {
				case "on": {
					let provider = config.provider;
					let modelId = config.model;
					if (rest) {
						// Split on the first slash only: model IDs may contain slashes (e.g. OpenRouter).
						const slash = rest.indexOf("/");
						if (slash <= 0 || slash === rest.length - 1) {
							ctx.ui.notify("Invalid format. Use: /advisor on provider/model (e.g., anthropic/claude-fable-5)", "warning");
							return;
						}
						provider = rest.slice(0, slash);
						modelId = rest.slice(slash + 1);
					}

					const model = ctx.modelRegistry.find(provider, modelId);
					if (!model) {
						ctx.ui.notify(`Model ${provider}/${modelId} not found`, "error");
						return;
					}

					config.provider = provider;
					config.model = modelId;
					config.enabled = true;
					saveConfig(config);
					updateToolRegistration();
					ctx.ui.notify(`Advisor enabled: ${config.provider}/${config.model}`, "info");
					break;
				}

				case "off": {
					config.enabled = false;
					saveConfig(config);
					updateToolRegistration();
					ctx.ui.notify("Advisor disabled", "info");
					break;
				}

				case "config": {
					if (!rest) {
						const status = config.enabled ? ctx.ui.theme.fg("success", "enabled") : ctx.ui.theme.fg("dim", "disabled");
						const lines = [
							"Advisor Configuration",
							"",
							`  Status:       ${status}`,
							`  Provider:     ${config.provider}`,
							`  Model:        ${config.model}`,
							`  Max uses/run: ${config.maxUsesPerRun}`,
							`  Max tokens:   ${config.maxTokens}`,
							`  Reasoning:    ${config.reasoning}`,
							`  Context msgs: ${config.maxContextMessages}`,
							"",
							"Usage:",
							"  /advisor on [provider/model]  Enable advisor",
							"  /advisor off                  Disable advisor",
							"  /advisor config key=value     Set config value",
							"  /advisor ask                  Trigger consultation",
							"",
							"Config keys: provider, model, maxUsesPerRun, maxTokens, reasoning, maxContextMessages",
							`Reasoning levels: ${VALID_REASONING_LEVELS.join(", ")}`,
						];
						ctx.ui.notify(lines.join("\n"), "info");
						return;
					}

					const match = rest.match(/^(\w+)=(.+)$/);
					if (!match) {
						ctx.ui.notify("Invalid format. Use: /advisor config key=value", "warning");
						return;
					}

					const [, key, value] = match;
					switch (key) {
						case "provider":
							config.provider = value;
							break;
						case "model":
							config.model = value;
							break;
						case "maxUsesPerRun": {
							const num = Number.parseInt(value, 10);
							if (Number.isNaN(num) || num < 1) {
								ctx.ui.notify("maxUsesPerRun must be a positive integer", "warning");
								return;
							}
							config.maxUsesPerRun = num;
							break;
						}
						case "maxTokens": {
							const num = Number.parseInt(value, 10);
							if (Number.isNaN(num) || num < 100) {
								ctx.ui.notify("maxTokens must be at least 100", "warning");
								return;
							}
							config.maxTokens = num;
							break;
						}
						case "reasoning": {
							if (!VALID_REASONING_LEVELS.includes(value as ThinkingLevel)) {
								ctx.ui.notify("reasoning must be one of: minimal, low, medium, high, xhigh", "warning");
								return;
							}
							config.reasoning = value as ThinkingLevel;
							break;
						}
						case "maxContextMessages": {
							const num = Number.parseInt(value, 10);
							if (Number.isNaN(num) || num < 4) {
								ctx.ui.notify("maxContextMessages must be at least 4", "warning");
								return;
							}
							config.maxContextMessages = num;
							break;
						}
						default:
							ctx.ui.notify("Unknown config key. Valid keys: provider, model, maxUsesPerRun, maxTokens, reasoning, maxContextMessages", "warning");
							return;
					}

					saveConfig(config);
					ctx.ui.notify(`Set ${key}=${value}`, "info");
					break;
				}

				case "ask": {
					if (!config.enabled) {
						ctx.ui.notify("Advisor is disabled. Use /advisor on to enable.", "warning");
						return;
					}
					const prompt = "Consult the advisor now using the current stage and recent evidence before proceeding.";
					if (ctx.isIdle()) {
						pi.sendUserMessage(prompt);
					} else {
						pi.sendUserMessage(prompt, { deliverAs: "steer" });
					}
					break;
				}

				default: {
					const status = config.enabled ? ctx.ui.theme.fg("success", "enabled") : ctx.ui.theme.fg("dim", "disabled");
					const lines = [
						`Advisor: ${status}`,
						`Model:     ${config.provider}/${config.model}`,
						`Reasoning: ${config.reasoning}`,
						"",
						"Commands:",
						"  /advisor on [provider/model]  Enable advisor",
						"  /advisor off                  Disable advisor",
						"  /advisor config               Show full configuration",
						"  /advisor ask                  Trigger consultation",
					];
					ctx.ui.notify(lines.join("\n"), "info");
				}
			}
		},
	});
}
