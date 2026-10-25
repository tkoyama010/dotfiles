{inputs, ...}: {
  imports = [inputs.hermes-agent.homeManagerModules.default];

  # Installs the hermes CLI only; the gateway service stays off.
  programs.hermes-agent.enable = true;
}
