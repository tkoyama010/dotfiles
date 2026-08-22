/**
 * pi startup header — official pi.dev logo + version + model.
 *
 * The logo is rasterized from pi.dev's official SVG (logo-auto.svg):
 *   - P shape (with hole) + i dot, rendered as half-block art
 *   - accent color like the website
 * Title/version/model below in gemini-cli-style layout.
 *
 * Auto-discovered from ~/.pi/agent/extensions/. Restart pi to apply.
 */

import { type ExtensionAPI, VERSION } from "@earendil-works/pi-coding-agent";

// Rasterized from pi.dev/logo-auto.svg (viewBox 0 0 800 800).
// P shape + i dot, using half-blocks (▀▄█) for 2x vertical resolution.
const LOGO: string[] = [
	" ▄▄▄▄▄▄▄▄▄▄▄▄     ",
	" ████████████     ",
	" ████▀▀▀▀████     ",
	" ████    ████     ",
	" ████    ████     ",
	" ████████    ████ ",
	" ████████    ████ ",
	" ████▀▀▀▀    ████ ",
	" ████        ████ ",
	" ▀▀▀▀        ▀▀▀▀ ",
];

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setHeader((_tui, theme) => {
			let cachedKey = "";
			let cached: string[] = [];

			return {
				render(_width: number): string[] {
					const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "no model";
					const key = model;
					if (key === cachedKey) return cached;
					cachedKey = key;

					const accent = (s: string) => theme.fg("accent", s);
					const primary = (s: string) => theme.fg("text", s);
					const secondary = (s: string) => theme.fg("muted", s);

					const logo = LOGO.map((l) => accent(l));
					const title = `${primary(theme.bold("pi"))} ${secondary(`v${VERSION}`)}`;
					const sub = `${secondary(model)}`;

					cached = [...logo, "", `  ${title}`, `  ${sub}`];
					return cached;
				},
				invalidate() {
					cachedKey = "";
				},
			};
		});
	});
}
