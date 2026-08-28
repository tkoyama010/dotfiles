{lib, ...}: {
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
      CAVEMAN_DEFAULT_MODE = "full";
    };
    # These must live in .zshrc rather than home.sessionPath: session
    # variables are sourced from .zshenv, which runs before /etc/zprofile,
    # and /etc/zprofile runs path_helper -- which rebuilds PATH with the
    # /etc/paths entries in front and demotes anything inherited. .zshrc
    # runs after /etc/zprofile, so prepends here survive.
    initContent = lib.mkAfter ''
      export PATH="$HOME/.pixi/bin:$PATH"
      export PATH="$HOME/.local/bin:$PATH"
      # Nothing in /etc/zshrc, /etc/zprofile or /etc/paths.d puts nix on
      # PATH on this machine, so without this nix itself and everything in
      # ~/.nix-profile/bin disappear from login shells.
      if [ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]; then
        . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
      fi
    '';
  };
}
