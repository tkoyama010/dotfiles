{ config, profile, ... }:
{
  programs.git = {
    enable = true;
    settings = {
      user = {
        name = profile.gitName;
        email = profile.gitEmail;
      };
      core.hooksPath = "${config.home.homeDirectory}/.local/share/git/hooks";
    };
    hooks = {
      pre-push.text = ''
        #!/bin/bash
        # Pre-push hook: block direct pushes to protected branches.
        # Server-side branch protection is the real guard; this is a client-side safety net.

        protected="main master production"

        while read local_ref local_sha remote_ref remote_sha; do
          branch=''${remote_ref#refs/heads/}
          for p in ''$protected; do
            if [ "''$branch" = "''$p" ]; then
              echo "ERROR: push to ''$branch is blocked by pre-push hook."
              exit 1
            fi
          done
        done
      '';
    };
  };
}
