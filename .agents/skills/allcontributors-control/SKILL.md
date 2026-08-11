---
name: allcontributors-control
description: |
  Credit contributors on a GitHub repo using the all-contributors bot.
  Scans merged PRs, classifies each by the all-contributors emoji-key
  contribution type, and posts `@allcontributors please add @user for <type>`
  comments on one representative PR per type. Handles the bot's
  one-open-PR-at-a-time limit by merging each bot PR before triggering the
  next type.
  Use when user says "add all-contributors", "credit contributors",
  "allcontributors bot", "find PRs for contribution", or references
  https://allcontributors.org/en/reference/emoji-key/
---

# All-Contributors Control

Add contributor credits to a GitHub repo via the
[allcontributors bot](https://github.com/all-contributors/app) by posting
trigger comments on merged PRs. One comment per contribution type is enough
— the bot dedupes types, so posting on every PR is noise.

## Prerequisites

1. **`gh` CLI** authenticated with comment + PR merge permissions on the
   target repo.
2. **`.all-contributorsrc`** present in the repo (bot config). If absent,
   the bot creates it on first trigger.
3. **allcontributors app installed** on the repo.
   Install from https://github.com/apps/allcontributors

## Emoji Key → Contribution Types

Full reference: https://allcontributors.org/en/reference/emoji-key/

Map PR title prefix to contribution type (first match wins):

| PR title prefix                     | Type          | Emoji |
| ----------------------------------- | ------------- | ----- |
| `feat:`, `feat(scope):`             | `code`        | 💻    |
| `fix:`, `fix(scope):`, `fix(deps):` | `bug`         | 🐛    |
| `fix(deps):` (security advisory)    | `security`    | 🛡️    |
| `docs:`                             | `doc`         | 📖    |
| `test:`                             | `test`        | ⚠️    |
| `tool:`, `chore:` (tooling)         | `tool`        | 🔧    |
| `ci:`                               | `infra`       | 🚇    |
| `chore(deps):` (non-security bump)  | `maintenance` | 🚧    |
| `revert:`                           | — (skip)      |       |
| `chore(main): release`              | — (skip)      |       |

Ambiguous `fix(deps):` — check PR body for `GHSA-` / `Dependabot alert` →
`security`; plain version bump → `maintenance`.

## Workflow

### 1. Collect merged PRs by a contributor

```bash
gh pr list --repo <owner>/<repo> --state merged --limit 200 \
  --json number,title,author,state \
  --jq '.[] | select(.author.login == "<user>" and .state == "MERGED")
        | [.number, .title] | @tsv' \
  | sort -n
```

Exclude bot authors: `app/dependabot`, `app/pre-commit-ci`,
`app/allcontributors`, `app/renovate`, and any `*[bot]` login.

### 2. Skip PRs already credited

For each candidate PR, check whether an `@allcontributors please add`
comment already exists:

```bash
gh pr view <N> --repo <owner>/<repo> --json comments \
  --jq '[.comments[].body] | any(test("please add .* for"))'
```

Skip PRs where this is `true`.

### 3. Classify each PR

Apply the prefix map above. Record `{ number, type }` for each PR. Keep
the **first PR per type** (lowest number) as the representative — one
comment per type is sufficient.

### 4. Post trigger comments

For each representative PR, post:

```bash
gh pr comment <N> --repo <owner>/<repo> \
  --body "@allcontributors please add @<user> for <type>"
```

### 5. Handle the bot's one-PR-at-a-time limit

The bot opens a single add-PR (e.g. `docs: add <user> as a contributor
for <type>`) and refuses further requests while it stays open. Strategy:

1. After posting a comment, poll for the bot's add-PR:

   ```bash
   gh pr list --repo <owner>/<repo> --author app/allcontributors \
     --state open --json number,title
   ```

2. Wait for CI to pass, then merge it:

   ```bash
   gh pr checks <ADD_PR> --repo <owner>/<repo> --watch --interval 30
   gh pr merge <ADD_PR> --repo <owner>/<repo> --squash --delete-branch
   ```

3. Once merged, the bot can process the next type. Re-comment on the
   next representative PR (the bot does not auto-retry failed requests).

### 6. Verify final `.all-contributorsrc`

After all types are processed, confirm the contributor's `contributions`
array lists every type added:

```bash
gh api repos/<owner>/<repo>/contents/.all-contributorsrc \
  --jq '.content' | base64 -d
```

## Constraints

- One comment per contribution type — the bot dedupes; extra comments are
  noise.
- The bot only keeps **one add-PR open at a time**. Sequential processing
  (post → merge add-PR → post next) is required for multi-type credits.
- Bot replies `"We had trouble processing your request"` when an add-PR is
  already open — that is the queue-blocked signal, not a permanent error.
- Bot replies are not instant (~10–60s). Poll rather than assume.
- `revert:` and `chore(main): release` PRs carry no new contribution type
  — skip them.
- Only credit merged PRs. Open PRs may never merge.
- If the repo has no `.all-contributorsrc`, the bot bootstraps it on the
  first trigger; no manual setup needed.
