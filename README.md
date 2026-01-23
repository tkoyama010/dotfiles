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
  - `settings.json.template`: Template for Claude Code settings with hooks and plugins.
  - `scripts/focus_window.scpt`: AppleScript for focusing VS Code windows.
  - `claude.png`: Notification icon for Claude Code alerts.
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

You can set up Claude Code configuration with the following command:

```bash
invoke claude-config
```

This will:
- Copy notification scripts and icon to `~/.claude/`
- Set up hooks for Stop and Notification events with terminal-notifier
- Configure window focus script for VS Code
- Merge settings into `~/.claude/settings.json` (preserving existing state)

The configuration includes:
- Japanese language setting
- Custom hooks for task completion and question notifications
- Window focus automation for better workflow
- Plugin configuration

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
