---
name: sub-issue-create
description: |
  Create a GitHub sub-issue linked to a parent issue via the GraphQL addSubIssue
  mutation. Reads the parent issue and ADR (if referenced), follows the repo's
  issue template format, creates the issue with appropriate labels, and links it
  as a sub-issue using the GitHub GraphQL API.
  Use when user says "create sub-issue of #N", "create sub-issue following ADR",
  "create child issue", "split issue into sub-issues", or "link issue to parent".
---

# Sub-Issue Creation

Create a GitHub sub-issue linked to a parent issue, following the repo's issue template and linking via the GraphQL `addSubIssue` mutation.

## Workflow

### 1. Read the parent issue

```bash
gh issue view <PARENT_NUMBER> --json title,body,number,labels
```

Or via the API (if `gh issue view` has GraphQL deprecation issues):

```bash
gh api repos/:owner/:repo/issues/<PARENT_NUMBER> --jq '{title: .title, body: .body, number: .number, labels: [.labels[].name]}'
```

Check for existing sub-issues to avoid duplication:

```bash
gh api graphql -f query='query($owner:String!, $repo:String!) {
  repository(owner:$owner, name:$repo) {
    issue(number: <PARENT_NUMBER>) {
      title
      subIssues(first: 20) {
        nodes { number title state }
      }
    }
  }
}' -F owner=<owner> -F repo=<repo>
```

### 2. Read the referenced ADR (if applicable)

If the user references an ADR (e.g. "follow ADR007"), find and read the ADR file:

```bash
ls docs/decisions/
```

Read the ADR to understand the decision and its confirmation/acceptance criteria. The sub-issue should cover **implementing** the ADR's decision, not re-deciding it.

### 3. Read the issue template

```bash
ls .github/ISSUE_TEMPLATE/
```

Read the relevant template (e.g. `user_story.yml`, `feature_request.yml`) and follow its structure for the issue body. Common sections:

- `## User Story` — As a... I want... So that...
- `## Acceptance Criteria` — numbered list of verifiable criteria
- `## Related Issue` — link to parent issue

Write the issue body to a temp file:

```bash
cat > /tmp/opencode/sub-issue-body.md << 'EOF'
## User Story

As a ... I want ... so that ...

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Related Issue

Sub-issue of #<PARENT_NUMBER>
EOF
```

### 4. Create the issue

Use the same label as the parent issue (e.g. `user story`, `documentation`):

```bash
gh issue create \
  --title "Implement <X> per <ADR-name>" \
  --body-file /tmp/opencode/sub-issue-body.md \
  --label "user story"
```

Note the created issue number (e.g. `#455`).

### 5. Link as sub-issue via GraphQL

This is the step that is easy to forget — `gh issue create` does NOT automatically link sub-issues. You must use the GraphQL `addSubIssue` mutation.

First, get the node IDs of both parent and child issues:

```bash
PARENT_ID=$(gh api graphql -f query='query($owner:String!,$repo:String!){
  repository(owner:$owner,name:$repo){
    issue(number: <PARENT_NUMBER>){ id }
  }
}' -F owner=<owner> -F repo=<repo> --jq '.data.repository.issue.id')

CHILD_ID=$(gh api graphql -f query='query($owner:String!,$repo:String!){
  repository(owner:$owner,name:$repo){
    issue(number: <CHILD_NUMBER>){ id }
  }
}' -F owner=<owner> -F repo=<repo> --jq '.data.repository.issue.id')
```

Then link them:

```bash
gh api graphql -f query="mutation(\$parentId:ID!,\$subIssueId:ID!){
  addSubIssue(input:{issueId:\$parentId,subIssueId:\$subIssueId}){
    subIssue { number title }
    issue { number title }
  }
}" -f parentId="$PARENT_ID" -f subIssueId="$CHILD_ID"
```

### 6. Verify the link

```bash
gh api graphql -f query='query($owner:String!,$repo:String!){
  repository(owner:$owner,name:$repo){
    issue(number: <PARENT_NUMBER>){
      subIssues(first: 20){
        nodes { number title state }
      }
    }
  }
}' -F owner=<owner> -F repo=<repo>
```

The new sub-issue should appear in the list.

## Constraints

- Requires `gh` CLI authenticated with issue creation + GraphQL access on the repo.
- The GraphQL `addSubIssue` mutation requires the `issues: write` permission.
- Always check for existing sub-issues before creating a new one — avoid duplicates.
- Match the parent issue's label conventions.
- If the ADR is in `accepted` status, the sub-issue should be about implementation, not re-decision.
- Clean up temp files: `rm /tmp/opencode/sub-issue-body.md`.
