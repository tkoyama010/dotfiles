{pkgs, ...}: {
  home.packages = [pkgs.neovim];

  xdg.configFile = {
    "nvim/init.lua".source = ../../../nvim/init.lua;
    "nvim/pack/hm/start/markdown-preview-nvim".source =
      pkgs.vimPlugins.markdown-preview-nvim;
    "nvim/pack/hm/start/edge".source =
      pkgs.vimPlugins.edge;
  };
}
