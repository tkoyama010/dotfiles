from invoke import task
import os

@task
def config(c):
    c.run('mkdir -p ~/.config/lsd')
    c.run('cp lsd/config.yaml ~/.config/lsd/config.yaml')
    c.run('cp starship.toml ~/.config/starship.toml')
    c.run('cp vimrc ~/.vimrc')

@task
def vim_plugins(c):
    c.run('mkdir -p ~/.vim/pack/mypackage/start/')
    with c.cd('~/.vim/pack/mypackage/start/'):
        repos = [
            'git@github.com:EdenEast/nightfox.nvim',
            'git@github.com:PProvost/vim-ps1',
            'git@github.com:Shougo/dein.vim',
            'git@github.com:Shougo/deoplete.nvim',
            'git@github.com:Shougo/neocomplcache',
            'git@github.com:Shougo/neosnippet',
            'git@github.com:Shougo/neosnippet-snippets',
            'git@github.com:Shougo/unite.vim',
            'git@github.com:Shougo/vimfiler.vim',
            'git@github.com:Shougo/vimshell',
            'git@github.com:Xuyuanp/nerdtree-git-plugin',
            'git@github.com:Yggdroot/indentLine',
            'git@github.com:airblade/vim-gitgutter',
            'git@github.com:ctrlpvim/ctrlp.vim',
            'git@github.com:dracula/vim',
            'git@github.com:flazz/vim-colorschemes',
            'git@github.com:github/copilot.vim',
            'git@github.com:itchyny/lightline.vim',
            'git@github.com:jacoborus/tender.vim',
            'git@github.com:jpalardy/vim-slime',
            'git@github.com:majutsushi/tagbar',
            'git@github.com:nathanaelkane/vim-indent-guides',
            'git@github.com:nelstrom/vim-visual-star-search',
            'git@github.com:rickhowe/diffchar.vim',
            'git@github.com:sainnhe/edge',
            'git@github.com:scrooloose/nerdtree',
            'git@github.com:scrooloose/syntastic',
            'git@github.com:sudar/vim-arduino-syntax',
            'git@github.com:t9md/vim-textmanip',
            'git@github.com:tomasr/molokai',
            'git@github.com:tpope/vim-fugitive',
            'git@github.com:tyru/open-browser.vim',
            'git@github.com:ujihisa/unite-colorscheme',
            'git@github.com:vim-jp/vimdoc-ja',
            'git@github.com:vim-scripts/VimClojure',
            'git@github.com:vim-scripts/vcscommand.vim',
            'git@github.com:will133/vim-dirdiff'
        ]
        for repo in repos:
            dirname = os.path.basename(repo).replace(".nvim", "") # remove .nvim from dirname
            dest_dir = os.path.join("~/.vim/pack/mypackage/start/", dirname)
            dest_dir = os.path.expanduser(dest_dir)
            if os.path.exists(dest_dir):
                if os.path.exists(os.path.join(dest_dir, ".git")):
                    try:
                        c.run(f'cd {dest_dir} && git pull && cd ..')
                    except:
                        print(f"Could not update {dirname}, please check the repository exists and is a valid git repository")
                else:
                    print(f"{dirname} exists but is not a git repository, skipping")
            else:
                c.run(f'git clone {repo} {dest_dir}')

@task
def shell_aliases(c):
    c.run('echo \'eval "$$(/Users/tetsuo.koyama/.cargo/bin/starship init bash)"\' >> ~/.bashrc')
    c.run('echo \'alias ls="lsd"\' >> ~/.bashrc')
    c.run('echo \'alias cat="/Users/tetsuo.koyama/.cargo/bin/bat"\' >> ~/.bashrc')
    c.run('echo \'eval "$$(starship init zsh)"\' >> ~/.zshrc')
    c.run('echo \'eval "$$(direnv hook zsh)"\' >> ~/.zshrc')
    c.run('echo \'export EDITOR=vim\' >> ~/.zshrc')
    c.run('echo \'alias leetcode="$(HOME)/.cargo/bin/leetcode"\' >> ~/.zshrc')

@task(default=True)
def all(c):
    config(c)
    vim_plugins(c)
    shell_aliases(c)
