.PHONY: all config vim-plugins shell-aliases

all: config vim-plugins shell-aliases

config:
	mkdir -p ~/.config/lsd
	cp lsd/config.yaml ~/.config/lsd/config.yaml
	cp starship.toml ~/.config/starship.toml
	cp vimrc ~/.vimrc

vim-plugins:
	mkdir -p ~/.vim/pack/mypackage/start/
	cd ~/.vim/pack/mypackage/start/ && \
	for repo in \
		git@github.com:EdenEast/nightfox.nvim \
		git@github.com:PProvost/vim-ps1 \
		git@github.com:Shougo/dein.vim \
		git@github.com:Shougo/deoplete.nvim \
		git@github.com:Shougo/neocomplcache \
		git@github.com:Shougo/neosnippet \
		git@github.com:Shougo/neosnippet-snippets \
		git@github.com:Shougo/unite.vim \
		git@github.com:Shougo/vimfiler.vim \
		git@github.com:Shougo/vimshell \
		git@github.com:Xuyuanp/nerdtree-git-plugin \
		git@github.com:Yggdroot/indentLine \
		git@github.com:airblade/vim-gitgutter \
		git@github.com:ctrlpvim/ctrlp.vim \
		git@github.com:dracula/vim \
		git@github.com:flazz/vim-colorschemes \
		git@github.com:github/copilot.vim \
		git@github.com:itchyny/lightline.vim \
		git@github.com:jacoborus/tender.vim \
		git@github.com:jpalardy/vim-slime \
		git@github.com:majutsushi/tagbar \
		git@github.com:nathanaelkane/vim-indent-guides \
		git@github.com:nelstrom/vim-visual-star-search \
		git@github.com:rickhowe/diffchar.vim \
		git@github.com:sainnhe/edge \
		git@github.com:scrooloose/nerdtree \
		git@github.com:scrooloose/syntastic \
		git@github.com:sudar/vim-arduino-syntax \
		git@github.com:t9md/vim-textmanip \
		git@github.com:tomasr/molokai \
		git@github.com:tpope/vim-fugitive \
		git@github.com:tyru/open-browser.vim \
		git@github.com:ujihisa/unite-colorscheme \
		git@github.com:vim-jp/vimdoc-ja \
		git@github.com:vim-scripts/VimClojure \
		git@github.com:vim-scripts/vcscommand.vim \
		git@github.com:will133/vim-dirdiff; \
	do \
		dir=$$(basename $$repo); \
		if [ -e $$dir ]; then \
			cd $$dir && git pull && cd ..; \
		else \
			git clone $$repo; \
		fi \
	done

shell-aliases:
	echo 'eval "$$($(HOME)/.cargo/bin/starship init bash)"' >> ~/.bashrc
	echo 'alias ls="lsd"' >> ~/.bashrc
	echo 'alias cat="$(HOME)/.cargo/bin/bat"' >> ~/.bashrc
	echo 'eval "$$(starship init zsh)"' >> ~/.zshrc
	echo 'eval "$$(direnv hook zsh)"' >> ~/.zshrc
	echo 'export EDITOR=vim' >> ~/.zshrc
	echo 'eval "$$(starship init bash)"' >> ~/.bashrc
	echo 'eval "$$(direnv hook bash)"' >> ~/.bashrc
	echo 'export EDITOR=vim' >> ~/.bashrc
