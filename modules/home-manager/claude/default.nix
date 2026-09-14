{ ... }:
{
  home.file.".claude/statusline.sh" = {
    source = ../../../.claude/statusline.sh;
    executable = true;
  };

  # Linked per file, so unmanaged skills already in ~/.claude/skills survive.
  home.file.".claude/skills" = {
    source = ../../../claude/skills;
    recursive = true;
  };
}
