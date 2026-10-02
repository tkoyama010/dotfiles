# macOS-only host: returns null on other systems so no config is generated.
{system}:
if builtins.match ".*-darwin" system == null
then null
else {
  username = "tetsuo.koyama";
  homeDirectory = "/Users/tetsuo.koyama";
  gitName = "Tetsuo Koyama";
  gitEmail = "tkoyama010@gmail.com";
}
