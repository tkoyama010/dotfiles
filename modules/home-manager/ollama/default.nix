{pkgs, ...}: {
  services.ollama = {
    enable = true;
  };

  # Pull the vision model that pi-vision-handoff is configured to use.
  systemd.user.services.ollama-pull-qwen2_5vl = {
    Unit = {
      Description = "Pull qwen2.5vl:7b vision model for ollama";
      After = ["ollama.service"];
      Requires = ["ollama.service"];
    };
    Service = {
      Type = "oneshot";
      # Wait for the ollama server to accept connections before pulling.
      ExecStartPre = "${pkgs.bash}/bin/bash -c 'for i in $(seq 1 30); do ${pkgs.curl}/bin/curl -sf http://127.0.0.1:11434/ >/dev/null && exit 0; sleep 1; done; exit 1'";
      ExecStart = "${pkgs.ollama}/bin/ollama pull qwen2.5vl:7b";
    };
    Install = {
      WantedBy = ["default.target"];
    };
  };
}
