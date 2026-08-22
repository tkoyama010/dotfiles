import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ponytail: hardcoded skill path — only this user's caveman install. Move into
// settings/skills discovery if reused across machines.
const SKILL_PATH = join(
  homedir(),
  ".pi/agent/git/github.com/JuliusBrussee/caveman/skills/caveman/SKILL.md",
);

let cached: string | undefined;

function skillBody(): string {
  if (cached !== undefined) return cached;
  try {
    const raw = readFileSync(SKILL_PATH, "utf8");
    // strip frontmatter so only instructions enter the system prompt
    cached = raw.replace(/^---[\s\S]*?---\s*/, "");
  } catch {
    cached = "";
  }
  return cached;
}

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, _ctx) => {
    const body = skillBody();
    if (!body) return;
    if (event.systemPrompt.includes("# Caveman (always active)")) return;
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n# Caveman (always active)\n\n" +
        body,
    };
  });
}
