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

          nix run nixpkgs#home-manager -- switch --flake .#TetsuonoMacBook-Pro

          echo "Dotfiles setup complete!"
          echo "Run 'just --list' to see available tasks"
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
            just
            uv
            nodejs_22
            curl
          ];

          shellHook = ''
            echo "Development environment loaded"
            echo "Run 'just --list' to see available tasks"
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
