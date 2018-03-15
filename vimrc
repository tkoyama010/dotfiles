"map <C-]> :tab split<CR>:exec("tag ".expand("<cword>"))<CR>

"NeoBundle Scripts-----------------------------
if &compatible
  set nocompatible               " Be iMproved
endif

" Required:
set runtimepath+=~/.vim/bundle/neobundle.vim/

" Required:
call neobundle#begin(expand('~/.vim/bundle'))

" Let NeoBundle manage NeoBundle
" Required:
NeoBundleFetch 'Shougo/neobundle.vim'

" Add or remove your Bundles here:
NeoBundle 'PProvost/vim-ps1'
NeoBundle 'Shougo/neocomplcache'
NeoBundle 'Shougo/neosnippet'
NeoBundle 'Shougo/neosnippet-snippets'
NeoBundle 'Shougo/unite.vim'
NeoBundle 'Shougo/vimfiler.vim'
NeoBundle 'Shougo/vimshell'
NeoBundle 'VimClojure'
NeoBundle 'Xuyuanp/nerdtree-git-plugin'
NeoBundle 'Yggdroot/indentLine'
NeoBundle 'airblade/vim-gitgutter'
NeoBundle 'airblade/vim-gitgutter'
NeoBundle 'ctrlpvim/ctrlp.vim'
NeoBundle 'flazz/vim-colorschemes'
NeoBundle 'itchyny/lightline.vim'
NeoBundle 'jpalardy/vim-slime'
NeoBundle 'nathanaelkane/vim-indent-guides'
NeoBundle 'nelstrom/vim-visual-star-search'
NeoBundle 'scrooloose/nerdtree'
NeoBundle 'scrooloose/syntastic'
NeoBundle 't9md/vim-textmanip'
NeoBundle 'tomasr/molokai'
NeoBundle 'tpope/vim-fugitive'
NeoBundle 'tyru/open-browser.vim'
NeoBundle 'ujihisa/unite-colorscheme'
NeoBundle 'vim-scripts/Conque-GDB'
NeoBundle 'vim-scripts/diffchar.vim'
NeoBundle 'vim-scripts/vcscommand.vim'

" Required:
call neobundle#end()

filetype plugin indent on     " required!
filetype indent on
syntax on

" If there are uninstalled bundles found on startup,
" this will conveniently prompt you to install them.
NeoBundleCheck
"End NeoBundle Scripts-------------------------

colorscheme molokai
set number
set hlsearch
set cursorline
set cursorcolumn

let g:syntastic_python_checkers = ["flake8"]

"set encoding=utf-8
"set fileencodings=iso-2022-jp,euc-jp,sjis,utf-8
"set fileformats=unix,dos,mac
set fileencodings=iso-2022-jp,cp932,sjis,euc-jp,utf-8

