{
  pkgs,
  lib,
}: let
  version = "1.6.2";
  commit = "15813fe211e31425f7d0ad0e1018ef3102d16664";
in
  pkgs.stdenv.mkDerivation {
    pname = "istats";
    inherit version;

    src = pkgs.fetchFromGitHub {
      owner = "Chris911";
      repo = "iStats";
      rev = commit;
      sha256 = "sha256-00arr5w2i8lin0ls6d7511dl373hv78ak59ba31sihnii41z21jd";
    };

    nativeBuildInputs = [pkgs.ruby];

    NIX_LDFLAGS = lib.optionalString pkgs.stdenv.isDarwin "-framework IOKit -framework CoreFoundation";

    buildPhase = ''
      cd ext/osx_stats
      ruby extconf.rb
      make
    '';

    installPhase = ''
      mkdir -p $out/bin $out/lib/ruby

      # Install Ruby library files
      cp -r lib/* $out/lib/ruby/

      # Install the native extension
      mkdir -p $out/lib/ruby/osx_stats
      cp ext/osx_stats/osx_stats.bundle $out/lib/ruby/osx_stats/

      # Install the bin script with correct load path
      cp bin/istats $out/bin/istats
      patchShebangs $out/bin/istats

      # Wrap with RUBYLIB pointing to our lib dir
      mv $out/bin/istats $out/bin/.istats-unwrapped
      makeWrapper $out/bin/.istats-unwrapped $out/bin/istats \
        --set RUBYLIB "$out/lib/ruby" \
        --prefix PATH : "${lib.makeBinPath [pkgs.ruby]}"
    '';

    meta = {
      description = "Command-line tool to grab CPU temperature, fan speeds and battery information on macOS";
      homepage = "https://github.com/Chris911/iStats";
      license = lib.licenses.mit;
      platforms = ["aarch64-darwin" "x86_64-darwin"];
      mainProgram = "istats";
    };
  }
