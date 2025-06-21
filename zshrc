export EDITOR=vim
eval "$(direnv hook zsh)"
eval "$(starship init zsh)"
eval "$$(starship init zsh)"
eval "$$(direnv hook zsh)"
export EDITOR=vim
alias leetcode="$(HOME)/.cargo/bin/leetcode"
export PATH="$(HOME)/.cargo/bin:$(PATH)"
