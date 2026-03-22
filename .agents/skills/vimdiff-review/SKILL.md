---
name: vimdiff-review
description: |
  After completing the requested implementation, use byobu + vimdiff to let the user review diffs in a new terminal window.
---

This skill requests a code review from the user by opening vimdiff in a new byobu window.
The agent opens a new byobu window with vimdiff showing the relevant diff, then the user reviews interactively.

# Commands

Open a new byobu window with vimdiff to review diffs:

```bash
# Review the HEAD commit
byobu new-window -n "vimdiff-review" "cd <repo-dir> && git difftool -y -x 'vim -d --cmd \"let g:loaded_diffchar=1\"' HEAD~1; exec bash"

# Review staged changes before commit
byobu new-window -n "vimdiff-review" "cd <repo-dir> && git difftool -y -x 'vim -d --cmd \"let g:loaded_diffchar=1\"' --staged; exec bash"

# Review unstaged changes
byobu new-window -n "vimdiff-review" "cd <repo-dir> && git difftool -y -x 'vim -d --cmd \"let g:loaded_diffchar=1\"'; exec bash"

# Review all uncommitted changes
byobu new-window -n "vimdiff-review" "cd <repo-dir> && git difftool -y -x 'vim -d --cmd \"let g:loaded_diffchar=1\"' HEAD; exec bash"

# Compare with a branch
byobu new-window -n "vimdiff-review" "cd <repo-dir> && git difftool -y -x 'vim -d --cmd \"let g:loaded_diffchar=1\"' main; exec bash"
```

## Typical Workflow

1. Agent completes implementation and commits changes.
2. Agent runs: `byobu new-window -n "vimdiff-review" "cd <repo-dir> && git difftool -y -x 'vim -d --cmd \"let g:loaded_diffchar=1\"' HEAD~1; exec bash"`
3. User switches to the new byobu window to review diffs in vimdiff.
4. User closes vimdiff (`:qa`) and returns to the agent session.
5. User provides feedback or approves the changes.

## Notes

- Replace `<repo-dir>` with the actual repository path.
- The `-y` flag skips the "Launch vimdiff?" prompt for each file.
- `exec bash` keeps the window open after vimdiff exits.
- `--cmd "let g:loaded_diffchar=1"` disables the diffchar plugin while keeping the user's vimrc (colorscheme, line numbers, etc.).
- If byobu is not running, fall back to: `byobu new-session -d -s vimdiff-review "cd <repo-dir> && git difftool -y -x 'vim -d --cmd \"let g:loaded_diffchar=1\"' HEAD~1; exec bash"`

# Constraints

- Can only be used inside a Git-managed directory.
- Requires byobu (tmux) and vim to be installed.
- A byobu session must be running (or use new-session to create one).
