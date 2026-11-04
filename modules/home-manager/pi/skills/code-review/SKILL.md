---
name: code-review
description: High-signal code review of a GitHub pull request. Finds only real bugs and clear AGENTS.md/CLAUDE.md violations, validates each finding before reporting, and drops nitpicks and false positives. Use when asked to review a PR (number, URL, or the current branch's PR). Pass --comment to post the result as a PR comment.
license: Apache-2.0 (see LICENSE)
compatibility: Requires an authenticated gh CLI.
---

<!--
Adapted from anthropics/claude-plugins-official
plugins/code-review/commands/code-review.md
@ fa4eb54397ee2faccb6940512a19c017cb1337f3 (Apache-2.0, see LICENSE).

Modified for pi: pi has no subagents, so the parallel haiku/sonnet/opus
agents are replaced by sequential passes run by a single agent; AGENTS.md
is checked alongside CLAUDE.md; inline comments via the
mcp__github_inline_comment tool are replaced by a single `gh pr comment`.
-->

# Code Review

Provide a code review for the given pull request. If no PR is given, use the PR for the current branch (`gh pr view`).

Only call a tool if it is required to complete the task. Every tool call should have a clear purpose. Use the `gh` CLI to interact with GitHub (fetch pull requests, post comments). Do not use web fetch.

Run the passes below in order. Keep each pass independent: when you start a review pass, judge the diff on its own terms rather than on what an earlier pass concluded.

## 1. Gate

Stop without reviewing if any of the following is true:

- The pull request is closed
- The pull request is a draft
- The pull request does not need code review (e.g. automated PR, trivial change that is obviously correct)
- A previous run of this review has already commented on this PR (check `gh pr view <PR> --comments` for a comment starting with `## Code review`)

Still review AI-generated PRs.

## 2. Collect instruction files

List the paths (not contents) of all relevant `AGENTS.md` and `CLAUDE.md` files:

- The root `AGENTS.md` / `CLAUDE.md`, if they exist
- Any `AGENTS.md` / `CLAUDE.md` in directories containing files modified by the pull request

## 3. Summarize

Read the PR title, description, and diff (`gh pr view <PR>`, `gh pr diff <PR>`) and write a short summary of the changes and the author's intent. Use it as context for every later pass.

## 4. Review passes

Run these passes one after another. Each pass returns a list of issues, where each issue includes a description and the reason it was flagged (e.g. "AGENTS.md adherence", "bug").

- **Pass A — instruction compliance.** Audit the changes for `AGENTS.md` / `CLAUDE.md` compliance. When evaluating compliance for a file, only consider instruction files that share a file path with the file or its parents.
- **Pass B — diff-only bugs.** Scan for obvious bugs. Focus only on the diff itself without reading extra context. Flag only significant bugs; ignore nitpicks and likely false positives. Do not flag issues that you cannot validate without looking at context outside of the git diff.
- **Pass C — introduced problems.** Look for problems that exist in the introduced code. This could be security issues, incorrect logic, etc. Only look for issues that fall within the changed code.

**CRITICAL: We only want HIGH SIGNAL issues.** Flag issues where:

- The code will fail to compile or parse (syntax errors, type errors, missing imports, unresolved references)
- The code will definitely produce wrong results regardless of inputs (clear logic errors)
- Clear, unambiguous `AGENTS.md` / `CLAUDE.md` violations where you can quote the exact rule being broken

Do NOT flag:

- Code style or quality concerns
- Potential issues that depend on specific inputs or state
- Subjective suggestions or improvements

If you are not certain an issue is real, do not flag it. False positives erode trust and waste reviewer time.

## 5. Validate each finding

For each issue from step 4, re-check it from scratch with the PR title and description in mind. The job is to confirm that the stated issue is truly an issue with high confidence. For example, if "variable is not defined" was flagged, confirm that it is actually undefined in the code. For instruction-file issues, confirm that the rule is scoped to this file and is actually violated.

## 6. Filter

Drop every issue that was not confirmed in step 5. What remains is the list of high-signal issues.

Use this list when evaluating issues in steps 4 and 5 (these are false positives, do NOT flag):

- Pre-existing issues
- Something that appears to be a bug but is actually correct
- Pedantic nitpicks that a senior engineer would not flag
- Issues that a linter will catch (do not run the linter to verify)
- General code quality concerns (e.g., lack of test coverage, general security issues) unless explicitly required in `AGENTS.md` / `CLAUDE.md`
- Issues mentioned in `AGENTS.md` / `CLAUDE.md` but explicitly silenced in the code (e.g., via a lint ignore comment)

## 7. Report

Output a summary of the review findings to the terminal:

- If issues were found, list each issue with a brief description and a link to the code.
- If no issues were found, state: "No issues found. Checked for bugs and AGENTS.md/CLAUDE.md compliance."

If the `--comment` argument was NOT provided, stop here. Do not post any GitHub comments.

If `--comment` IS provided, post exactly one comment with `gh pr comment <PR> --body-file <file>` in this format, then stop:

```markdown
## Code review

<one bullet per issue: brief description, link to the code, and the suggested fix; or "No issues found. Checked for bugs and AGENTS.md/CLAUDE.md compliance.">
```

Only list ONE bullet per unique issue. Cite and link each issue (e.g., when referring to an `AGENTS.md` rule, link to that file).

When linking to code, follow this format precisely, otherwise the Markdown preview won't render correctly: `https://github.com/<owner>/<repo>/blob/<full-sha>/<path>#L<start>-L<end>`

- Use the full commit SHA of the PR head. Shell substitutions such as `$(git rev-parse HEAD)` will not work, since the comment is rendered directly as Markdown.
- The repo name must match the repo being reviewed.
- Use a `#` after the file name and the `L<start>-L<end>` line range format.
- Provide at least 1 line of context before and after, centered on the line you are commenting about (e.g. if you are commenting about lines 5-6, link to `L4-L7`).
