{...}: {
  home.file = {
    ".vimrc".source = ../../../vimrc;
    ".profile".source = ../../../.profile;
    ".config/nix/nix.conf".text = "extra-experimental-features = nix-command flakes\n";
    # jira-cli (ankitpokhrel/jira-cli) configuration. Credentials are kept out
    # of this repo: the API token is exported via ~/.envrc (direnv) as
    # JIRA_API_TOKEN.
    ".config/.jira/.config.yml".text = ''
      server: https://pyconjp.atlassian.net
      login: tkoyama010@gmail.com
      login-method: api-token
    '';
  };
}
