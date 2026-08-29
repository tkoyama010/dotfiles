# npm-publish

Publish npm packages from pi's non-interactive bash environment.

## When to use

- `npm publish` from pi
- 2FA browser authentication needed (Touch ID, security key)
- Non-interactive shell blocks standard npm auth flow

## Problem

pi's bash tool runs without a TTY. npm detects `!process.stdin.isTTY` and skips the browser
authentication flow, falling back to masked error output (`https://www.npmjs.com/auth/cli/***`).
This makes browser-based 2FA (Touch ID, security key) impossible from pi.

## Solution

Use `script -q /dev/null` to provide a pseudo-TTY. npm then displays the real auth URL.
Extract it from the log and open in the browser for Touch ID authentication.

## Prerequisites

1. **2FA enabled on npm account** (security key / Touch ID)
   - Settings → Two-Factor Authentication → Enable
2. **"Require 2FA for write actions" OFF**
   - Settings → Two-Factor Authentication → Additional Options → uncheck
   - This allows publish with browser auth instead of requiring OTP code
3. **`npm login --auth-type=web` completed**
   - Run once per session: `npm login --auth-type=web`
   - Browser opens, user authenticates with Touch ID

## Steps

### 1. Login (once per session)

```bash
npm login --auth-type=web
```

Wait for "Logged in on https://registry.npmjs.org/."

### 2. Publish with pseudo-TTY

```bash
cd /path/to/package
rm -f /tmp/npm-publish.log
script -q /dev/null npm publish --access public > /tmp/npm-publish.log 2>&1 &
sleep 5
```

### 3. Extract and open auth URL

```bash
grep -o 'auth/cli/[a-f0-9-]*' /tmp/npm-publish.log | head -1 | tr -d '\r' | xargs -I {} open "https://www.npmjs.com/{}"
```

### 4. User completes Touch ID auth

Tell the user: "Browser opened. Authenticate with Touch ID."

Wait for user confirmation.

### 5. Verify publish

```bash
cat /tmp/npm-publish.log | tr -d '\r' | grep -E "published|already|E403"
```

- `+ package-name@version` → success
- `cannot publish over` → already published (success, version exists)
- `E403` → permission error, check 2FA settings

### 6. Verify on registry (may lag)

```bash
npm view @scope/package-name version
```

If 404, wait 30-60s for CDN propagation. Or open:
```
https://www.npmjs.com/package/@scope/package-name
```

## Scoped vs unscoped

- **Unscoped** (`package-name`): npm requires 2FA for publish. Must use browser auth.
- **Scoped** (`@user/package-name`): No 2FA requirement if account setting allows it.

If unscoped publish fails with E403 even after 2FA setup, switch to scoped:
```json
{ "name": "@username/package-name" }
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ENEEDAUTH` | Not logged in | `npm login --auth-type=web` |
| `E403` bypass 2FA required | "Require 2FA for write actions" is ON | Turn it OFF in npm settings |
| `E403` cannot publish over | Version already published | Bump version in package.json |
| `EOTP` with masked URL | No TTY (running from pi bash) | Use `script -q /dev/null` wrapper |
| URL shows `%0D` (404) | Carriage return appended | `tr -d '\r'` when extracting URL |
| `npm view` returns 404 after publish | CDN propagation delay | Wait 30-60s, or check browser |

## One-liner

```bash
cd /path/to/package && rm -f /tmp/npm-publish.log && script -q /dev/null npm publish --access public > /tmp/npm-publish.log 2>&1 & sleep 5 && grep -o 'auth/cli/[a-f0-9-]*' /tmp/npm-publish.log | head -1 | tr -d '\r' | xargs -I {} open "https://www.npmjs.com/{}" && echo "Authenticate with Touch ID in browser"
```
