{
  profile,
  pkgs,
  system,
  ...
}: let
  isDarwin = builtins.match ".*-darwin" system != null;
  isLinux = builtins.match ".*-linux" system != null;
in {
  home = {
    username = profile.username;
    homeDirectory = profile.homeDirectory;
    stateVersion = "24.05";
    packages = with pkgs;
      [
        awscli2
        postgresql
        devcontainer
        gh
        lsd
        jira-cli-go
        rclone
        terraform
        rtk
        pi-coding-agent
        herdr
        vim
        ssm-session-manager-plugin
      ]
      ++ pkgs.lib.optionals isDarwin [ruby istats colima docker-client]
      # opencode CLI: needed by the devcontainer (PI_PROVIDER=opencode);
      # on darwin it is provided by the dev shell instead.
      ++ pkgs.lib.optionals isLinux [opencode];
  };

  programs.home-manager.enable = true;
}
