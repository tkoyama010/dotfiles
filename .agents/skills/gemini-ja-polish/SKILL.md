---
name: gemini-ja-polish
description: Rewrite a Japanese draft into natural Japanese with the Gemini CLI, keeping the meaning and facts unchanged. Use this when Japanese text reads stiff, machine-translated, or AI-generated.
---

# Japanese Polishing with Gemini

Send a Japanese draft through the `gemini` CLI and get back text that reads like a
human wrote it. Meaning and facts stay the same; only the wording changes.

## Prerequisite

The `gemini` CLI must be installed and authenticated. The skill uses whatever model
the CLI is configured to use by default. Gemini 3.8 Flash is a good default for
Japanese: set it in your Gemini CLI config if it is not already the default.

## Usage

Polish a file:

```bash
gemini "以下の日本語を、意味と事実を変えずに自然な日本語へ書き直してください。出力は本文のみ。

$(cat draft.md)"
```

Polish text from a pipe:

```bash
pbpaste | gemini "以下の日本語を、意味と事実を変えずに自然な日本語へ書き直してください。出力は本文のみ。"
```

Override the model explicitly (optional):

```bash
gemini -m <model> "..."
```

## Rules for the rewrite

Keep these constraints in the prompt so the output stays usable:

- Do not add, drop, or soften facts, numbers, names, or URLs.
- Keep technical terms, code, commands, and error strings verbatim.
- Keep the original structure: same headings, same list items, same order.
- Do not add filler such as 「ぜひご活用ください」 or apologies the draft does not have.
- Return the rewritten body only, with no preamble and no explanation.

## Workflow

1. Write or receive the Japanese draft.
2. Run the command above on the draft.
3. Diff the result against the draft and confirm no fact changed.
4. Use the polished text; keep the original if the rewrite drifted.

## Notes

- Works on any Japanese text: Slack messages, PR descriptions, docs, commit bodies.
- For English text this skill does nothing useful; use a different prompt.
- If the output changed a number, a name, or a command, discard it and rerun with the
  offending constraint repeated in the prompt.
