# Dayflow — https://github.com/JerryZLiu/Dayflow
# Upstream only ships a macOS DMG, so this package is darwin-only.
# Sparkle auto-update cannot write to the nix store; bump `version` instead.
{
  pkgs,
  lib,
}:
pkgs.stdenv.mkDerivation rec {
  pname = "dayflow";
  version = "2.7.1";

  src = pkgs.fetchurl {
    url = "https://github.com/JerryZLiu/Dayflow/releases/download/v${version}/Dayflow.dmg";
    hash = "sha256-JUtk5dQn4vzORHsujchp/QLm+lobrNXZjtxGTbly1aM=";
  };

  nativeBuildInputs = [pkgs.undmg];
  sourceRoot = "Dayflow.app";
  # Keep the bundle 1:1 so the code signature stays valid.
  dontFixup = true;

  installPhase = ''
    mkdir -p "$out/Applications/Dayflow.app"
    cp -a . "$out/Applications/Dayflow.app"
  '';

  meta = {
    description = "Timeline of your day generated from screen recordings";
    homepage = "https://github.com/JerryZLiu/Dayflow";
    license = lib.licenses.mit;
    platforms = lib.platforms.darwin;
    sourceProvenance = [lib.sourceTypes.binaryNativeCode];
  };
}
