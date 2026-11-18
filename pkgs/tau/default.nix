# tau — Hugging Face's Python coding-agent harness (PyPI: tau-ai).
# https://github.com/huggingface/tau
# Not in nixpkgs, so it is built here from the published sdist.
# Bump: take the sdist url from https://pypi.org/pypi/tau-ai/json, then refresh
# the hash with `nix store prefetch-file --json <url>`.
{
  pkgs,
  lib,
}: let
  version = "0.4.11";
in
  pkgs.python3Packages.buildPythonApplication {
    pname = "tau";
    inherit version;
    pyproject = true;

    src = pkgs.fetchurl {
      url = "https://files.pythonhosted.org/packages/2d/73/dbd168d24020f340d7119fc94085445cd7b2f49cf42b5a7e6c501621ad57/tau_ai-${version}.tar.gz";
      hash = "sha256-xvXBjFbKuDw5aWwWOY8bKBGqS4tn2CDecBLQQCUWgkc=";
    };

    build-system = [pkgs.python3Packages.hatchling];

    dependencies = with pkgs.python3Packages; [
      anyio
      httpx
      packaging
      pillow
      pydantic
      pygments
      rich
      # httpx[socks] extra, used for SOCKS proxy support.
      socksio
      textual
      typer
    ];

    pythonImportsCheck = ["tau_ai" "tau_agent" "tau_coding"];

    meta = {
      description = "A Python implementation of a minimalist Pi-style coding-agent harness";
      homepage = "https://twotimespi.dev";
      license = lib.licenses.mit;
      mainProgram = "tau";
    };
  }
