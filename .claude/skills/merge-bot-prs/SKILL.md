---
name: merge-bot-prs
description: |
  Find open PRs created by pre-commit-ci[bot] or dependabot across tkoyama010's repositories,
  approve and merge those with passing CI. Use this when asked to process bot-created PRs.
---

Search for open PRs created by `pre-commit-ci[bot]` and `dependabot` across the owner's repositories,
check CI status, then approve and merge only those with all checks passing.

## Commands

### Search for open bot PRs

```bash
# pre-commit-ci[bot] PRs (covers both title patterns)
gh search prs --owner tkoyama010 --author "pre-commit-ci[bot]" --state open --limit 100

# dependabot PRs
gh search prs --owner tkoyama010 --author "app/dependabot" --state open --limit 100
```

### Check CI status for each PR

```bash
gh pr checks <PR_NUMBER> --repo <OWNER/REPO>
```

- If output contains `fail` or `error` → skip (CI failing)
- If output contains `pass` or `success` → proceed to approve and merge
- If output is `no checks reported` → CI not configured; skip unless instructed otherwise

### Approve and merge a passing PR

```bash
# Approve
gh pr review <PR_NUMBER> --repo <OWNER/REPO> --approve

# Merge (try --auto first; fall back to direct merge if auto-merge is disabled)
gh pr merge <PR_NUMBER> --repo <OWNER/REPO> --squash --auto \
  || gh pr merge <PR_NUMBER> --repo <OWNER/REPO> --squash
```

### Verify result

```bash
gh pr view <PR_NUMBER> --repo <OWNER/REPO> --json state,mergedAt
```

## Typical Workflow

1. Run both search commands above and collect all open bot PRs.
2. For each PR, run `gh pr checks` and classify as PASS / FAIL / NO_CI.
3. For every PASS PR, run approve then merge.
4. Verify the merged state and report a summary to the user.

## Notes

- pre-commit-ci[bot] uses two title patterns; search by author rather than title to avoid missing either:
  - `[pre-commit.ci] pre-commit autoupdate`
  - `chore: update pre-commit hooks`
- Some repositories do not allow auto-merge (`enablePullRequestAutoMerge`). In that case drop `--auto` and merge directly.
- A PR with `mergeable: CONFLICTING` cannot be merged automatically; report it to the user instead.
- PRs with no CI checks (`no checks reported`) are skipped by default unless the user explicitly asks to merge them.

## Constraints

- Requires `gh` (GitHub CLI) authenticated as the repository owner.
- Only merges PRs where the author is a bot (`pre-commit-ci[bot]` or `app/dependabot`).
- Never merges PRs with failing CI.
