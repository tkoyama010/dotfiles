# dotfiles

[![Built with Nix](https://img.shields.io/badge/built%20with-Nix-5277C3?logo=nixos&logoColor=white)](https://nixos.org)
[![Nix Flakes](https://img.shields.io/badge/flakes-enabled-blue)](https://nixos.wiki/wiki/Flakes)

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nix,vim,py,git,bash,linux,aws,terraform,fastapi,fortran,github,githubactions,latex,md,notion,npm,react,svg,sklearn,ts,rust,ubuntu" alt="My Skills" />
  </a>
</p>

## Overview

This repository is for managing personal configuration files. It includes settings to streamline development and work in a Linux environment. All tasks and configuration are managed with [Nix Flakes](https://nixos.wiki/wiki/Flakes) and [home-manager](https://nix-community.github.io/home-manager/) — there is no `justfile` or `invoke` task runner.

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

If Nix flakes are not enabled yet, this fails with
`error: experimental Nix feature 'nix-command' is disabled`. Either enable them
once (see [Using Nix Flakes (Development)](#using-nix-flakes-development) step 2)
or pass the flags inline:

```bash
nix --extra-experimental-features 'nix-command flakes' run github:tkoyama010/dotfiles
```

This applies the home-manager configuration for the current system (e.g. `TetsuonoMacBook-Pro-aarch64-darwin` on macOS, `TetsuonoMacBook-Pro-x86_64-linux` on Linux), which deploys all tracked config files (vimrc, `.profile`, `nix.conf`, starship, opencode, Claude status line, Copilot, byobu, aider, git) via Nix-managed symlinks. If existing real files conflict, they are automatically backed up with a `.backup` suffix before linking.

### Using Nix Flakes (Development)

1. Clone the repository:

   ```bash
   git clone https://github.com/tkoyama010/dotfiles.git
   cd dotfiles
   ```

2. Enable Nix flakes (if not already enabled):

   ```bash
   mkdir -p ~/.config/nix
   echo "extra-experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
   ```

   Only needed for the first run: after the setup below, home-manager manages
   `~/.config/nix/nix.conf` and keeps this setting in place.

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

## Key Contents

- `vimrc`: Configuration file for Vim.
- `lsd/config.yaml`: Configuration for the LSD command.
- `zellij/config.kdl`: Configuration for the Zellij terminal manager.
- `copilot/config.json`: Configuration for GitHub Copilot CLI.
- `.claude/`: Configuration for Claude Code CLI.
  - `statusline.sh`: Custom status line script showing model, token usage, git info.
  - `settings.local.json.template`: Template for local settings with statusLine configuration.
- `.claude/skills/ruff-lint/`: Ruff linting skill for GitHub Copilot CLI and Claude Code.
- `opencode/`: Configuration for [OpenCode](https://opencode.ai) CLI.
  - `opencode.jsonc`: Main config (provider, MCP, plugins, GLM-5.2 image input).
  - `caveman.json`: Config for [caveman-opencode-plugin](https://www.npmjs.com/package/caveman-opencode-plugin) (npm).
  - `plugins/rtk.ts`: Custom local plugin (RTK command rewriting).
  - Plugins installed from npm: `@dietrichgebert/ponytail`, `caveman-opencode-plugin`.
- `apps/`: Nix flake apps — the task runner, replacing the former `justfile`. Run any task with `nix run .#<name>`.

## Available Nix Apps

All tasks are exposed as Nix flake apps. Run them with `nix run .#<name>` (or `nix run github:tkoyama010/dotfiles#<name>`):

| App                      | Description                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `home-manager`           | Apply the home-manager configuration                                                           |
| `setup` (default)        | Same as `home-manager`, the `nix run .` default                                                |
| `install-claude-plugins` | Install Claude Code plugins (everything-claude-code, code-simplifier)                          |
| `claude-statusline`      | Configure the Claude Code custom status line                                                   |
| `ruff-skill`             | Symlink the ruff-lint skill into a target project (`nix run .#ruff-skill -- /path/to/project`) |
| `opencode`               | Migrate existing opencode config: back up real files, then symlink tracked config              |
| `opencode-rtd-skills`    | Install the latest Read the Docs skills for opencode                                           |
| `vim-plugins`            | Install or update Vim plugins                                                                  |
| `ttyd`                   | Start a ttyd web terminal on `127.0.0.1:7681`                                                  |

## Usage Example

You can install Vim plugins with the following command:

```bash
nix run .#vim-plugins
```

You can set up Claude Code custom status line with the following command:

```bash
nix run .#claude-statusline
```

This will:

- Copy `statusline.sh` to `~/.claude/statusline.sh` with executable permissions
- Update `~/.claude/settings.json` to use the custom status line
- Merge statusLine configuration into `~/.claude/settings.local.json` (preserving existing settings)

The status line displays:

- Model name (e.g., "Claude Sonnet 4.5")
- Token usage with visual progress bar (max 155k tokens)
- Current directory and git branch/commit info

You can install Claude Code plugins with the following command:

```bash
nix run .#install-claude-plugins
```

This installs both the `everything-claude-code` (comprehensive feature set) and `code-simplifier` plugins.

The code-simplifier plugin provides:

- Code simplification and refactoring suggestions
- Complexity reduction recommendations
- Readability improvements
- Pattern extraction and abstraction

You can install the Ruff linting skill to any project repository:

```bash
# From anywhere (path is passed after `--`)
nix run github:tkoyama010/dotfiles#ruff-skill -- /path/to/your/project

# From the dotfiles directory
nix run .#ruff-skill -- ~/my-python-project
```

This creates a symlink `.github/skills/ruff-lint/` in the target project, making the skill available via `/skill ruff-lint` in both GitHub Copilot CLI and Claude Code.

You can start a web terminal in the browser with the following command:

```bash
nix run .#ttyd
```

This starts [ttyd](https://github.com/tsl0922/ttyd) on `127.0.0.1:7681` running
`bash`, with client write access enabled (`-W`) and the FiraCode Nerd Font Mono
font. Open <http://127.0.0.1:7681> to use it. It listens on loopback only, so it
is not reachable from other machines. Stop it with `Ctrl-C`.

**Note**: Authentication tokens are NOT stored in this repository for security reasons.

## opencode

The [OpenCode](https://opencode.ai) configuration is deployed by home-manager. Running `nix run .#home-manager` symlinks the tracked config files from `opencode/` into `~/.config/opencode/`:

- `opencode.jsonc`, `caveman.json`, `plugins/rtk.ts`
- npm plugins (`@dietrichgebert/ponytail`, `caveman-opencode-plugin`) are installed automatically by opencode on startup

If you have existing **real files** (not symlinks) in `~/.config/opencode/`, home-manager will refuse to overwrite them. Run the one-time migration helper first, which backs up each conflicting file with a `.bak` suffix and replaces it with a symlink:

```bash
nix run .#opencode
nix run .#home-manager
```

Untracked items (`node_modules/`, `package.json`, lockfiles) are left untouched.

You can install the Read the Docs skills for opencode separately:

```bash
nix run .#opencode-rtd-skills
```

## License

This repository is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
