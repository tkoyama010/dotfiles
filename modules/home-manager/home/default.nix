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
    packages = with pkgs;
      [
        awscli2
        gh
        terraform
        rtk
        vim
      ]
      ++ pkgs.lib.optionals isDarwin [istats];
  };

  programs.home-manager.enable = true;
}
