{
  lib,
  stdenv,
  fetchurl,
  unzip,
  makeWrapper,
  wine,
}:
# PrePoMax (https://prepomax.fs.um.si/) is a Windows-only .NET Framework 4.8
# application. We ship the official portable zip and run its command-line
# executable (PrePoMax.com) through Wine.
#
# ponytail: Wine does not bundle the .NET Framework 4.8 runtime. On first use
# run `wine-prepomax winetricks dotnet48` inside the WINEPREFIX below; see the
# README section in the PR. Only x86_64-linux is supported (Wine limitation).
stdenv.mkDerivation rec {
  pname = "prepomax-cmd";
  version = "2.6.0";

  src = fetchurl {
    url = "https://prepomax.fs.um.si/Files/Downloads/PrePoMax%20v${version}.zip";
    hash = "sha256-egiZX7d20+li+FnuV2B4vzTRPytZ2ByAEs3fjmmxw4Q=";
  };

  nativeBuildInputs = [
    unzip
    makeWrapper
  ];

  unpackPhase = ''
    unzip "$src" -d src
  '';

  installPhase = ''
    runHook preInstall
    dir="src/PrePoMax v${version}"
    mkdir -p "$out/share/prepomax"
    cp -r "$dir"/* "$out/share/prepomax/"
    mkdir -p "$out/bin"
    makeWrapper "${wine}/bin/wine" "$out/bin/prepomax-cmd" \
      --add-flags "$out/share/prepomax/PrePoMax.com" \
      --run '[ -z "''${WINEPREFIX:-}" ] && export WINEPREFIX="$HOME/.prepomax-wine" || true'
    makeWrapper "${wine}/bin/wine" "$out/bin/prepomax" \
      --add-flags "$out/share/prepomax/PrePoMax.exe" \
      --run '[ -z "''${WINEPREFIX:-}" ] && export WINEPREFIX="$HOME/.prepomax-wine" || true'
    runHook postInstall
  '';

  # Wine only runs the Windows binaries on x86_64 Linux.
  meta.platforms = ["x86_64-linux"];
  meta.license = lib.licenses.gpl3Plus; # PrePoMax is GPLv3
  meta.mainProgram = "prepomax-cmd";
}
