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
    host = "TetsuonoMacBook-Pro";
    # Nixpkgs 26.11 dropped x86_64-darwin, so it is excluded here.
    systems = [
      "aarch64-darwin"
      "aarch64-linux"
      "x86_64-linux"
    ];
    mkHomeConfig = system:
      home-manager.lib.homeManagerConfiguration {
        pkgs = nixpkgs.legacyPackages.${system};
        extraSpecialArgs = {
          inherit system;
          profile = import ./hosts/${host}/profile.nix {inherit system;};
        };
        modules = [
          {
            nixpkgs.config.allowUnfree = true;
          }
          ./modules/home-manager
        ];
      };
  in
    (flake-utils.lib.eachSystem systems (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        setupScript = pkgs.writeShellApplication {
          name = "dotfiles-setup";
          text = ''
            echo "Setting up dotfiles..."

            export NIX_CONFIG="extra-experimental-features = nix-command flakes"
            nix run --refresh nixpkgs#home-manager -- switch -b backup --flake "${self}#${host}-${system}"

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
      homeConfigurations =
        builtins.listToAttrs
        (map (system: {
            name = "${host}-${system}";
            value = mkHomeConfig system;
          })
          systems);
    };
}
