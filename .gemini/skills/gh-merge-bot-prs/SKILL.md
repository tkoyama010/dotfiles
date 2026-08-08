---
name: gh-merge-bot-prs
description: Approve and squash-merge pull requests from bots (e.g., pre-commit-ci, dependabot) when CI checks pass. Use this when the user wants to automate the cleanup of maintenance PRs.
---

# PR Merge Automation Skill

This skill automates the process of checking CI status, approving, and merging pull requests authored by specific bots or users.

## Workflow

1.  **Identify the Author**: Determine the bot or user whose PRs should be merged (e.g., `pre-commit-ci[bot]`, `app/dependabot`).
2.  **Search PRs**: Find open PRs by that author in the user's repositories.
3.  **Verify CI**: For each PR, check if all CI checks have finished and passed (SUCCESS, NEUTRAL, or SKIPPED).
4.  **Approve & Merge**: If checks pass, approve the PR and perform a squash merge. Use admin privileges if necessary (e.g., branch is behind).

## Commands

The skill uses a bundled script to handle the logic efficiently:

- **Execute Merge Logic**:
  ```bash
  bash scripts/merge_logic.sh <author_login> [owner]
  ```

### Target Authors

- **pre-commit-ci**: `pre-commit-ci[bot]` (or just `pre-commit-ci`)
- **Dependabot**: `app/dependabot` (or `dependabot[bot]`)

## Safety and Best Practices

- Only merges PRs where **all** checks have passed.
- Uses **Squash Merge** by default to keep the main branch history clean.
- Deletes the remote branch after merging to reduce clutter.
- Skips PRs with pending or failed checks to ensure stability.
