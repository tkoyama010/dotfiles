{profile, pkgs, ...}: {
  nixpkgs.config.allowUnfree = true;

  home = {
    username = profile.username;
    homeDirectory = profile.homeDirectory;
    stateVersion = "24.05";
    packages = with pkgs; [
      awscli2
      terraform
    ];
  };

  programs.home-manager.enable = true;
}
