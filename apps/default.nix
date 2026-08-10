{
  pkgs,
  self,
}: let
  host = "TetsuonoMacBook-Pro";
  configName = "${host}-${pkgs.system}";

  homeManagerSwitch = pkgs.writeShellApplication {
    name = "home-manager-switch";
    text = ''
      nix run nixpkgs#home-manager -- switch --flake "${self}#${configName}"
    '';
  };

  installClaudePlugins = pkgs.writeShellApplication {
    name = "install-claude-plugins";
    text = ''
      claude plugin marketplace add affaan-m/everything-claude-code
      claude plugin install everything-claude-code@everything-claude-code
      claude plugin install code-simplifier
    '';
  };

  claudeStatusline = pkgs.writeShellApplication {
    name = "claude-statusline";
    runtimeInputs = with pkgs; [jq];
    text = ''
      settings="$HOME/.claude/settings.json"
      local_settings="$HOME/.claude/settings.local.json"
      statusline_config='{"type":"command","command":"~/.claude/statusline.sh"}'
      if [ -f "$settings" ]; then
        jq --argjson sl "$statusline_config" '.statusLine = $sl' "$settings" > /tmp/claude-settings.json
        mv /tmp/claude-settings.json "$settings"
      fi
      jq --argjson sl "$statusline_config" '.statusLine = $sl' \
        "''${local_settings:-/dev/null}" > /tmp/claude-local.json 2>/dev/null || \
        echo "{\"statusLine\": $statusline_config}" > /tmp/claude-local.json
      mv /tmp/claude-local.json "$local_settings"
    '';
  };

  ruffSkill = pkgs.writeShellApplication {
    name = "ruff-skill";
    text = ''
      target_dir="''${1:?usage: nix run .#ruff-skill -- <target_dir>}"
      mkdir -p "$target_dir/.github/skills"
      ln -sf "$(pwd)/.claude/skills/ruff-lint" "$target_dir/.github/skills/ruff-lint"
      echo "ruff-lint skill linked to $target_dir"
    '';
  };

  opencode = pkgs.writeShellApplication {
    name = "opencode";
    text = ''
      src="$(pwd)/opencode"
      dest="$HOME/.config/opencode"
      mkdir -p "$dest"
      for entry in "$src"/*; do
        name=$(basename "$entry")
        target="$dest/$name"
        if [ -e "$target" ] && [ ! -L "$target" ]; then
          mv "$target" "$target.bak"
          echo "Backed up existing $name to $name.bak"
        fi
        ln -sf "$entry" "$target"
        echo "Linked $name"
      done
    '';
  };

  opencodeRtdSkills = pkgs.writeShellApplication {
    name = "opencode-rtd-skills";
    runtimeInputs = with pkgs; [git];
    text = ''
      skills_dest="$HOME/.config/opencode/skills"
      mkdir -p "$skills_dest"
      tmp=$(mktemp -d)
      trap 'rm -rf "$tmp"' EXIT
      git clone --depth 1 https://github.com/readthedocs/skills.git "$tmp"
      for skill_dir in "$tmp"/skills/*/; do
        if [ -f "$skill_dir/SKILL.md" ]; then
          name=$(basename "$skill_dir")
          rm -rf "$skills_dest/$name"
          cp -r "$skill_dir" "$skills_dest/$name"
          echo "Installed RTD skill: $name"
        fi
      done
    '';
  };

  ttydApp = pkgs.writeShellApplication {
    name = "ttyd-web";
    runtimeInputs = with pkgs; [ttyd bash];
    text = ''
      ttyd -i 127.0.0.1 -p 7681 -W bash
    '';
  };

  vimPlugins = pkgs.writeShellApplication {
    name = "vim-plugins";
    runtimeInputs = with pkgs; [git];
    text = ''
      dest_base="$HOME/.vim/pack/mypackage/start"
      mkdir -p "$dest_base"
      repos=(
        "git@github.com:EdenEast/nightfox.nvim"
        "git@github.com:PProvost/vim-ps1"
        "git@github.com:Shougo/dein.vim"
        "git@github.com:Shougo/deoplete.nvim"
        "git@github.com:Shougo/neocomplcache"
        "git@github.com:Shougo/neosnippet"
        "git@github.com:Shougo/neosnippet-snippets"
        "git@github.com:Shougo/unite.vim"
        "git@github.com:Shougo/vimfiler.vim"
        "git@github.com:Shougo/vimshell"
        "git@github.com:Xuyuanp/nerdtree-git-plugin"
        "git@github.com:Yggdroot/indentLine"
        "git@github.com:airblade/vim-gitgutter"
        "git@github.com:ctrlpvim/ctrlp.vim"
        "git@github.com:dracula/vim"
        "git@github.com:flazz/vim-colorschemes"
        "git@github.com:github/copilot.vim"
        "git@github.com:itchyny/lightline.vim"
        "git@github.com:jacoborus/tender.vim"
        "git@github.com:jpalardy/vim-slime"
        "git@github.com:majutsushi/tagbar"
        "git@github.com:nathanaelkane/vim-indent-guides"
        "git@github.com:nelstrom/vim-visual-star-search"
        "git@github.com:rickhowe/diffchar.vim"
        "git@github.com:sainnhe/edge"
        "git@github.com:scrooloose/nerdtree"
        "git@github.com:scrooloose/syntastic"
        "git@github.com:sudar/vim-arduino-syntax"
        "git@github.com:t9md/vim-textmanip"
        "git@github.com:tomasr/molokai"
        "git@github.com:tpope/vim-fugitive"
        "git@github.com:tyru/open-browser.vim"
        "git@github.com:ujihisa/unite-colorscheme"
        "git@github.com:vim-jp/vimdoc-ja"
        "git@github.com:vim-scripts/VimClojure"
        "git@github.com:vim-scripts/vcscommand.vim"
        "git@github.com:will133/vim-dirdiff"
      )
      for repo in "''${repos[@]}"; do
        name=$(basename "$repo" .nvim)
        dest="$dest_base/$name"
        if [ -d "$dest/.git" ]; then
          echo "Updating $name..."
          git -C "$dest" pull --ff-only || true
        else
          echo "Cloning $name..."
          git clone "$repo" "$dest"
        fi
      done
    '';
  };
in {
  home-manager = {
    type = "app";
    program = "${homeManagerSwitch}/bin/home-manager-switch";
  };
  install-claude-plugins = {
    type = "app";
    program = "${installClaudePlugins}/bin/install-claude-plugins";
  };
  claude-statusline = {
    type = "app";
    program = "${claudeStatusline}/bin/claude-statusline";
  };
  ruff-skill = {
    type = "app";
    program = "${ruffSkill}/bin/ruff-skill";
  };
  opencode = {
    type = "app";
    program = "${opencode}/bin/opencode";
  };
  opencode-rtd-skills = {
    type = "app";
    program = "${opencodeRtdSkills}/bin/opencode-rtd-skills";
  };
  ttyd = {
    type = "app";
    program = "${ttydApp}/bin/ttyd-web";
  };
  vim-plugins = {
    type = "app";
    program = "${vimPlugins}/bin/vim-plugins";
  };
}
