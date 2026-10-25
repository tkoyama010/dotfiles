{
  lib,
  pkgs,
  profile,
  ...
}: let
  enabled = profile.openclaw or false;
in {
  # Opt-in: only hosts whose profile sets `openclaw = true;` get the CLI.
  # nixpkgs marks openclaw insecure (prompt injection with full system
  # access), so opting in also accepts that risk for this package only.
  # The gateway daemon is not installed here; run `openclaw onboard` manually.
  nixpkgs.config = lib.mkIf enabled {
    allowInsecurePredicate = p: lib.getName p == "openclaw";
  };

  home.packages = lib.mkIf enabled [pkgs.openclaw];
}
