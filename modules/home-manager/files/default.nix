{ ... }:
{
  home.file = {
    ".vimrc".source = ../../../vimrc;
    ".config/nix/nix.conf".text = "extra-experimental-features = nix-command flakes\n";
  };
}
