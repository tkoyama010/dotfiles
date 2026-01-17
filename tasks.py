"""Tasks for automating setup."""

import contextlib
import logging
import platform
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from invoke import Context, task

logger = logging.getLogger(__name__)


def is_mac() -> bool:
    """Check if running on macOS."""
    return platform.system() == "Darwin"


def is_linux() -> bool:
    """Check if running on Linux."""
    return platform.system() == "Linux"


@task
def config(c: Context) -> None:
    """Copy configuration files."""
    c.run("mkdir -p ~/.config")
    c.run("cp vimrc ~/.vimrc")

    if is_mac():
        c.run("brew install font-fira-code-nerd-font")
    elif is_linux():
        logger.info(
            "On Linux: Install FiraCode Nerd Font manually from https://www.nerdfonts.com/",
        )

    logger.info("Set 'FiraCode Nerd Font Mono' to Editor: Font Family in VSCode")


@task
def vim_plugins(c: Context) -> None:
    """Installs vim plugins."""
    c.run("mkdir -p ~/.vim/pack/mypackage/start/")

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

    def process_repo(repo: str) -> None:
        dirname = Path(repo).name.replace(".nvim", "")
        dest_dir = Path("~/.vim/pack/mypackage/start/") / dirname
        dest_dir = dest_dir.expanduser()
        if dest_dir.exists():
            if (dest_dir / ".git").exists():
                with contextlib.suppress(Exception):
                    c.run(f"cd {dest_dir} && git pull && cd ..")
        else:
            c.run(f"git clone {repo} {dest_dir}")

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(process_repo, repo) for repo in repos]
        for future in as_completed(futures):
            with contextlib.suppress(Exception):
                future.result()


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

    if is_mac():
        c.run(
            "brew install yazi ffmpeg sevenzip jq poppler fd ripgrep fzf zoxide "
            "imagemagick font-symbols-only-nerd-font",
        )
    elif is_linux():
        logger.info("Installing yazi dependencies on Linux...")
        c.run(
            "sudo apt-get update && sudo apt-get install -y ffmpeg p7zip-full jq "
            "poppler-utils fd-find ripgrep fzf imagemagick || true",
        )
        # Install yazi via cargo if available, or provide instructions
        result = c.run("which cargo", warn=True, hide=True)
        if result and result.ok:
            c.run("cargo install --locked yazi-fm yazi-cli")
        else:
            logger.info(
                "Install yazi manually: cargo install --locked yazi-fm yazi-cli",
            )
            logger.info("Or follow instructions at: https://github.com/sxyazi/yazi")


@task
def byobu(c: Context) -> None:
    """Set up byobu."""
    c.run("mkdir -p ~/.byobu")
    c.run("cp byobu/.byobu/.tmux.conf ~/.byobu/")


@task
def copilot_cli(c: Context) -> None:
    """Set up GitHub Copilot CLI configuration."""
    dotfiles_dir = Path(__file__).parent
    config_src = dotfiles_dir / "copilot" / "config.json"
    config_dst = Path.home() / ".copilot" / "config.json"

    # Create directory if it doesn't exist
    c.run("mkdir -p ~/.copilot")

    # Backup existing config if it exists and is not a symlink
    if config_dst.exists() and not config_dst.is_symlink():
        backup_path = config_dst.with_suffix(".json.bak")
        logger.info("Backing up existing config to %s", backup_path)
        c.run(f"mv {config_dst} {backup_path}")

    # Create or update symlink
    c.run(f"ln -sf {config_src} {config_dst}")
    logger.info("Created symlink: %s -> %s", config_dst, config_src)


@task
def ruff_skill(c: Context, target_dir: str) -> None:
    """Set up Ruff linting skill for any project repository.
    
    Args:
        target_dir: Target repository directory (required)
    
    Example:
        invoke ruff-skill --target-dir ~/repository
        invoke ruff-skill -t /path/to/project
    """
    dotfiles_dir = Path(__file__).parent
    skill_src = dotfiles_dir / ".github" / "skills" / "ruff-lint"
    
    # Expand and resolve target directory path
    target_path = Path(target_dir).expanduser().resolve()
    
    # Validate target directory exists
    if not target_path.exists():
        msg = f"Target directory does not exist: {target_path}"
        raise ValueError(msg)
    
    if not target_path.is_dir():
        msg = f"Target path is not a directory: {target_path}"
        raise ValueError(msg)
    
    skill_dst = target_path / ".github" / "skills" / "ruff-lint"

    # Create skills directory if it doesn't exist
    c.run(f"mkdir -p {skill_dst.parent}")

    # Backup existing skill if it exists and is not a symlink
    if skill_dst.exists() and not skill_dst.is_symlink():
        backup_path = skill_dst.with_suffix(".bak")
        logger.info("Backing up existing skill to %s", backup_path)
        c.run(f"mv {skill_dst} {backup_path}")

    # Create or update symlink
    c.run(f"ln -sf {skill_src} {skill_dst}")
    logger.info("Created symlink: %s -> %s", skill_dst, skill_src)
    logger.info("ruff-lint skill is now available via /skill ruff-lint")


@task
def ttyd(c: Context) -> None:
    """Start ttyd web terminal."""
    c.run("ttyd -i 127.0.0.1 -p 7682 -W bash")


@task(default=True)
def all_tasks(c: Context) -> None:
    """Run all tasks."""
    config(c)
    vim_plugins(c)
    shell_aliases(c)
    byobu(c)
    copilot_cli(c)
    ruff_skill(c)
