{...}: {
  home.file = {
    ".pi/agent/extensions/gemini-input.ts".source = ./gemini-input.ts;
    ".pi/agent/extensions/gemini-header.ts".source = ./gemini-header.ts;
    ".pi/agent/themes/gemini.json".source = ./gemini-theme.json;
  };
}
