# Docker Sandboxes (sbx) CLI — https://github.com/docker/sbx-releases
# Mirrors the official docker/tap Homebrew cask and the static tarball
# install.sh layout: macOS keeps the Sbx.app bundle intact (the binary
# resolves its helpers via ../libexec -> Contents/Helpers), Linux uses
# <out>/bin/sbx plus <out>/libexec.
{
  pkgs,
  lib,
}: let
  version = "0.45.1";
  baseUrl = "https://github.com/docker/sbx-releases/releases/download/v${version}";

  srcByPlatform = {
    "aarch64-darwin" = {
      url = "${baseUrl}/DockerSandboxes-darwin.tar.gz";
      hash = "sha256-CnIH0XNu+dEJtyLPPSHiue1YQNdmf8vLdZYHUmWyICM=";
    };
    "aarch64-linux" = {
      url = "${baseUrl}/DockerSandboxes-linux-arm64.tar.gz";
      hash = "sha256-7eLIpvjv80+iCCCtRF7h6HToyZKMdkkctJa1/0iKsGU=";
    };
    "x86_64-linux" = {
      url = "${baseUrl}/DockerSandboxes-linux-amd64.tar.gz";
      hash = "sha256-pUcMq+MtJdJC4FoQ0aL+tnoz4eZo4OjCSI4OAnEudPc=";
    };
  };

  src =
    srcByPlatform.${pkgs.stdenv.hostPlatform.system}
    or (throw "sbx: unsupported platform ${pkgs.stdenv.hostPlatform.system}");
in
  pkgs.stdenv.mkDerivation {
    pname = "sbx";
    inherit version;

    src = pkgs.fetchurl {
      inherit (src) url hash;
    };

    # Linux needs mkfs.ext4 (e2fsprogs) on PATH at runtime.
    buildInputs = lib.optionals pkgs.stdenv.hostPlatform.isLinux [
      pkgs.makeWrapper
    ];

    # Tarball has multiple top-level entries (bin/, Sbx.app/, ...).
    sourceRoot = ".";
    dontFixup = true;

    installPhase =
      if pkgs.stdenv.hostPlatform.isDarwin
      then ''
        # Keep the Sbx.app bundle 1:1 so codesignature and helper lookups stay valid.
        cp -a . "$out"
      ''
      else ''
        install -m 755 docker-sbx/sbx "$out/bin/sbx"
        mkdir -p "$out/libexec/lib"
        install -m 755 docker-sbx/containerd-shim-nerdbox-v1 "$out/libexec/containerd-shim-nerdbox-v1"
        install -m 755 docker-sbx/mkfs.erofs "$out/libexec/mkfs.erofs"
        [ -f docker-sbx/containerd-shim-nerdbox-gpu-v1 ] && \
          install -m 755 docker-sbx/containerd-shim-nerdbox-gpu-v1 "$out/libexec/containerd-shim-nerdbox-gpu-v1"
        for f in docker-sbx/nerdbox-kernel-* docker-sbx/nerdbox-rootfs-*.erofs; do
          install -m 644 "$f" "$out/libexec/$(basename "$f")"
        done
        install -m 755 docker-sbx/libsailor.so "$out/libexec/lib/libsailor.so"

        wrapProgram "$out/bin/sbx" --prefix PATH : "${lib.makeBinPath [pkgs.e2fsprogs]}"
      '';

    meta = {
      description = "Docker Sandboxes: run AI coding agents in isolated microVM sandboxes";
      homepage = "https://github.com/docker/sbx-releases";
      license = lib.licenses.asl20;
      platforms = builtins.attrNames srcByPlatform;
      mainProgram = "sbx";
    };
  }
