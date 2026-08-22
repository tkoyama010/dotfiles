/**
 * Gemini-CLI-style startup header.
 *
 * Replaces pi's built-in header with gemini-cli's AppHeader look:
 *  - spark icon (▝▜▄) in accent color
 *  - "Gemini CLI vX.X.X" bold + version
 *  - model line below
 *
 * Auto-discovered from ~/.pi/agent/extensions/. Reload with /reload.
 */

import { type ExtensionAPI, VERSION } from "@earendil-works/pi-coding-agent";

// gemini-cli DEFAULT_ICON (spark), built from half-blocks.
const ICON = "▝▜▄\n  ▝▜▄\n ▗▟▀ \n▝▀    ";

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setHeader((_tui, theme) => {
			let cachedKey = "";
			let cached: string[] = [];

			return {
				render(width: number): string[] {
					const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "no model";
					const key = `${model}|${width}`;
					if (key === cachedKey) return cached;
					cachedKey = key;

					const accent = (s: string) => theme.fg("accent", s);
					const primary = (s: string) => theme.fg("text", s);
					const secondary = (s: string) => theme.fg("muted", s);

					// Icon (4 lines) side by side with title block.
					const iconLines = ICON.split("\n");
					const title = `${primary(theme.bold("Gemini CLI"))} ${secondary(`v${VERSION}`)}`;
					const sub = `${secondary(model)}`;

					// Place title on row 2 (aligned with icon's 2nd line), sub on row 3.
					const rows: string[] = ["", "", "", "", ""];
					rows[1] = `${accent(iconLines[1]!)}    ${title}`;
					rows[2] = `${accent(iconLines[2]!)}    ${sub}`;
					rows[0] = `${accent(iconLines[0]!)}`;
					rows[3] = `${accent(iconLines[3]!)}`;
					cached = rows;
					return cached;
				},
				invalidate() {
					cachedKey = "";
				},
			};
		});
	});
}
