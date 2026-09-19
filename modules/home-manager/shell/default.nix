{
  system,
  lib,
  ...
}: {
  # The devcontainer (Linux) needs home-manager to own ~/.profile so that
  # hm-session-vars.sh (pi, opencode, nix on PATH) is sourced by login
  # shells. On darwin the hand-maintained .profile from the files module
  # wins, so home-manager's bash profile must stay off there.
  programs.bash = lib.mkIf (builtins.match ".*-linux" system != null) {
    enable = true;
    profileExtra = ''
      # Single-user Nix is not on PATH by default on the devcontainer image.
      if [ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then
        . "$HOME/.nix-profile/etc/profile.d/nix.sh"
      fi
      export PATH="$HOME/.nix-profile/bin:$PATH"
    '';
  };

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
    # Volta stays in .zshenv rather than .zshrc on purpose. path_helper in
    # /etc/zprofile demotes anything .zshenv prepends, which currently leaves
    # ~/.volta/bin at roughly position 15 -- behind homebrew. Moving it to
    # initContent would promote it ahead of homebrew and silently change which
    # node and npm a login shell resolves.
    envExtra = ''
      export VOLTA_HOME="$HOME/.volta"
      export PATH="$VOLTA_HOME/bin:$PATH"
    '';
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
      # Put the home-manager profile ahead of /opt/homebrew/bin and /usr/bin so
      # nix-installed tools actually win. nix-daemon.sh will not do this on its
      # own: it is guarded and skips when nix is already in the environment,
      # which left ~/.nix-profile/bin at position 54. Done last so it takes
      # effect whatever the block above decides.
      export PATH="$HOME/.nix-profile/bin:$PATH"
    '';
  };
}
