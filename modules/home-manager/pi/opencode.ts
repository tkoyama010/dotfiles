/**
 * opencode-style TUI extension for pi.
 *
 * Replicates opencode's screen composition:
 *  - Minimal header (opencode has no big logo header)
 *  - opencode-style footer: cwd on the left, model + token usage on the right
 *  - opencode-style working indicator (braille spinner in the primary color)
 *  - Compact tool rendering for bash/read/write/edit matching opencode's
 *    inline, low-chrome tool rows
 *
 * The color palette itself is provided by the companion `opencode.json` theme.
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type {
	BashToolDetails,
	EditToolDetails,
	ExtensionAPI,
	ReadToolDetails,
} from "@earendil-works/pi-coding-agent";
import {
	createBashTool,
	createEditTool,
	createReadTool,
	createWriteTool,
} from "@earendil-works/pi-coding-agent";
import { Text, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { homedir } from "node:os";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function shortenPath(p: string): string {
	const home = homedir();
	if (p.startsWith(home)) return `~${p.slice(home.length)}`;
	return p;
}

function fmtTokens(n: number): string {
	if (n < 1000) return `${n}`;
	if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
	return `${(n / 1_000_000).toFixed(2)}m`;
}

export default function (pi: ExtensionAPI) {
	// ------------------------------------------------------------------------
	// Header: opencode has no large logo header, so render a minimal one-liner.
	// ------------------------------------------------------------------------
	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;

		ctx.ui.setHeader((_tui, theme) => ({
			invalidate() {},
			render(_width: number): string[] {
				return [theme.fg("accent", theme.bold("opencode"))];
			},
		}));

		// opencode-style braille spinner in the primary (peach) color.
		ctx.ui.setWorkingIndicator({
			frames: SPINNER_FRAMES.map((f) => ctx.ui.theme.fg("toolTitle", f)),
			intervalMs: 80,
		});
	});

	// ------------------------------------------------------------------------
	// Footer: opencode shows cwd on the left and status info on the right.
	// pi doesn't expose LSP/MCP counts, so we show model + token usage instead.
	// ------------------------------------------------------------------------
	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;

		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsub = footerData.onBranchChange(() => tui.requestRender());
			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					let input = 0;
					let output = 0;
					let cost = 0;
					for (const e of ctx.sessionManager.getBranch()) {
						if (e.type === "message" && e.message.role === "assistant") {
							const m = e.message as AssistantMessage;
							input += m.usage.input;
							output += m.usage.output;
							cost += m.usage.cost.total;
						}
					}

					const cwd = shortenPath(ctx.cwd);
					const left = theme.fg("muted", cwd);

					const branch = footerData.getGitBranch();
					const model = ctx.model?.id ?? "no-model";
					const rightParts = [
						`${theme.fg("text", model)}`,
						branch ? theme.fg("muted", `(${branch})`) : "",
						theme.fg("muted", `↑${fmtTokens(input)} ↓${fmtTokens(output)}`),
						cost > 0 ? theme.fg("muted", `$${cost.toFixed(3)}`) : "",
					].filter(Boolean);
					const right = rightParts.join(" ");

					const pad = " ".repeat(
						Math.max(1, width - visibleWidth(left) - visibleWidth(right)),
					);
					return [truncateToWidth(left + pad + right, width)];
				},
			};
		});
	});

	// ------------------------------------------------------------------------
	// Tool rendering: compact, opencode-style rows for the built-in tools.
	// ------------------------------------------------------------------------
	const cwd = process.cwd();
	const originalRead = createReadTool(cwd);
	const originalBash = createBashTool(cwd);
	const originalEdit = createEditTool(cwd);
	const originalWrite = createWriteTool(cwd);

	// read
	pi.registerTool({
		name: "read",
		label: "read",
		description: originalRead.description,
		parameters: originalRead.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const t = createReadTool(ctx.cwd);
			return t.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("read "));
			text += theme.fg("accent", shortenPath(args.path));
			if (args.offset || args.limit) {
				const parts: string[] = [];
				if (args.offset) parts.push(`offset=${args.offset}`);
				if (args.limit) parts.push(`limit=${args.limit}`);
				text += theme.fg("dim", ` (${parts.join(", ")})`);
			}
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded, isPartial }, theme, _context) {
			if (isPartial) return new Text(theme.fg("warning", "reading…"), 0, 0);
			const details = result.details as ReadToolDetails | undefined;
			const content = result.content[0];
			if (content?.type === "image") return new Text(theme.fg("success", "image loaded"), 0, 0);
			if (content?.type !== "text") return new Text(theme.fg("error", "no content"), 0, 0);
			const lineCount = content.text.split("\n").length;
			let text = theme.fg("success", `${lineCount} lines`);
			if (details?.truncation?.truncated)
				text += theme.fg("warning", ` (truncated from ${details.truncation.totalLines})`);
			if (expanded) {
				for (const line of content.text.split("\n").slice(0, 15))
					text += `\n${theme.fg("dim", line)}`;
				if (lineCount > 15)
					text += `\n${theme.fg("muted", `… ${lineCount - 15} more lines`)}`;
			}
			return new Text(text, 0, 0);
		},
	});

	// bash
	pi.registerTool({
		name: "bash",
		label: "bash",
		description: originalBash.description,
		parameters: originalBash.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const t = createBashTool(ctx.cwd);
			return t.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("$ "));
			const cmd =
				args.command.length > 80 ? `${args.command.slice(0, 77)}…` : args.command;
			text += theme.fg("text", cmd);
			if (args.timeout) text += theme.fg("dim", ` (timeout: ${args.timeout}s)`);
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded, isPartial }, theme, _context) {
			if (isPartial) return new Text(theme.fg("warning", "running…"), 0, 0);
			const details = result.details as BashToolDetails | undefined;
			const content = result.content[0];
			const output = content?.type === "text" ? content.text : "";
			const exitMatch = output.match(/exit code: (\d+)/);
			const exitCode = exitMatch ? parseInt(exitMatch[1]!, 10) : null;
			const lineCount = output.split("\n").filter((l) => l.trim()).length;
			let text = "";
			if (exitCode === 0 || exitCode === null) text += theme.fg("success", "done");
			else text += theme.fg("error", `exit ${exitCode}`);
			text += theme.fg("dim", ` (${lineCount} lines)`);
			if (details?.truncation?.truncated) text += theme.fg("warning", " [truncated]");
			if (expanded) {
				const lines = output.split("\n").slice(0, 20);
				for (const line of lines) text += `\n${theme.fg("dim", line)}`;
				if (output.split("\n").length > 20)
					text += `\n${theme.fg("muted", "… more output")}`;
			}
			return new Text(text, 0, 0);
		},
	});

	// edit
	pi.registerTool({
		name: "edit",
		label: "edit",
		description: originalEdit.description,
		parameters: originalEdit.parameters,
		renderShell: "self",
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const t = createEditTool(ctx.cwd);
			return t.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("edit "));
			text += theme.fg("accent", shortenPath(args.path));
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded, isPartial }, theme, _context) {
			if (isPartial) return new Text(theme.fg("warning", "editing…"), 0, 0);
			const details = result.details as EditToolDetails | undefined;
			const content = result.content[0];
			if (content?.type === "text" && content.text.startsWith("Error"))
				return new Text(theme.fg("error", content.text.split("\n")[0]!), 0, 0);
			if (!details?.diff) return new Text(theme.fg("success", "applied"), 0, 0);
			const diffLines = details.diff.split("\n");
			let additions = 0;
			let removals = 0;
			for (const line of diffLines) {
				if (line.startsWith("+") && !line.startsWith("+++")) additions++;
				if (line.startsWith("-") && !line.startsWith("---")) removals++;
			}
			let text =
				theme.fg("success", `+${additions}`) +
				theme.fg("dim", " / ") +
				theme.fg("error", `-${removals}`);
			if (expanded) {
				for (const line of diffLines.slice(0, 30)) {
					if (line.startsWith("+") && !line.startsWith("+++"))
						text += `\n${theme.fg("success", line)}`;
					else if (line.startsWith("-") && !line.startsWith("---"))
						text += `\n${theme.fg("error", line)}`;
					else text += `\n${theme.fg("dim", line)}`;
				}
				if (diffLines.length > 30)
					text += `\n${theme.fg("muted", `… ${diffLines.length - 30} more diff lines`)}`;
			}
			return new Text(text, 0, 0);
		},
	});

	// write
	pi.registerTool({
		name: "write",
		label: "write",
		description: originalWrite.description,
		parameters: originalWrite.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const t = createWriteTool(ctx.cwd);
			return t.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("write "));
			text += theme.fg("accent", shortenPath(args.path));
			const lineCount = args.content.split("\n").length;
			text += theme.fg("dim", ` (${lineCount} lines)`);
			return new Text(text, 0, 0);
		},
		renderResult(result, { isPartial }, theme, _context) {
			if (isPartial) return new Text(theme.fg("warning", "writing…"), 0, 0);
			const content = result.content[0];
			if (content?.type === "text" && content.text.startsWith("Error"))
				return new Text(theme.fg("error", content.text.split("\n")[0]!), 0, 0);
			return new Text(theme.fg("success", "written"), 0, 0);
		},
	});
}
