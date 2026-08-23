import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Tell pi at startup that images are readable even on text-only models,
// because pi-vision-handoff proxies image input through a vision model.
// Without this, the read tool's "[Current model does not support images…]"
// note and the model's own self-knowledge make it reluctant to read images.

interface VisionHandoffConfig {
  enabled: boolean;
  visionModel: string | null;
  autoHandoff: boolean;
  handoffModels: string[];
}

const CONFIG_PATH = join(
  homedir(),
  ".pi/agent/extensions/pi-vision-handoff.json",
);

function readConfig(): VisionHandoffConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<VisionHandoffConfig>;
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

function isVisionModel(model: { input?: ("text" | "image")[] } | undefined): boolean {
  return Array.isArray(model?.input) && model.input.includes("image");
}

function isHandoffTarget(
  model: { provider?: string; id?: string; input?: ("text" | "image")[] } | undefined,
  cfg: VisionHandoffConfig,
): boolean {
  if (!model || !model.provider || !model.id) return false;
  const ref = `${model.provider}/${model.id}`;
  if (cfg.handoffModels.includes(ref)) return true;
  if (cfg.autoHandoff && !isVisionModel(model)) return true;
  return false;
}

const NOTE = `# Image reading (pi-vision-handoff active)

This model lacks native image input, but the pi-vision-handoff extension is enabled: when you call the read tool on an image file, a configured vision model (${"{visionModel}"}) describes it and the description is injected as text in the tool result. You CAN read and act on images via the read tool — do not refuse image-reading requests or claim you cannot see images. The "[Current model does not support images…]" note in tool output is stale and is stripped by the extension.`;

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, ctx) => {
    const cfg = readConfig();
    if (!cfg || !cfg.enabled || !cfg.visionModel) return;
    if (!isHandoffTarget(ctx.model, cfg)) return;
    if (event.systemPrompt.includes("# Image reading (pi-vision-handoff active)")) return;
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n" +
        NOTE.replace("{visionModel}", cfg.visionModel),
    };
  });
}
