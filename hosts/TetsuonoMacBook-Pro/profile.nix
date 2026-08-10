let
  isDarwin = builtins.match ".*-darwin" builtins.currentSystem != null;
in {
  username =
    if isDarwin
    then "tetsuokoyama"
    else "tetsuo-koyama";
  homeDirectory =
    if isDarwin
    then "/Users/tetsuokoyama"
    else "/home/tetsuo-koyama";
  gitName = "Tetsuo Koyama";
  gitEmail = "tkoyama010@gmail.com";
}
