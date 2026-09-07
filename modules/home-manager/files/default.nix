{ ... }:
{
  home.file = {
    ".profile".source = ../../../.profile;
    ".config/nix/nix.conf".text = "extra-experimental-features = nix-command flakes\n";
  };
}
