{
  description = "tetsuo-koyama's dotfiles";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = inputs @ {
    self,
    nixpkgs,
    home-manager,
    flake-utils,
    ...
  }:
    (flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        setupScript = pkgs.writeShellScriptBin "dotfiles-setup" ''
          set -e

          echo "Setting up dotfiles..."

          ${pkgs.uv}/bin/uv python install 3.12
          ${pkgs.uv}/bin/uv python pin 3.12

          if [ -f "pyproject.toml" ]; then
            ${pkgs.uv}/bin/uv sync
          fi

          if [ -f "pyproject.toml" ] && [ -f "tasks.py" ]; then
            ${pkgs.uv}/bin/uv run invoke config
            ${pkgs.uv}/bin/uv run invoke vim-plugins
          fi

          echo "Dotfiles setup complete!"
          echo "Next: run 'nix run .#update-home-manager' to apply home-manager config"
        '';

        updateHomeManagerScript = pkgs.writeShellScript "update-home-manager" ''
          set -e
          HOST="TetsuonoMacBook-Pro"
          echo "Updating home-manager for host: $HOST..."
          nix run nixpkgs#home-manager -- switch --flake .#"$HOST" --show-trace
          echo "Home-manager update complete!"
        '';
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            git
            gh
            direnv
            uv
            nodejs_22
            curl
          ];

          shellHook = ''
            echo "Development environment loaded"
            echo "  - uv: $(uv --version)"
            echo "  - Node: $(node --version)"
            echo "Run 'nix run .#update-home-manager' to apply home-manager config"
          '';
        };

        packages.setup = setupScript;
        packages.default = setupScript;

        apps.setup = {
          type = "app";
          program = "${setupScript}/bin/dotfiles-setup";
        };
        apps.default = self.outputs.apps.${system}.setup;
        apps.update-home-manager = {
          type = "app";
          program = toString updateHomeManagerScript;
        };

        formatter = pkgs.alejandra;
      }
    )) // {
      homeConfigurations = {
        "TetsuonoMacBook-Pro" = home-manager.lib.homeManagerConfiguration {
          pkgs = nixpkgs.legacyPackages."aarch64-darwin";
          extraSpecialArgs = {
            profile = import ./hosts/TetsuonoMacBook-Pro/profile.nix;
          };
          modules = [./modules/home-manager];
        };
      };
    };
}
