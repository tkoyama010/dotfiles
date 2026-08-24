import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Tell pi at startup that images are readable even on text-only models,
// because pi-vision-handoff proxies image input through a vision model.
// Without this, the read tool's "[Current model does not support images…]"
// note and the model's own self-knowledge make it reluctant to read images.
//
// Off by default. Toggle with /vision-handoff-aware on|off|status.

interface AwareConfig {
	enabled: boolean;
}

const CONFIG_PATH = join(
	homedir(),
	".pi/agent/extensions/vision-handoff-aware.json",
);

const HANDOFF_CONFIG_PATH = join(
	homedir(),
	".pi/agent/extensions/pi-vision-handoff.json",
);

interface VisionHandoffConfig {
	enabled: boolean;
	visionModel: string | null;
	autoHandoff: boolean;
	handoffModels: string[];
}

function readAwareConfig(): AwareConfig {
	if (!existsSync(CONFIG_PATH)) return { enabled: false };
	try {
		const raw = JSON.parse(
			readFileSync(CONFIG_PATH, "utf8"),
		) as Partial<AwareConfig>;
		return { enabled: raw.enabled ?? false };
	} catch {
		return { enabled: false };
	}
}

function writeAwareConfig(cfg: AwareConfig): void {
	writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

function readHandoffConfig(): VisionHandoffConfig | null {
	if (!existsSync(HANDOFF_CONFIG_PATH)) return null;
	try {
		const raw = JSON.parse(
			readFileSync(HANDOFF_CONFIG_PATH, "utf8"),
		) as Partial<VisionHandoffConfig>;
		return {
			enabled: raw.enabled ?? true,
			visionModel: raw.visionModel ?? null,
			autoHandoff: raw.autoHandoff ?? true,
			handoffModels: raw.handoffModels ?? [],
		};
	} catch {
		return null;
	}
}

function isVisionModel(
	model: { input?: ("text" | "image")[] } | undefined,
): boolean {
	return Array.isArray(model?.input) && model.input.includes("image");
}

function isHandoffTarget(
	model:
		| { provider?: string; id?: string; input?: ("text" | "image")[] }
		| undefined,
	cfg: VisionHandoffConfig,
): boolean {
	if (!(model && model.provider && model.id)) return false;
	const ref = `${model.provider}/${model.id}`;
	if (cfg.handoffModels.includes(ref)) return true;
	if (cfg.autoHandoff && !isVisionModel(model)) return true;
	return false;
}

const NOTE = `# Image reading (pi-vision-handoff active)

This model lacks native image input, but the pi-vision-handoff extension is enabled: when you call the read tool on an image file, a configured vision model (${"{visionModel}"}) describes it and the description is injected as text in the tool result. You CAN read and act on images via the read tool — do not refuse image-reading requests or claim you cannot see images. The "[Current model does not support images…]" note in tool output is stale and is stripped by the extension.`;

const MARKER = "# Image reading (pi-vision-handoff active)";

export default function (pi: ExtensionAPI) {
	let aware = readAwareConfig();

	pi.on("before_agent_start", async (event, ctx) => {
		if (!aware.enabled) return;
		const cfg = readHandoffConfig();
		if (!(cfg && cfg.enabled && cfg.visionModel)) return;
		if (!isHandoffTarget(ctx.model, cfg)) return;
		if (event.systemPrompt.includes(MARKER)) return;
		return {
			systemPrompt:
				event.systemPrompt +
				"\n\n" +
				NOTE.replace("{visionModel}", cfg.visionModel),
		};
	});

	pi.registerCommand("vision-handoff-aware", {
		description:
			"Toggle the vision-handoff-aware system-prompt note (off by default)",
		getArgumentCompletions(prefix: string) {
			const subs = ["on", "off", "status"];
			const matches = subs.filter((s) => s.startsWith(prefix));
			return matches.length > 0
				? matches.map((s) => ({ value: s, label: s }))
				: null;
		},
		handler: async (args, ctx) => {
			const arg = args.trim().toLowerCase();
			if (arg === "on") {
				aware = { enabled: true };
				writeAwareConfig(aware);
				ctx.ui.notify("vision-handoff-aware: on", "info");
				return;
			}
			if (arg === "off") {
				aware = { enabled: false };
				writeAwareConfig(aware);
				ctx.ui.notify("vision-handoff-aware: off", "info");
				return;
			}
			if (arg === "status" || arg === "") {
				ctx.ui.notify(
					`vision-handoff-aware: ${aware.enabled ? "on" : "off"}`,
					"info",
				);
				return;
			}
			ctx.ui.notify("Usage: /vision-handoff-aware <on|off|status>", "warning");
		},
	});
}
