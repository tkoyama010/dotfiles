{ config, lib, profile, ... }:
{
  home.file.".local/share/git/hooks/pre-push" = {
    source = ./pre-push;
    executable = true;
  };

  programs.git = {
    enable = true;
    settings = {
      user = {
        name = profile.gitName;
        email = profile.gitEmail;
      };
      core.hooksPath = "${config.home.homeDirectory}/.local/share/git/hooks";
    };
  };
}
