{...}: {
  home.file = {
    ".pi/agent/themes/tkoyama010.json".source = ./tkoyama010-theme.json;
    ".pi/agent/settings.json".source = ./settings.json;
    ".pi/agent/extensions/caveman-auto.ts".source = ./caveman-auto.ts;
    ".pi/agent/extensions/pi-vision-handoff.json".source = ./pi-vision-handoff.json;
  };
}
