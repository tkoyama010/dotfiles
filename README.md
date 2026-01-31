# dotfiles

## Overview

This repository is for managing personal configuration files. It includes settings to streamline development and work in a Linux environment.

## Setup Instructions

### Prerequisites

Install Nix package manager if you haven't already:

**Official installer (recommended):**
```bash
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

Or use the official Nix installer:
```bash
sh <(curl -L https://nixos.org/nix/install) --daemon
```

For more details, see:
- **Determinate Systems Nix Installer**: https://github.com/DeterminateSystems/nix-installer
- **Official Nix Installation Guide**: https://nixos.org/download.html

### Quick Install (Nix Flakes)

Install directly from GitHub repository:

```bash
nix run github:tkoyama010/dotfiles
```

This will:
- Install Python 3.12 via uv
- Install Python dependencies with uv
- Copy configuration files
- Install Vim plugins

You can change the Python version:

```bash
# Install a different Python version
uv python install 3.11
uv python pin 3.11
```

### Using Nix Flakes (Development)

1. Clone the repository:

   ```bash
   git clone https://github.com/tkoyama010/dotfiles.git
   cd dotfiles
   ```

2. Enable Nix flakes (if not already enabled):

   ```bash
   mkdir -p ~/.config/nix
   echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
   ```

3. Run setup:

   ```bash
   nix run .#setup
   ```

   Or enter the development environment:

   ```bash
   nix develop
   ```

   Or use direnv for automatic environment activation:

   ```bash
   direnv allow
   ```

4. Install Python and dependencies:

   ```bash
   # Install Python (uv manages Python versions)
   uv python install 3.12
   uv python pin 3.12

   # Install Python packages
   uv sync
   ```

   To use a different Python version:

   ```bash
   uv python install 3.11  # or 3.13, etc.
   uv python pin 3.11
   uv sync
   ```

### Traditional Setup

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

You can install Claude Code plugins with the following commands:

```bash
# Install everything-claude-code plugin (comprehensive feature set)
invoke claude-code-plugin

# Install code-simplifier plugin (code refactoring and complexity reduction)
invoke claude-code-simplifier-plugin
```

The code-simplifier plugin provides:

- Code simplification and refactoring suggestions
- Complexity reduction recommendations
- Readability improvements
- Pattern extraction and abstraction

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
