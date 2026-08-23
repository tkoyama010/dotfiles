/**
 * /exit command — alias for the built-in /quit.
 * pi ships /quit but not /exit; many CLIs use /exit, so register it for muscle memory.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("exit", {
    description: "Exit pi cleanly (alias for /quit)",
    handler: async (_args, ctx) => {
      ctx.shutdown();
    },
  });
}
