{
  profile,
  pkgs,
  ...
}: {
  home = {
    username = profile.username;
    homeDirectory = profile.homeDirectory;
    stateVersion = "24.05";
    packages = with pkgs; [
      awscli2
      terraform
      rtk
    ];
  };

  programs.home-manager.enable = true;
}
