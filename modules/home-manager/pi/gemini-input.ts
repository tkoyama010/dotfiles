/**
 * Gemini-CLI-style input — borderless gray rounded pill + ">" prompt.
 *
 * Replicates gemini-cli's HalfLinePaddedBox + InputPrompt:
 *  - top row:    ▄ repeated (lower-half block) in input bg → rounded top
 *  - bottom row: ▀ repeated (upper-half block) in input bg → rounded bottom
 *  - content:    solid input bg behind every line
 *  - first line prefixed with accent-colored "> ", later lines indented "  "
 *  - input bg = interpolate(terminalBg, Gray #AFAFAF, 0.24)  (gemini default)
 *
 * Auto-discovered from ~/.pi/agent/extensions/. Reload with /reload.
 */

import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";

const ANSI = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI, "");

// Gemini-cli Default dark: Gray=#AFAFAF, input bg opacity 0.24 over terminal bg.
// Brightened to match common dark terminals (#1e1e1e → ~#414141).
const BG = "66;66;72"; // #424248
const FG_BG = `\x1b[38;2;${BG}m`; // ▄/▀ block chars
const BG_BG = `\x1b[48;2;${BG}m`; // content background
const R = "\x1b[0m";
const PROMPT_W = 3; // " > " width

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		class GeminiEditor extends CustomEditor {
			render(width: number): string[] {
				if (width < 4) return super.render(width);

				// Render 2 cols narrower so "> " prefix fits without overflow.
				const inner = super.render(width - PROMPT_W);
				if (inner.length < 2) return inner;

				// Locate bottom border: last ─-line (autocomplete renders after it).
				let bottom = -1;
				for (let i = 1; i < inner.length; i++) {
					if (stripAnsi(inner[i]!).startsWith("─")) bottom = i;
				}
				if (bottom === -1) bottom = inner.length - 1;

				// Use \x1b[39m (reset fg only) not \x1b[0m (reset all) so the gray bg survives.
				const purple = (s: string) => `\x1b[38;2;215;175;255m${s}\x1b[39m`; // #D7AFFF gemini-cli AccentPurple

				// Top: full-width ▄ row (rounded top edge).
				inner[0] = `${FG_BG}${"▄".repeat(width)}${R}`;
				// Bottom: full-width ▀ row (rounded bottom edge).
				inner[bottom] = `${FG_BG}${"▀".repeat(width)}${R}`;

				// Content rows: solid bg fill, "> " on first line, "  " indent after.
				for (let i = 1; i < bottom; i++) {
					const line = inner[i]!;
					// Cursor uses inverse video (\x1b[7m) which swaps bg to terminal default,
					// breaking the uniform gray. Swap inverse → underline so bg stays gray.
					const reasserted = line
						.replace(/\x1b\[7m/g, "\x1b[4m")
						.replace(/\x1b\[0m/g, `${R}${BG_BG}`);
					const prefix = i === 1 ? ` ${purple(">")} ` : " ".repeat(PROMPT_W);
					const used = PROMPT_W + visibleWidth(line);
					const pad = " ".repeat(Math.max(0, width - used));
					inner[i] = `${BG_BG}${prefix}${reasserted}${pad}${R}`;
				}

				return inner;
			}
		}

		ctx.ui.setEditorComponent((tui, theme, kb) => new GeminiEditor(tui, theme, kb));
	});
}
