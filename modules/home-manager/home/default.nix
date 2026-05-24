{ profile, ... }:
{
  home = {
    username = profile.username;
    homeDirectory = profile.homeDirectory;
    stateVersion = "24.05";
  };

  programs.home-manager.enable = true;
}
