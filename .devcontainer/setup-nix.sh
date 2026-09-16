#!/usr/bin/env bash
# Install Nix (single-user) in the devcontainer and apply dotfiles via home-manager.
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v nix >/dev/null 2>&1; then
  # Single-user Nix needs a writable /nix
  if [ ! -w /nix ] && [ ! -d /nix ]; then
    sudo install -d -m 0755 /nix
    sudo chown "$(whoami)" /nix
  fi
  curl -L https://nixos.org/nix/install | sh -s -- --no-daemon
fi

# Load Nix environment (postCreateCommand shell does not source ~/.profile)
if [ -f "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then
  . "$HOME/.nix-profile/etc/profile.d/nix.sh"
fi
export NIX_CONFIG="extra-experimental-features = nix-command flakes"

# Apply dotfiles with the generic home-manager configuration.
# -b backs up conflicting files instead of failing.
nix run nixpkgs#home-manager -- switch -b .pre-hm-backup --flake "${DOTFILES_DIR}#default-x86_64-linux"

# Install agent skills (pi, etc.)
nix run "${DOTFILES_DIR}#install-agent-skills"

echo "Dotfiles setup complete."
