---
name: dependabot-fix
description: |
  Fix GitHub Dependabot security alerts and create PRs. Fetches open alerts via
  the GitHub API, identifies vulnerable packages and their fixed versions, bumps
  dependencies in the correct manifest (npm overrides / pyproject.toml), updates
  lockfiles, and opens a PR per alert group.
  Use when user says "fix dependabot", "fix security alert", "fix dependabot alert #N",
  "bump vulnerable dependency", or references a /security/dependabot URL.
---

# Dependabot Security Fix

Fix Dependabot security alerts by bumping vulnerable dependencies to their fixed versions and creating PRs.

## Workflow

### 1. Fetch open Dependabot alerts

```bash
gh api repos/<owner>/<repo>/dependabot/alerts \
  --jq '.[] | select(.state == "open") | {
    number,
    severity: .security_advisory.severity,
    package: .dependency.package.name,
    ecosystem: .dependency.package.ecosystem,
    manifest: .dependency.manifest_path,
    advisory: .security_advisory.summary,
    vulnerable_range: .security_vulnerability.vulnerable_range,
    fixed_in: .security_vulnerability.first_patched_version.identifier
  }'
```

If the user gives a specific alert number (e.g. `#86`), filter with `select(.number == 86)`.

### 2. Group alerts by manifest file

Multiple alerts may share the same fix (e.g. GitPython in `uv.lock`). Group by `manifest` path to create one PR per manifest file. Within a manifest, one `npm install` / `uv lock` updates all packages at once.

### 3. Identify the fix

| Ecosystem  | Manifest                             | Fix approach                                               |
| ---------- | ------------------------------------ | ---------------------------------------------------------- |
| pip / PyPI | `pyproject.toml` + `uv.lock`         | Bump version constraint in `pyproject.toml`, run `uv lock` |
| npm        | `package.json` + `package-lock.json` | Add/raise version in `overrides` block, run `npm install`  |

**npm convention:** Use the `overrides` block in `package.json` for transitive dependency security bumps, NOT `npm install <pkg> --save` (which adds it as a direct dependency). Match the existing `overrides` pattern in the repo.

```json
{
  "overrides": {
    "hono": "^4.12.34",
    "dompurify": "^3.4.13"
  }
}
```

**Python convention:** Bump the lower bound in `pyproject.toml`:

```toml
# Before
"gitpython>=3.1.47",
# After
"gitpython>=3.1.58",
```

Then regenerate the lockfile:

```bash
uv lock
```

### 4. Create branch, commit, push, PR

```bash
git checkout -b fix/dependabot-<package>-<alert-number>
git add -A
git commit -m "fix(deps): bump <package> to fix Dependabot alert #<N>

<advisory summary>"
git push -u origin fix/dependabot-<package>-<alert-number>
```

Create PR using the repo's PR template if one exists (check `.github/pull_request_template.md`):

```bash
gh pr create --title "fix(deps): bump <package> to fix Dependabot alert #<N>" \
  --body "$(cat .github/pull_request_template.md 2>/dev/null || echo '## Motivation

<advisory summary>

## Related Issue

Closes https://github.com/<owner>/<repo>/security/dependabot/<N>')"
```

### 5. Parallel fixes with git worktree (optional)

When multiple manifest files need fixes, use git worktrees to work in parallel:

```bash
git fetch origin main
git worktree add /tmp/opencode/wt-<group-name> -b fix/dependabot-<group-name> origin/main
```

Edit each worktree independently, run lockfile updates in parallel, then push and create PRs from each.

Clean up after pushing:

```bash
git worktree remove /tmp/opencode/wt-<group-name>
```

## Constraints

- Requires `gh` CLI authenticated with repo access.
- Requires `uv` for Python projects, `npm` for Node projects.
- Must match the repo's existing dependency-fix convention (overrides vs direct deps).
- Check `.github/pull_request_template.md` and follow its structure for PR bodies.
- If a PR already exists for the same alert, update it rather than creating a duplicate (`gh pr edit <number>`).
