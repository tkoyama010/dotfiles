{ profile, ... }:
{
  programs.git = {
    enable = true;
    userName = profile.gitName;
    userEmail = profile.gitEmail;
  };
}
