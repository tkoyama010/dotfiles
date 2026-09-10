{ ... }:
{
  home.file = {
    ".vimrc".source = ../../../vimrc;
    ".profile".source = ../../../.profile;
    ".envrc".source = ../../../.envrc;
    ".config/nix/nix.conf".text = "extra-experimental-features = nix-command flakes\n";
  };
}
