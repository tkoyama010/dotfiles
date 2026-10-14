---
name: slack-draft-reply
description: |
  Read Slack threads and prepare reply drafts WITHOUT posting them. Fetches a
  thread via the Slack Web API using SLACK_TOKEN from ~/.envrc, summarizes the
  discussion, and writes reply drafts to a local drafts file. Never posts to
  Slack unless the user explicitly says "post it".
  Use when the user shares a slack.com/archives/... URL and asks for a reply
  draft, summary, or "what does this thread say". Also use when the user says
  "slack draft", "draft a Slack reply", or "save a draft for that thread".
---

# Slack Draft Reply

Read Slack threads with the Web API. Default output is a **draft saved locally**, never a post.

## Rules

- **Never call `chat.postMessage` or `chat.delete`** unless the user explicitly asks to post.
- Default behavior: fetch thread → summarize → write draft text → save to drafts file.
- Draft language: match the thread (Japanese thread → Japanese draft, English thread → English draft).

## Setup

Token must be a **User OAuth Token** (`xoxp-...`) stored in `~/.envrc` as `SLACK_TOKEN`.
App-level tokens (`xapp-...`) authenticate but cannot call `conversations.*`.

```bash
t=$(grep -h 'SLACK_TOKEN=' ~/.envrc | head -1); t="${t#*=}"; t="${t%\"}"; t="${t#\'}"
```

## 1. Parse the archive URL

`https://<team>.slack.com/archives/<CHANNEL>/p<MSGTS>` → channel = `<CHANNEL>`,
message ts = `<MSGTS>` with a dot inserted before the last 6 digits.
Thread replies: `thread_ts` query param if present, otherwise the message ts.

## 2. Read the thread

```bash
curl -s -H "Authorization: Bearer $t" \
  "https://slack.com/api/conversations.replies?channel=$CHANNEL&ts=$THREAD_TS&limit=100"
```

Print one message per line: `[user] text`. Resolve user IDs to names with
`users.info` if names matter. Common errors: `not_allowed_token_type` (xapp token),
`invalid_auth` (bad/revoked token), `missing_scope` (add `channels:history`).

## 3. Save the draft

Append to `~/.pi/slack-drafts.md` under a heading with the thread URL and date:

```markdown
## <YYYY-MM-DD> <thread URL>

<draft text>
```

Then show the draft to the user and wait for edits or approval.

## 4. Posting (explicit only)

Only after the user says "post it" / "投稿して":

```bash
curl -s -H "Authorization: Bearer $t" -H "Content-type: application/json" \
  -d "{\"channel\":\"$CHANNEL\",\"thread_ts\":\"$THREAD_TS\",\"text\":<json-escaped draft>}" \
  https://slack.com/api/chat.postMessage
```

Note: the message is attributed to the Slack app, not the user's account.
