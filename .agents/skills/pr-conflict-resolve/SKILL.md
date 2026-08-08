---
name: pr-conflict-resolve
description: |
  Resolve merge conflicts on an open GitHub PR using a git worktree. Fetches the
  PR metadata, creates an isolated worktree from the PR branch, merges the base
  branch, resolves conflicts, pushes the merge commit back to the PR branch, and
  verifies the PR becomes mergeable.
  Use when user says "resolve conflict in PR #N", "fix PR conflict", "rebase PR",
  "use git worktree to resolve conflict", or references a CONFLICTING PR.
---

# PR Conflict Resolution with Git Worktree

Resolve merge conflicts on an open PR using an isolated git worktree so the main working directory is not disrupted.

## Workflow

### 1. Fetch PR details

```bash
gh pr view <PR_NUMBER> --json title,headRefName,baseRefName,mergeable,mergeStateStatus,headRepository,headRepositoryOwner
```

Key fields:
- `headRefName` — the PR branch name
- `baseRefName` — the target branch (usually `main`)
- `mergeable` — should be `CONFLICTING`

If the PR is from a fork, check `headRepositoryOwner` — you may need different push permissions.

### 2. Fetch latest refs

```bash
git fetch origin --prune
git fetch origin <headRefName>
```

### 3. Create a worktree from the PR branch

```bash
git worktree add /tmp/opencode/pr<N>-resolve origin/<headRefName>
```

Work in the worktree directory for all subsequent steps.

### 4. Create a local branch and merge the base branch

```bash
cd /tmp/opencode/pr<N>-resolve
git checkout -b resolve-pr<N>-conflict <head-commit-sha>
git merge origin/<baseRefName>
```

### 5. Resolve conflicts

Conflict markers will appear in the affected files. Read each conflicted file, understand both sides, and resolve manually:

- Keep both changes when they are non-overlapping (e.g. both add entries to a list/toctree — include both in order)
- Choose the correct side when changes overlap
- Remove all `<<<<<<<`, `=======`, `>>>>>>>` markers

```bash
git add <resolved-files>
git commit --no-edit
```

### 6. Push back to the PR branch

```bash
git push origin resolve-pr<N>-conflict:<headRefName>
```

This pushes the merge commit directly to the PR's branch, updating the PR.

### 7. Verify the PR is now mergeable

GitHub takes a few seconds to recompute mergeable status:

```bash
sleep 10
gh pr view <PR_NUMBER> --json mergeable,mergeStateStatus,state
```

`mergeable` should change from `CONFLICTING` to `MERGEABLE`. `BLOCKED` in `mergeStateStatus` means CI/review requirements are pending (not a conflict).

### 8. Clean up the worktree

```bash
git worktree remove /tmp/opencode/pr<N>-resolve
git branch -D resolve-pr<N>-conflict
```

## Parallel Conflict Resolution

When multiple PRs have conflicts, create a worktree per PR and resolve them in parallel:

```bash
git worktree add /tmp/opencode/pr<A>-resolve origin/<branchA>
git worktree add /tmp/opencode/pr<B>-resolve origin/<branchB>
```

Resolve, push, and clean up each independently.

## Constraints

- Requires `gh` CLI authenticated with push access to the repo.
- The PR must be from the same repo (not a fork) for direct push to the PR branch.
- If the PR is from a fork, you cannot push to the PR branch directly — instead, create a new PR or ask the fork owner to pull the merge.
- Requires git worktree support (standard in git 2.15+).
- Always work in the worktree directory (`/tmp/opencode/pr<N>-resolve`), not the main repo.
