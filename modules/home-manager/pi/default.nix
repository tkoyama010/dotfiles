{...}: {
  home.file = {
    ".pi/agent/themes/default.json".source = ./theme.json;
    ".pi/agent/zentui.json".source = ./zentui.json;
    ".pi/agent/settings.json" = {
      source = ./settings.json;
      force = true;
    };
    ".pi/agent/extensions/caveman-auto.ts".source = ./caveman-auto.ts;
    ".pi/agent/extensions/vision-handoff-aware.ts".source = ./vision-handoff-aware.ts;
    ".pi/agent/extensions/pi-vision-handoff.json".source = ./pi-vision-handoff.json;
    ".pi/agent/extensions/rtk.ts".source = ./rtk.ts;
    ".pi/agent/models.json".source = ./models.json;
  };
}
