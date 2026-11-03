{ pkgs, lib, ... }:
{
  home.file.".claude/statusline.sh" = {
    source = ../../../.claude/statusline.sh;
    executable = true;
  };

  # Claude Code writes to its own settings.json, so merge the key instead of linking the file.
  home.activation.claudeEffortLevel = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
    settings="$HOME/.claude/settings.json"
    mkdir -p "$HOME/.claude"
    [ -f "$settings" ] || echo '{}' > "$settings"
    tmp="$(mktemp)"
    ${pkgs.jq}/bin/jq '.modelSettings["claude-opus-5-5"].effortLevel = "high"' "$settings" > "$tmp"
    mv "$tmp" "$settings"
  '';
}
