"map <C-]> :tab split<CR>:exec("tag ".expand("<cword>"))<CR>

"NeoBundle Scripts-----------------------------
if &compatible
  set nocompatible               " Be iMproved
endif

" Required:
set runtimepath+=/home/tetsuo/.vim/bundle/neobundle.vim/

" Required:
call neobundle#begin(expand('/home/tetsuo/.vim/bundle'))

" Let NeoBundle manage NeoBundle
" Required:
NeoBundleFetch 'Shougo/neobundle.vim'

" Add or remove your Bundles here:
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
NeoBundle 'scrooloose/nerdtree'
NeoBundle 'scrooloose/syntastic'
NeoBundle 't9md/vim-textmanip'
NeoBundle 'tomasr/molokai'
NeoBundle 'tpope/vim-fugitive'
NeoBundle 'tyru/open-browser.vim'
NeoBundle 'ujihisa/unite-colorscheme'
NeoBundle 'vim-scripts/Conque-GDB'
NeoBundle 'vim-scripts/diffchar.vim'
NeoBundle 'tpope/vim-fugitive'

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
set cursorline
set cursorcolumn
