{pkgs, ...}: {
  xdg.configFile."nvim/pack/hm/start/markdown-preview-nvim".source =
    pkgs.vimPlugins.markdown-preview-nvim;
}
