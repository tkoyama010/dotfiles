{ profile, ... }:
{
  programs.git = {
    enable = true;
    settings.user = {
      name = profile.gitName;
      email = profile.gitEmail;
    };
  };
}
