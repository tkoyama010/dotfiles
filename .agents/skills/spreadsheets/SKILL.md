---
name: spreadsheets
description: |
  Create, edit, or analyze spreadsheet files (.xlsx, .csv, .tsv) from code so the result stays traceable: inputs in cells, calculations as formulas with cell references, all edits in one builder script, and a verify-then-fix loop before delivering. Use whenever a task reads or writes a workbook.
---

Spreadsheet work from code fails in two quiet ways: numbers get hardcoded so nobody can trace or change an assumption, and edits get scattered across ad-hoc commands so nobody can reproduce the file. These rules counter both.

Based on: https://tech.layerx.co.jp/entry/coding-agent-for-spreadsheet (an analysis of OpenAI's Codex Spreadsheets skill). That skill depends on OpenAI's private `@oai/artifact-tool`; this version uses `openpyxl` via `uv` instead.

## Workflow

1. Understand: read the request and inspect the input workbook (sheets, used ranges, headers, existing formulas, number formats) before writing anything. For a read-only question, answer from the workbook and do not modify or save it.
2. Edit: write all changes in one builder script (e.g. `build_workbook.py`) and run it with `uv run --with openpyxl python build_workbook.py`.
3. Verify: inspect the cells you touched (values, formulas, formats) and scan for errors.
4. Fix: on any problem, patch the same builder script and rerun it from the original input. Repeat 3-4 until clean.
5. Deliver: save one `.xlsx` and report the path. Do not overwrite the user's input file unless asked.

## Keep the calculation visible

- Put inputs and assumptions in their own labeled cells. Never embed them in formulas: write `=A5*(1+$A$6)` with the rate in `A6`, not `=A5*1.05`.
- Write derived values as formulas, not Python-computed constants. The user must be able to change an input and see results update.
- Split long formulas into meaningful intermediate cells instead of one huge expression.
- Keep formula patterns consistent across a range (e.g. every projection period uses the same formula) and use `$` anchoring correctly for fill behavior.

## One builder script

- Keep every edit in a single script and patch it in place. Do not create `build_v2.py`, heredoc one-offs, or chains of scripts that each mutate an intermediate file.
- The script always starts from the original input (or from scratch) so rerunning it reproduces the full result.
- Do not mix libraries for workbook writing (`openpyxl` only; no `xlsxwriter` or `pandas.ExcelWriter`) unless the user asks. `pandas` is fine for reading or analysis.

## Data formatting

- Store numbers, percentages, currency, and dates as typed values, not preformatted strings. Use text only for true identifiers (ZIP codes, account IDs, SKUs).
- Use Excel-invariant format codes such as `#,##0`, `0.0%`, `"$"#,##0`, `yyyy-mm-dd`. Do not swap `.` and `,` to mimic a locale.
- Preserve existing styles, formats, and formulas you were not asked to change. Loading with `data_only=True` drops formulas, so never save a workbook loaded that way.

## Verify

- `openpyxl` does not calculate formulas. When LibreOffice is available, recalculate with `soffice --headless --convert-to xlsx --outdir <dir> <file>` and reload with `data_only=True` to read computed values.
- Scan the touched ranges for `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`, references to empty or wrong cells, off-by-one ranges, and circular references.
- Print only key ranges. Do not dump whole sheets into the conversation.
- Check that headers are not clipped (set reasonable column widths) and that no sheet is left blank by accident.
