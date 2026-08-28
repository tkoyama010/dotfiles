{
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.services.ollama;

  # The vision model that pi-vision-handoff is configured to use.
  visionModel = "qwen2.5vl:7b";

  # Shared by both platform wrappers below. The ollama server is started by
  # its own unit/agent at the same time as this one, so wait for it to accept
  # connections before pulling rather than assuming an ordering.
  pullVisionModel = pkgs.writeShellScript "ollama-pull-vision-model" ''
    for _ in $(seq 1 30); do
      if ${pkgs.curl}/bin/curl -sf http://${cfg.host}:${toString cfg.port}/ >/dev/null; then
        exec ${cfg.package}/bin/ollama pull ${visionModel}
      fi
      sleep 1
    done
    echo "ollama did not accept connections within 30s; not pulling ${visionModel}" >&2
    exit 1
  '';
in {
  services.ollama = {
    enable = true;
  };

  systemd.user.services.ollama-pull-qwen2_5vl = lib.mkIf pkgs.stdenv.hostPlatform.isLinux {
    Unit = {
      Description = "Pull ${visionModel} vision model for ollama";
      After = ["ollama.service"];
      Requires = ["ollama.service"];
    };
    Service = {
      Type = "oneshot";
      ExecStart = "${pullVisionModel}";
    };
    Install = {
      WantedBy = ["default.target"];
    };
  };

  # systemd.user.services is silently ignored on darwin, which left the model
  # unpulled on macOS. launchd is the equivalent there.
  launchd.agents.ollama-pull-qwen2_5vl = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin {
    enable = true;
    config = {
      ProgramArguments = ["${pullVisionModel}"];
      RunAtLoad = true;
    };
  };
}
