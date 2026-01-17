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
- `.github/skills/ruff-lint/`: Ruff linting skill for GitHub Copilot CLI.
- `CLAUDE.md`: Custom instructions for Claude Code with Ruff standards.
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

You can install Ruff linting skill to your home directory with the following command:

```bash
invoke ruff-skill
```

This will create symlinks:
- `~/.copilot/skills/ruff-lint/` → dotfiles (for GitHub Copilot CLI)
- `~/CLAUDE.md` → dotfiles (for Claude Code)

Making the Ruff linting standards available globally across all projects in both Copilot CLI and Claude Code.

**Note**: Authentication tokens are NOT stored in this repository for security reasons.

## License

This repository is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
