{ ... }:
{
  programs.direnv = {
    enable = true;
    enableZshIntegration = true;
    nix-direnv.enable = true;
  };

  programs.zsh = {
    enable = true;
    shellAliases = {
      ls = "lsd";
      leetcode = "$HOME/.cargo/bin/leetcode";
    };
    sessionVariables = {
      EDITOR = "vim";
    };
  };
}
