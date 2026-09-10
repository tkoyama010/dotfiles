{ ... }:
{
  home.file = {
    ".vimrc".source = ../../../vimrc;
    ".profile".source = ../../../.profile;
    ".config/nix/nix.conf".text = "extra-experimental-features = nix-command flakes\n";
  };
}
