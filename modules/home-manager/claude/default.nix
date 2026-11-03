{ ... }:
{
  home.file.".claude/statusline.sh" = {
    source = ../../../.claude/statusline.sh;
    executable = true;
  };
  home.file.".claude/skills/spreadsheets".source = ../../../.agents/skills/spreadsheets;
}
