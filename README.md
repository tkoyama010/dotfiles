# dotfiles

## Overview

This repository is for managing personal configuration files. It includes settings to streamline development and work in a Linux environment.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/tkoyama010/dotfiles.git
   cd dotfiles
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Apply the configurations using `tasks.py`:
   ```bash
   invoke all-tasks
   ```

## Key Contents

- `vimrc`: Configuration file for Vim.
- `starship.toml`: Configuration for the Starship prompt.
- `lsd/config.yaml`: Configuration for the LSD command.
- `zellij/config.kdl`: Configuration for the Zellij terminal manager.
- `copilot/config.json`: Configuration for GitHub Copilot CLI.
- `.claude/`: Configuration for Claude Code CLI.
  - `statusline.sh`: Custom status line script showing model, token usage, git info.
  - `settings.local.json.template`: Template for local settings with statusLine configuration.
- `.github/skills/ruff-lint/`: Ruff linting skill for GitHub Copilot CLI and Claude Code.
- `tasks.py`: Script to automate various setup tasks.

## Usage Example

You can install Vim plugins with the following command:

```bash
invoke vim-plugins
```

You can set up GitHub Copilot CLI configuration with the following command:

```bash
invoke copilot-cli
```

You can set up Claude Code custom status line with the following command:

```bash
invoke claude-statusline
```

This will:

- Copy `statusline.sh` to `~/.claude/statusline.sh` with executable permissions
- Update `~/.claude/settings.json` to use the custom status line
- Merge statusLine configuration into `~/.claude/settings.local.json` (preserving existing settings)

The status line displays:

- Model name (e.g., "Claude Sonnet 4.5")
- Token usage with visual progress bar (max 155k tokens)
- Current directory and git branch/commit info

You can install the Ruff linting skill to any project repository:

```bash
# From anywhere
invoke ruff-skill --target-dir ~/repository
invoke ruff-skill -t /path/to/your/project

# From dotfiles directory
cd ~/dotfiles
invoke ruff-skill --target-dir ~/my-python-project
```

This creates a symlink `.github/skills/ruff-lint/` in the target project, making the skill available via `/skill ruff-lint` in both GitHub Copilot CLI and Claude Code.

**Note**: Authentication tokens are NOT stored in this repository for security reasons.

## License

This repository is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
