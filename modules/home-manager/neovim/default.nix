{pkgs, ...}: {
  xdg.configFile = {
    "nvim/init.vim".source = ../../../nvim/init.vim;
    "nvim/pack/hm/start/markdown-preview-nvim".source =
      pkgs.vimPlugins.markdown-preview-nvim;
    "nvim/pack/hm/start/edge".source =
      pkgs.vimPlugins.edge;
  };
}
