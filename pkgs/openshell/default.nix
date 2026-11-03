# NVIDIA OpenShell CLI — https://github.com/NVIDIA/OpenShell
# Installs only the static `openshell` client binary from the release
# tarballs. The gateway, VM driver and policy prover are separate
# release assets and are not packaged here.
{
  pkgs,
  lib,
}: let
  version = "0.1.2";
  baseUrl = "https://github.com/NVIDIA/OpenShell/releases/download/v${version}";

  srcByPlatform = {
    "aarch64-darwin" = {
      url = "${baseUrl}/openshell-aarch64-apple-darwin.tar.gz";
      hash = "sha256-zd5+kr1+rGZAMc8XHP6A0p5/EipmdJF7JaTOC8vDNGY=";
    };
    "aarch64-linux" = {
      url = "${baseUrl}/openshell-aarch64-unknown-linux-musl.tar.gz";
      hash = "sha256-mIDFd2aIIx1SQt6wRs3uNhc0+UkBuRI5SaC68p/a3Z4=";
    };
    "x86_64-linux" = {
      url = "${baseUrl}/openshell-x86_64-unknown-linux-musl.tar.gz";
      hash = "sha256-fraRcoUzGgnjMAJmoFWGFkgaXpknyuJhLqB8QEW23W8=";
    };
  };

  src =
    srcByPlatform.${pkgs.stdenv.hostPlatform.system}
    or (throw "openshell: unsupported platform ${pkgs.stdenv.hostPlatform.system}");
in
  pkgs.stdenv.mkDerivation {
    pname = "openshell";
    inherit version;

    src = pkgs.fetchurl {
      inherit (src) url hash;
    };

    # Tarball contains a single top-level `openshell` binary.
    sourceRoot = ".";
    dontFixup = true;

    installPhase = ''
      install -Dm755 openshell "$out/bin/openshell"
    '';

    meta = {
      description = "Safe, private runtime for autonomous AI agents";
      homepage = "https://github.com/NVIDIA/OpenShell";
      license = lib.licenses.asl20;
      platforms = builtins.attrNames srcByPlatform;
      mainProgram = "openshell";
    };
  }
