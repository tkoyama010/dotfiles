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
      in {
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

        # Formatter for the flake
        formatter = pkgs.alejandra;
      }
    );

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    flake-utils.url = "github:numtide/flake-utils";
  };
}
