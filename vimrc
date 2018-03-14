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
NeoBundle 'Shougo/neosnippet.vim'
NeoBundle 'Shougo/neosnippet-snippets'
NeoBundle 'tpope/vim-fugitive'
NeoBundle 'ctrlpvim/ctrlp.vim'
NeoBundle 'flazz/vim-colorschemes'
NeoBundle 'Shougo/unite.vim'
NeoBundle 'ujihisa/unite-colorscheme'

NeoBundle 'vim-scripts/Conque-GDB'
NeoBundle 'itchyny/lightline.vim'
NeoBundle 'airblade/vim-gitgutter'
NeoBundle 'scrooloose/nerdtree'
NeoBundle 'airblade/vim-gitgutter'
NeoBundle 'Xuyuanp/nerdtree-git-plugin'
NeoBundle 'Yggdroot/indentLine'
NeoBundle 'tyru/open-browser.vim'

" You can specify revision/branch/tag.
NeoBundle 'Shougo/vimshell', { 'rev' : '3787e5' }

" Required:
call neobundle#end()

" Required:
filetype plugin indent on

" If there are uninstalled bundles found on startup,
" this will conveniently prompt you to install them.
NeoBundleCheck
"End NeoBundle Scripts-------------------------

colorscheme molokai
set number
set cursorline
set cursorcolumn
