"""Tasks for automating setup."""

import contextlib
from pathlib import Path

from invoke import Context, task


@task
def config(c: Context) -> None:
    """Copy configuration files."""
    c.run("mkdir -p ~/.config/lsd")
    c.run("cp lsd/config.yaml ~/.config/lsd/config.yaml")
    c.run("cp vimrc ~/.vimrc")
    c.run("starship preset pastel-powerline -o ~/.config/starship.toml")
    c.run("brew install font-fira-code-nerd-font")
    c.run("echo Set 'FiraCode Nerd Font Mono' to Editor: Font Family to VSCode")


@task
def vim_plugins(c: Context) -> None:
    """Installs vim plugins."""
    c.run("mkdir -p ~/.vim/pack/mypackage/start/")
    with c.cd("~/.vim/pack/mypackage/start/"):
        repos = [
            "git@github.com:EdenEast/nightfox.nvim",
            "git@github.com:PProvost/vim-ps1",
            "git@github.com:Shougo/dein.vim",
            "git@github.com:Shougo/deoplete.nvim",
            "git@github.com:Shougo/neocomplcache",
            "git@github.com:Shougo/neosnippet",
            "git@github.com:Shougo/neosnippet-snippets",
            "git@github.com:Shougo/unite.vim",
            "git@github.com:Shougo/vimfiler.vim",
            "git@github.com:Shougo/vimshell",
            "git@github.com:Xuyuanp/nerdtree-git-plugin",
            "git@github.com:Yggdroot/indentLine",
            "git@github.com:airblade/vim-gitgutter",
            "git@github.com:ctrlpvim/ctrlp.vim",
            "git@github.com:dracula/vim",
            "git@github.com:flazz/vim-colorschemes",
            "git@github.com:github/copilot.vim",
            "git@github.com:itchyny/lightline.vim",
            "git@github.com:jacoborus/tender.vim",
            "git@github.com:jpalardy/vim-slime",
            "git@github.com:majutsushi/tagbar",
            "git@github.com:nathanaelkane/vim-indent-guides",
            "git@github.com:nelstrom/vim-visual-star-search",
            "git@github.com:rickhowe/diffchar.vim",
            "git@github.com:sainnhe/edge",
            "git@github.com:scrooloose/nerdtree",
            "git@github.com:scrooloose/syntastic",
            "git@github.com:sudar/vim-arduino-syntax",
            "git@github.com:t9md/vim-textmanip",
            "git@github.com:tomasr/molokai",
            "git@github.com:tpope/vim-fugitive",
            "git@github.com:tyru/open-browser.vim",
            "git@github.com:ujihisa/unite-colorscheme",
            "git@github.com:vim-jp/vimdoc-ja",
            "git@github.com:vim-scripts/VimClojure",
            "git@github.com:vim-scripts/vcscommand.vim",
            "git@github.com:will133/vim-dirdiff",
        ]
        for repo in repos:
            dirname = Path(repo).name.replace(".nvim", "")  # remove .nvim from dirname
            dest_dir = Path("~/.vim/pack/mypackage/start/") / dirname
            dest_dir = dest_dir.expanduser()
            if dest_dir.exists():
                if (dest_dir / ".git").exists():
                    with contextlib.suppress(Exception):
                        c.run(f"cd {dest_dir} && git pull && cd ..")
                else:
                    pass
            else:
                c.run(f"git clone {repo} {dest_dir}")


@task
def shell_aliases(c: Context) -> None:
    """Set shell aliases."""
    c.run(
        "echo 'eval \"$$(/Users/tetsuo.koyama/.cargo/bin/starship init bash)\"' >> "
        "~/.bashrc",
    )
    c.run("echo 'alias ls=\"lsd\"' >> ~/.bashrc")
    c.run("echo 'alias cat=\"/Users/tetsuo.koyama/.cargo/bin/bat\"' >> ~/.bashrc")
    c.run("echo 'eval \"$$(starship init zsh)\"' >> ~/.zshrc")
    c.run("echo 'eval \"$$(direnv hook zsh)\"' >> ~/.zshrc")
    c.run("echo 'export EDITOR=vim' >> ~/.zshrc")
    c.run("echo 'alias leetcode=\"$(HOME)/.cargo/bin/leetcode\"' >> ~/.zshrc")


@task
def yazi(c: Context) -> None:
    """Install yazi."""
    c.run("mkdir -p ~/.config/yazi")
    c.run("brew install yazi ffmpeg sevenzip jq poppler fd ripgrep fzf zoxide imagemagick font-symbols-only-nerd-font")


@task(default=True)
def all_tasks(c: Context) -> None:
    """Run all tasks."""
    config(c)
    vim_plugins(c)
    shell_aliases(c)
