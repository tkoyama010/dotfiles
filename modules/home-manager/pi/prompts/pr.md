---
description: Create a GitHub pull request in English for the current branch
argument-hint: "[base-branch]"
---
Create a pull request for the current branch against ${1:-main}.

1. Run `git diff ${1:-main}...HEAD` and review the commits
2. Write the PR title as a Conventional Commits message (e.g. `feat(pi): add prompt templates`)
3. Write the PR body in English with a short summary and a bullet list of changes
4. Create the PR with `gh pr create`
5. Show the PR URL
