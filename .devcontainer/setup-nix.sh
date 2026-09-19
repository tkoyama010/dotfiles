#!/usr/bin/env bash
# Install Nix (single-user) in the devcontainer and apply dotfiles via home-manager.
#
# Usage:
#   setup-nix.sh install — heavy work (Nix install + home-manager switch). Runs as
#                          onCreateCommand so prebuilds bake it into the image.
#   setup-nix.sh post    — light work (agent skills + markers). Runs as
#                          postCreateCommand on every Codespace creation.
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-install}"

# Mirror all output to a log so `codespace-ssh` waiters can stream progress.
exec > >(tee -a /tmp/setup-nix.log) 2>&1

# Marker files for `codespace-ssh` to detect completion or failure.
rm -f /tmp/setup-nix.done /tmp/setup-nix.failed
trap 'touch /tmp/setup-nix.failed' ERR

install_nix_and_apply_dotfiles() {
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
}

if [ "$MODE" = "install" ]; then
	install_nix_and_apply_dotfiles
	exit 0
fi

# post mode: install agent skills (pi, etc.)
if [ ! -x "$HOME/.nix-profile/bin/nix" ]; then
	# No prebuild was used: fall back to the full setup.
	echo "Nix not found (no prebuild was used); running full setup."
	install_nix_and_apply_dotfiles
fi
export NIX_CONFIG="extra-experimental-features = nix-command flakes"
nix run "${DOTFILES_DIR}#install-agent-skills"

touch /tmp/setup-nix.done
echo "Dotfiles setup complete."
