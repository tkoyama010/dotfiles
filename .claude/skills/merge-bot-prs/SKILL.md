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
# pre-commit-ci[bot] PRs
gh search prs --owner tkoyama010 --author "pre-commit-ci[bot]" --state open --json number,title,repository,url --limit 100

# dependabot PRs
gh search prs --owner tkoyama010 --author "app/dependabot" --state open --json number,title,repository,url --limit 100
```

### Check PR state and CI status

```bash
gh pr view <PR_NUMBER> --repo <OWNER/REPO> --json state,mergeable,mergeStateStatus,statusCheckRollup
```

Classify each PR:

| mergeable     | mergeStateStatus       | Action                                                                 |
| ------------- | ---------------------- | ---------------------------------------------------------------------- |
| `CONFLICTING` | `DIRTY`                | Request rebase (see below)                                             |
| `MERGEABLE`   | `CLEAN` or `HAS_HOOKS` | Check CI, then merge                                                   |
| `MERGEABLE`   | `UNSTABLE`             | Check if failing checks are required; skip if any required check fails |
| `UNKNOWN`     | any                    | PR may be closed or mid-rebase; skip                                   |

### Verify CI before merging

```bash
gh pr checks <PR_NUMBER> --repo <OWNER/REPO>
```

- All required checks must show `pass` — do not merge if any required check shows `fail`
- Optional (non-required) checks that fail are acceptable but should be noted
- If checks are still running (`pending`), wait and re-check before merging

### Approve and merge a passing PR

```bash
# Approve
gh pr review <PR_NUMBER> --repo <OWNER/REPO> --approve

# Merge strategy: squash first (most repos), rebase as fallback
gh pr merge <PR_NUMBER> --repo <OWNER/REPO> --squash \
  || gh pr merge <PR_NUMBER> --repo <OWNER/REPO> --rebase \
  || gh pr merge <PR_NUMBER> --repo <OWNER/REPO> --merge
```

Do NOT use `--auto` by default — many repos have auto-merge disabled, which causes the command to fail silently or error.

### Resolve merge conflicts (dependabot PRs only)

When a PR is `CONFLICTING`, ask dependabot to rebase it:

```bash
gh pr comment <PR_NUMBER> --repo <OWNER/REPO> --body "@dependabot rebase"
```

Wait a few minutes, then re-check `mergeable`. Repeat once if still conflicting. If still unresolved after two attempts, report to the user.

### Verify result

```bash
gh pr view <PR_NUMBER> --repo <OWNER/REPO> --json state,mergedAt
```

## Typical Workflow

1. Run both search commands and collect all open bot PRs (skip any with `state: CLOSED`).
2. For each open PR, check `mergeable` and `mergeStateStatus`.
3. **CONFLICTING** → comment `@dependabot rebase`, track for later.
4. **MERGEABLE** → run `gh pr checks` and confirm all required checks pass.
5. If CI passes, approve then merge using the squash-first strategy.
6. After processing all initial PRs, revisit rebased PRs: re-check CI and merge if passing.
7. Report a final summary: merged / skipped (CI fail) / unresolved conflicts.

## Notes

- Some repositories do not allow merge commits; squash or rebase is required.
- Some repositories do not allow auto-merge (`enablePullRequestAutoMerge`); drop `--auto` and merge directly.
- dependabot may close older superseded PRs automatically — always check `state` before processing.
- `mergeStateStatus: UNSTABLE` means a non-required check is failing; confirm it is not required before merging.
- pre-commit-ci[bot] uses two title patterns; search by author rather than title to catch both:
  - `[pre-commit.ci] pre-commit autoupdate`
  - `chore: update pre-commit hooks`

## Constraints

- Requires `gh` (GitHub CLI) authenticated as the repository owner.
- Only merges PRs where the author is a bot (`pre-commit-ci[bot]` or `app/dependabot`).
- Never merge a PR when any required CI check is failing or still running.
