cp vimrc ~/.vimrc

mkdir -p ~/.vim/pack/mypackage/start/
cd ~/.vim/pack/mypackage/start/

declare -a packages=(
	'git@github.com:EdenEast/nightfox.nvim.git'
	'git@github.com:PProvost/vim-ps1'
	'git@github.com:Shougo/dein.vim'
	'git@github.com:Shougo/deoplete.nvim'
	'git@github.com:Shougo/neocomplcache'
	'git@github.com:Shougo/neosnippet'
	'git@github.com:Shougo/neosnippet-snippets'
	'git@github.com:Shougo/unite.vim'
	'git@github.com:Shougo/vimfiler.vim'
	'git@github.com:Shougo/vimshell'
	'git@github.com:Xuyuanp/nerdtree-git-plugin'
	'git@github.com:Yggdroot/indentLine'
	'git@github.com:airblade/vim-gitgutter'
	'git@github.com:ctrlpvim/ctrlp.vim'
	'git@github.com:dracula/vim.git'
	'git@github.com:flazz/vim-colorschemes'
	'git@github.com:github/copilot.vim.git'
	'git@github.com:itchyny/lightline.vim'
	'git@github.com:jacoborus/tender.vim'
	'git@github.com:jpalardy/vim-slime'
	'git@github.com:majutsushi/tagbar'
	'git@github.com:nathanaelkane/vim-indent-guides'
	'git@github.com:nelstrom/vim-visual-star-search'
	'git@github.com:rickhowe/diffchar.vim'
	'git@github.com:sainnhe/edge.git'
	'git@github.com:scrooloose/nerdtree'
	'git@github.com:scrooloose/syntastic'
	'git@github.com:sudar/vim-arduino-syntax'
	'git@github.com:t9md/vim-textmanip'
	'git@github.com:tomasr/molokai'
	'git@github.com:tpope/vim-fugitive'
	'git@github.com:tyru/open-browser.vim'
	'git@github.com:ujihisa/unite-colorscheme'
	'git@github.com:vim-scripts/VimClojure'
	'git@github.com:vim-scripts/vcscommand.vim'
	'git@github.com:will133/vim-dirdiff'
)

for i in ${!packages[@]}; do
	directory=$(basename ${packages[i]})
	if [ -e ./${directory} ]; then
		cd ./${directory}
		git pull
		cd ../
	else
		git clone ${packages[i]}
	fi
done

ln -s .tmux.conf ~/.tmux.conf
