{
  profile,
  pkgs,
  system,
  ...
}: let
  isDarwin = builtins.match ".*-darwin" system != null;
in {
  home = {
    username = profile.username;
    homeDirectory = profile.homeDirectory;
    stateVersion = "24.05";
    backupFileExtension = "hm-back";
    packages = with pkgs;
      [
        awscli2
        gh
        terraform
        rtk
        vim
      ]
      ++ pkgs.lib.optionals isDarwin [ruby istats];
  };

  programs.home-manager.enable = true;

  home.sessionVariables = {
    PI_MODEL = "qwen3.6-plus";
    PI_CODING_AGENT = "true";
  };
}
