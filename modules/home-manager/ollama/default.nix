{pkgs, ...}: {
  services.ollama = {
    enable = true;
  };

  # Pull the vision model that pi-vision-handoff is configured to use.
  systemd.user.services.ollama-pull-qwen2_5vl = {
    Unit = {
      Description = "Pull qwen2.5vl:7b vision model for ollama";
      After = ["ollama.service"];
    };
    Service = {
      Type = "oneshot";
      ExecStart = "${pkgs.ollama}/bin/ollama pull qwen2.5vl:7b";
    };
    Install = {
      WantedBy = ["default.target"];
    };
  };
}
