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
    mkHomeConfig = system: profile:
      home-manager.lib.homeManagerConfiguration {
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            (self: super: {
              istats = super.callPackage ./pkgs/istats {};
            })
          ];
        };
        extraSpecialArgs = {
          inherit system;
          profile = profile;
        };
        modules = [
          {
            nixpkgs.config.allowUnfree = true;
          }
          ./modules/home-manager
        ];
      };
    makeProfile = system: {
      username = builtins.getEnv "USER";
      homeDirectory = if builtins.match ".*-darwin" system != null
        then "/Users/${builtins.getEnv "USER"}"
        else "/home/${builtins.getEnv "USER"}";
    };
  in
    (flake-utils.lib.eachSystem systems (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        # Generic profile: auto-detect username and home directory
        genericProfile = {
          username = builtins.getEnv "USER";
          homeDirectory = if builtins.match ".*-darwin" system != null
            then "/Users/${builtins.getEnv "USER"}"
            else "/home/${builtins.getEnv "USER"}";
        };

        # Host-specific profile
        hostProfile = import ./hosts/${host}/profile.nix {inherit system;};

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

        installScript = pkgs.writeShellApplication {
          name = "dotfiles-install";
          runtimeInputs = [ pkgs.git ];
          text = ''
            echo "Installing dotfiles via home-manager..."

            REPO_DIR=$(mktemp -d)
            git clone https://github.com/tkoyama010/dotfiles.git "$REPO_DIR" 2>/dev/null || true

            export NIX_CONFIG="extra-experimental-features = nix-command flakes"
            nix run --refresh nixpkgs#home-manager -- switch -b backup --flake "$REPO_DIR#default"

            rm -rf "$REPO_DIR"
            echo "Installation complete!"
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
        packages.install = installScript;
        packages.istats = pkgs.callPackage ./pkgs/istats {};

        apps =
          (import ./apps {inherit pkgs self;})
          // {
            setup = {
              type = "app";
              program = "${setupScript}/bin/dotfiles-setup";
            };
            install = {
              type = "app";
              program = "${installScript}/bin/dotfiles-install";
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
            value = mkHomeConfig system (import ./hosts/${host}/profile.nix {inherit system;});
          })
          systems)
        // builtins.listToAttrs
        (map (system: {
            name = "default-${system}";
            value = mkHomeConfig system (makeProfile system);
          })
          systems);
    };
}
