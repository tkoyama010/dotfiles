---
name: bot-pr-merge
description: |
  Merge open bot-authored PRs (dependabot, pre-commit.ci, renovate) where CI
  checks have passed. Lists all open PRs with author and check status, filters
  to bot authors with all-green CI and mergeable status, then squash-merges
  with branch deletion.
  Use when user says "merge bot PRs", "merge dependabot PRs", "auto-merge PRs",
  "merge PRs where CI passed and author is bot", or "merge green bot PRs".
---

# Bot PR Auto-Merge

Merge open PRs authored by bots (dependabot, pre-commit.ci, renovate) when CI checks pass and the PR is mergeable.

## Workflow

### 1. List all open PRs with check status

```bash
gh pr list --state open --json number,title,author,mergeable,mergeStateStatus,statusCheckRollup
```

### 2. Filter: bot author + all CI green + mergeable

A PR is eligible when **all three** are true:

- `author.is_bot` is `true`
- Every entry in `statusCheckRollup` has `state` == `"SUCCESS"` (or `conclusion` == `"SUCCESS"` for check runs)
- `mergeable` == `"MERGEABLE"` and `mergeStateStatus` == `"CLEAN"`

Common bot authors:
- `app/dependabot` — dependency bumps
- `app/pre-commit-ci` — pre-commit hook updates
- `app/renovate` — dependency updates

### 3. Merge eligible PRs

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

Merge older PRs first (lower PR number) — merging one may change the mergeable status of others (especially if they touch the same files). Re-check after each merge:

```bash
gh pr list --state open --json number,mergeable,mergeStateStatus
```

### 4. One-liner for batch merge

To list and merge all eligible bot PRs in sequence:

```bash
gh pr list --state open --json number,author,statusCheckRollup,mergeable --jq '
  map(select(
    .author.is_bot and
    (.statusCheckRollup | all(.state == "SUCCESS" or .conclusion == "SUCCESS")) and
    .mergeable == "MERGEABLE"
  )) | .[].number
' | while read pr; do
  echo "Merging #$pr..."
  gh pr merge "$pr" --squash --delete-branch
done
```

## Constraints

- Requires `gh` CLI authenticated with merge permissions on the repo.
- Only merge PRs from bot authors — never auto-merge human-authored PRs without explicit approval.
- `--squash --delete-branch` is the default; adjust if the repo uses a different merge strategy.
- After merging one PR, other PRs may become `CONFLICTING` or `BLOCKED` — re-check before merging the next.
- If a bot PR touches lockfiles or generated files, merging it may invalidate other open PRs that modify the same files.
