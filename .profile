# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi

# uv
export PATH="$HOME/snap/code/194/.local/share/../bin:$PATH"

# Auto-run ttyd
if command -v ttyd > /dev/null 2>&1; then
    if ! pgrep -f "ttyd -i 127.0.0.1 -p 7681" > /dev/null; then
        ttyd -i 127.0.0.1 -p 7681 -W \
            -t fontFamily='FiraCode Nerd Font Mono' \
            -t fontSize=18 \
            -t cursorBlink=true \
            -t 'theme={"background":"#1e1e2e","foreground":"#cdd6f4"}' \
            bash > /dev/null 2>&1 &
    fi
fi
