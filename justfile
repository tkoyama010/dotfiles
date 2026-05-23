default:
    @just --list

# Apply home-manager configuration
home-manager:
    nix run nixpkgs#home-manager -- switch --flake .#TetsuonoMacBook-Pro

# Install Claude Code plugins
install-claude-plugins:
    claude plugin marketplace add affaan-m/everything-claude-code
    claude plugin install everything-claude-code@everything-claude-code
    claude plugin install code-simplifier

# Configure Claude Code status line (run after home-manager)
claude-statusline:
    #!/usr/bin/env bash
    set -e
    settings=~/.claude/settings.json
    local_settings=~/.claude/settings.local.json
    statusline_config='{"type":"command","command":"~/.claude/statusline.sh"}'
    if [ -f "$settings" ]; then
        jq --argjson sl "$statusline_config" '.statusLine = $sl' "$settings" > /tmp/claude-settings.json
        mv /tmp/claude-settings.json "$settings"
    fi
    jq --argjson sl "$statusline_config" '.statusLine = $sl' \
        "${local_settings:-/dev/null}" > /tmp/claude-local.json 2>/dev/null || \
        echo "{\"statusLine\": $statusline_config}" > /tmp/claude-local.json
    mv /tmp/claude-local.json "$local_settings"

# Set up ruff-lint skill for a target repo
ruff-skill target_dir:
    mkdir -p "{{target_dir}}/.github/skills"
    ln -sf "$(pwd)/.claude/skills/ruff-lint" "{{target_dir}}/.github/skills/ruff-lint"
    @echo "ruff-lint skill linked to {{target_dir}}"

# Start ttyd web terminal
ttyd:
    ttyd -i 127.0.0.1 -p 7681 -W bash

# Install or update vim plugins
vim-plugins:
    #!/usr/bin/env bash
    set -e
    dest_base=~/.vim/pack/mypackage/start
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
    for repo in "${repos[@]}"; do
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
