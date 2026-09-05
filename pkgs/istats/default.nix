{
  pkgs,
  lib,
}: let
  version = "1.6.2";
  commit = "15813fe211e31425f7d0ad0e1018ef3102d16664";

  sparkrGem = pkgs.fetchurl {
    url = "https://rubygems.org/downloads/sparkr-0.4.1.gem";
    sha256 = "sha256-KBaszofm+Np4OXbA4New+TyNZ6n+KOHxXxQTO7IsVrc=";
  };

  parseconfigGem = pkgs.fetchurl {
    url = "https://rubygems.org/downloads/parseconfig-1.1.2.gem";
    sha256 = "sha256-5SJH0VBw+0f55Y9E94iNHn9ld1J0zWD5q0t6zXlDspE=";
  };
in
  pkgs.stdenv.mkDerivation {
    pname = "istats";
    inherit version;

    src = pkgs.fetchFromGitHub {
      owner = "Chris911";
      repo = "iStats";
      rev = commit;
      sha256 = "sha256-TQbxA4nRwqjDUCuVqdDZcJxBWwjlNKMpsJGiKHjJWQE=";
    };

    nativeBuildInputs = [pkgs.ruby pkgs.makeWrapper];

    NIX_LDFLAGS = lib.optionalString pkgs.stdenv.hostPlatform.isDarwin "-framework IOKit -framework CoreFoundation";

    buildPhase = ''
      (
        cd ext/osx_stats
        ruby extconf.rb
        make
      )

      # Unpack gem dependencies
      mkdir -p _gems
      ${pkgs.ruby}/bin/gem unpack ${sparkrGem} --target _gems
      ${pkgs.ruby}/bin/gem unpack ${parseconfigGem} --target _gems
    '';

    installPhase = ''
      mkdir -p $out/bin $out/lib/ruby

      # Install Ruby library files
      cp -r lib/. $out/lib/ruby/

      # Install the native extension
      cp ext/osx_stats/osx_stats.bundle $out/lib/ruby/

      # Install gem dependency lib files
      for gem_dir in _gems/*; do
        [ -d "''${gem_dir}/lib" ] && cp -r "''${gem_dir}/lib/." $out/lib/ruby/
      done

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
