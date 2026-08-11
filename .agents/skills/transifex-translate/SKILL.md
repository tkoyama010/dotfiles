---
name: transifex-translate
description: |
  Batch-translate untranslated strings in a Transifex project using the
  browser-based internal editor API. Discovers all resources with untranslated
  strings, fetches source text via the Transifex editor AJAX API, and saves
  translations in bulk — no Transifex CLI or public API token required.
  Use when user says "translate transifex", "finish transifex translation",
  "batch translate transifex", or references a Transifex translate URL.
---

# Transifex Batch Translation

Translate untranslated strings in a Transifex project via the browser editor's
internal AJAX API. Requires an active browser session logged into Transifex
(no API token needed — uses session cookies + CSRF).

## Prerequisites

1. **Browser session**: User must be logged into Transifex in the Playwright
   browser. Navigate to the project translate page first:
   `https://app.transifex.com/<org>/<project>/translate/#<lang>?q=translated%3Ano`
2. **TX_TOKEN** (optional): If set in env, can be used for the public API as a
   fallback. The primary path uses the browser session.
3. **Playwright browser tools**: All API calls go through `page.evaluate()`
   with `fetch()` from the logged-in browser context.

## API Endpoints (Internal Editor AJAX)

All endpoints are relative to `https://app.transifex.com`:

| Purpose                      | Method | Path                                                               |
| ---------------------------- | ------ | ------------------------------------------------------------------ |
| Project resource stats       | GET    | `/_/editor/ajax/<org>/<project>/project_lang_stats/<lang>/`        |
| Untranslated string IDs      | POST   | `/_/editor/ajax/<org>/<project>/string/<resource>/ja/ids/`         |
| String details (source text) | POST   | `/_/editor/ajax/<org>/<project>/string/<resource>/<lang>/segment/` |
| Save translation             | POST   | `/_/editor/ajax/<org>/<project>/string_detail/<lang>/<string_id>/` |

## Workflow

### 1. Discover resources with untranslated strings

```javascript
// Inside page.evaluate()
const csrf = document.cookie.match(/csrftoken=([^;]+)/)[1];
const resp = await fetch(
  "/_/editor/ajax/<org>/<project>/project_lang_stats/<lang>/",
  {
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  },
);
const data = await resp.json();
const untranslated = data.filter((r) => r.untranslated > 0);
```

### 2. Fetch untranslated strings for a resource

```javascript
// Get IDs
const idsResp = await fetch(
  `/_/editor/ajax/<org>/<project>/string/<resource>/<lang>/ids/`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ escape: false, translated: "no", s: "default:asc" }),
  },
);
const ids = await idsResp.json();

// Get source text
const segResp = await fetch(
  `/_/editor/ajax/<org>/<project>/string/<resource>/<lang>/segment/`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({
      ids: ids,
      escape: "no",
      query: "translated=no&s=default:asc",
    }),
  },
);
const strings = await segResp.json();
// Returns: [{ id, source, translation, resource_slug, ... }]
```

### 3. Save a translation

```javascript
const body = {
  translations: { 5: { string: translationText } },
  raw_mode_enabled: false,
  previous_translations: { 5: { tr_hash: "d41d8cd98f00b204e9800998ecf8427e" } },
  suggestions: [],
};

const resp = await fetch(
  `/_/editor/ajax/<org>/<project>/string_detail/<lang>/<stringId>/`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: "data=" + encodeURIComponent(JSON.stringify(body)),
  },
);
// Status 200 = success
```

### 4. Batch processing strategy

- Process resources **smallest untranslated count first** to make fast progress.
- Fetch strings for 10-20 resources at a time, then translate in batches of ~20
  saves per `page.evaluate()` call to avoid timeouts.
- For large resources (>100 strings), split save calls into multiple batches.
- Keep technical tokens unchanged: `:ref:`, `:fa:`, `:doc:`, `code`, `**bold**`,
  file paths, URLs, tag metadata lines starting with `🏷 Tags:`.

### 5. Translation conventions

- Preserve all RST/Sphinx markup: `:ref:...`, `:doc:...`, `:fa:...`, `:term:...`
- Preserve code blocks: ` `code` `, `:meth:~...`
- Preserve URLs and download links: `:download:`...``
- Tag metadata lines (`🏷 Tags: ...`) are left as-is (machine-generated)
- Use full-width punctuation for Japanese: `．` (period), `，` (comma)
- Translate descriptive prose; keep technical terms transliterated or as-is

## Helper Script

A reusable TypeScript module is provided in
`scripts/batch-translate.ts` — inject it via `page.evaluate()` to fetch,
translate, and save strings for a list of resources in one call.
Includes typed interfaces for all API responses and the `window.tx` API.

## Constraints

- Browser must be on a Transifex page for cookies/CSRF to be available.
- CSRF token is read from `csrftoken` cookie; refresh if session expires.
- The `tr_hash` for untranslated strings is always
  `d41d8cd98f00b204e9800998ecf8427e` (MD5 of empty string).
- Rate limiting: keep batches under ~30 saves per `evaluate()` call to avoid
  Playwright MCP timeouts (120s default).
- For very large projects (>2000 strings), process incrementally across
  multiple sessions — don't attempt all at once.
