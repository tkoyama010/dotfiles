{system}: let
  isDarwin = builtins.match ".*-darwin" system != null;
in {
  username =
    if isDarwin
    then "tetsuo.koyama"
    else "tetsuo-koyama";
  homeDirectory =
    if isDarwin
    then "/Users/tetsuo.koyama"
    else "/home/tetsuo-koyama";
  gitName = "Tetsuo Koyama";
  gitEmail = "tkoyama010@gmail.com";
}
