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
  }: let
    system = "aarch64-darwin";
  in
    (flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        setupScript = pkgs.writeShellApplication {
          name = "dotfiles-setup";
          text = ''
            echo "Setting up dotfiles..."

            nix run nixpkgs#home-manager -- switch --flake "${self}#TetsuonoMacBook-Pro"

            echo "Dotfiles setup complete!"
            echo "Run 'nix flake show' to see available apps"
          '';
        };
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            git
            gh
            direnv
            uv
            nodejs_22
            curl
            alejandra
            opencode
          ];

          shellHook = ''
            echo "Development environment loaded"
            echo "Run 'nix flake show' to see available apps"
          '';
        };

        packages.setup = setupScript;
        packages.default = setupScript;

        apps =
          (import ./apps {inherit pkgs self;})
          // {
            setup = {
              type = "app";
              program = "${setupScript}/bin/dotfiles-setup";
            };
            default = self.outputs.apps.${system}.setup;
          };

        formatter = pkgs.alejandra;
      }
    ))
    // {
      homeConfigurations = {
        "TetsuonoMacBook-Pro" = home-manager.lib.homeManagerConfiguration {
          pkgs = nixpkgs.legacyPackages.${system};
          extraSpecialArgs = {
            inherit system;
            profile = import ./hosts/TetsuonoMacBook-Pro/profile.nix {inherit system;};
          };
          modules = [./modules/home-manager];
        };
      };
    };
}
