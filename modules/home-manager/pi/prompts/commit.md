---
description: Write a Conventional Commits message for the staged changes
---
Write a commit message for the staged changes (`git diff --cached`).

- Use Conventional Commits: `type(scope): description`
- Pick type from the change: feat, fix, chore, refactor, docs, test
- Scope from the affected area (e.g. pi, shell, nvim)
- Description in English, imperative mood, no trailing period
- Body (if needed): what and why, not how, in English
- Output the commit message only, then commit with it
