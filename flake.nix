{
  description = "tetsuo-koyama's dotfiles";

  outputs = inputs @ {
    self,
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        setupScript = pkgs.writeShellScriptBin "dotfiles-setup" ''
          set -e

          echo "🚀 Setting up dotfiles..."
          echo ""

          # Install uv if not available in PATH
          if ! command -v uv &> /dev/null; then
            echo "📦 Installing uv..."
            ${pkgs.uv}/bin/uv --version
          fi

          # Sync Python dependencies
          echo "📦 Installing Python dependencies..."
          ${pkgs.uv}/bin/uv sync

          # Run invoke tasks
          echo "⚙️  Running setup tasks..."
          ${pkgs.uv}/bin/uv run invoke config
          ${pkgs.uv}/bin/uv run invoke vim-plugins

          echo ""
          echo "✅ Dotfiles setup complete!"
          echo ""
          echo "💡 Next steps:"
          echo "  - Run 'direnv allow' to enable automatic environment loading"
          echo "  - Run 'uv run invoke --list' to see available tasks"
        '';
      in {
        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Version control
            git
            gh

            # Environment management
            direnv

            # Python tooling (use uv for packages)
            uv
            python312

            # Other development tools
            nodejs_22
            curl
          ];

          shellHook = ''
            echo "🚀 Development environment loaded"
            echo ""
            echo "📦 Available tools:"
            echo "  - Python: $(python --version)"
            echo "  - uv: $(uv --version)"
            echo "  - Node: $(node --version)"
            echo ""
            echo "💡 Use 'uv sync' to install Python packages from pyproject.toml"
          '';
        };

        # Packages that can be built
        packages.setup = setupScript;
        packages.default = setupScript;

        # Apps that can be run with 'nix run'
        apps.setup = {
          type = "app";
          program = "${setupScript}/bin/dotfiles-setup";
        };
        apps.default = self.outputs.apps.${system}.setup;

        # Formatter for the flake
        formatter = pkgs.alejandra;
      }
    );

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    flake-utils.url = "github:numtide/flake-utils";
  };
}
