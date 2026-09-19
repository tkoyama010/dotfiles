{ pkgs, lib, ... }: {
  home.file = {
    ".pi/agent/themes/default.json".source = ./theme.json;
    ".pi/agent/themes/colibri.json".source = ./themes/colibri.json;
    ".pi/agent/advisor.json" = {
      source = ./advisor.json;
      force = true;
    };
    ".pi/agent/settings.json" = {
      source = ./settings.json;
      force = true;
    };
    ".pi/agent/extensions/caveman-auto.ts".source = ./caveman-auto.ts;
    ".pi/agent/extensions/vision-handoff-aware.ts".source = ./vision-handoff-aware.ts;
    ".pi/agent/extensions/pi-vision-handoff.json".source = ./pi-vision-handoff.json;
    ".pi/agent/extensions/rtk.ts".source = ./rtk.ts;
    ".pi/agent/models.json".source = ./models.json;
    ".pi/agent/prompts/commit.md".source = ./prompts/commit.md;
    ".pi/agent/prompts/pr.md".source = ./prompts/pr.md;
    ".pi/agent/prompts/review.md".source = ./prompts/review.md;
  };

  # zentui writes to its own config file, so it must stay mutable.
  home.activation.seedZentui = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
    if [ ! -f "$HOME/.pi/agent/zentui.json" ]; then
      ${pkgs.coreutils}/bin/install -Dm644 ${./zentui.json} "$HOME/.pi/agent/zentui.json"
    fi
  '';
}
