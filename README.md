# dotfiles

## Overview

This repository is for managing personal configuration files. It includes settings to streamline development and work in a Linux environment.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/dotfiles.git
   cd dotfiles
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Apply the configurations using `tasks.py`:
   ```bash
   invoke all-tasks
   ```

## Key Contents

- `vimrc`: Configuration file for Vim.
- `starship.toml`: Configuration for the Starship prompt.
- `lsd/config.yaml`: Configuration for the LSD command.
- `zellij/config.kdl`: Configuration for the Zellij terminal manager.
- `tasks.py`: Script to automate various setup tasks.

## Usage Example

You can install Vim plugins with the following command:

```bash
invoke vim-plugins
```

## License

This repository is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
