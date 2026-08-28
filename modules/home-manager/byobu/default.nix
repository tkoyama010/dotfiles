{pkgs, ...}: {
  # tmux is byobu's backend and is not propagated by the byobu package, so it
  # has to be installed alongside it -- without it byobu-status fails with
  # "tmux: command not found".
  home.packages = with pkgs; [byobu tmux];

  home.file.".byobu/.tmux.conf".source = ../../../byobu/.byobu/.tmux.conf;
}
