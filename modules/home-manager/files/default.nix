{
  system,
  lib,
  ...
}: let
  # The devcontainer (Linux) needs home-manager to own ~/.profile so that
  # hm-session-vars.sh (pi, opencode, nix on PATH) is sourced by login
  # shells. On darwin we keep the existing hand-maintained .profile.
  isDarwin = builtins.match ".*-darwin" system != null;
in {
  home.file =
    {
      ".vimrc".source = ../../../vimrc;
      ".config/nix/nix.conf".text = "extra-experimental-features = nix-command flakes\n";
      # jira-cli (ankitpokhrel/jira-cli) configuration. Credentials are kept out
      # of this repo: the API token is exported via ~/.envrc (direnv) as
      # JIRA_API_TOKEN.
      ".config/.jira/.config.yml".text = ''
        server: https://pyconjp.atlassian.net
        login: tkoyama010@gmail.com
        login-method: api-token
      '';
    }
    // lib.optionalAttrs isDarwin {
      ".profile".source = ../../../.profile;
    };
}
