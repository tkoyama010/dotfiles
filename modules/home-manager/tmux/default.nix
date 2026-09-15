{
  # Ensure extended-keys is always enabled so tools like pi that use modified
  # keys (e.g. Shift+Enter) work inside tmux. Without this tmux starts with
  # extended-keys off and warns "Modified Enter keys may not work".
  programs.tmux = {
    enable = true;
    extraConfig = ''
      set -g extended-keys on
      set -g extended-keys-format csi-u
    '';
  };
}
