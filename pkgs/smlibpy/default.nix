# smlibpy — Python API for NVIDIA's SMLib NURBS/CAD kernel.
# https://github.com/awv-informatik/smlibpy
# Installed from the prebuilt PyPI wheels, which bundle the compiled kernel.
{
  lib,
  stdenv,
  buildPythonPackage,
  fetchPypi,
  autoPatchelfHook,
  numpy,
  python,
}: let
  pname = "smlibpy";
  version = "0.3.1";
  pyTag = "cp314";

  # ponytail: hashes are pinned to the cp314 wheels; bump them when nixpkgs moves python3 off 3.14.
  srcByPlatform = {
    "aarch64-darwin" = {
      platform = "macosx_11_0_arm64";
      hash = "sha256-5gpXTG1YoAeT9zCvRPeVXzETQWT46g6P4t0GfPZhJHc=";
    };
    "aarch64-linux" = {
      platform = "manylinux_2_26_aarch64.manylinux_2_28_aarch64";
      hash = "sha256-0MD0hWYiu5lOuAFDXxRg4S2/esKL4jx0vBoXGGAtPmo=";
    };
    "x86_64-linux" = {
      platform = "manylinux_2_27_x86_64.manylinux_2_28_x86_64";
      hash = "sha256-PsRoTqgR+A4p4bVyrJ/1oBybLjhPTccZJuY8jZ7AplE=";
    };
  };

  src =
    srcByPlatform.${stdenv.hostPlatform.system}
    or (throw "smlibpy: unsupported platform ${stdenv.hostPlatform.system}");
in
  assert lib.assertMsg (python.pythonVersion == "3.14")
  "smlibpy: wheels are pinned to ${pyTag}, but python is ${python.pythonVersion}";
    buildPythonPackage {
      inherit pname version;
      format = "wheel";

      src = fetchPypi {
        inherit pname version;
        inherit (src) platform hash;
        format = "wheel";
        dist = pyTag;
        python = pyTag;
        abi = pyTag;
      };

      # The manylinux wheels link against libstdc++.
      nativeBuildInputs = lib.optionals stdenv.hostPlatform.isLinux [autoPatchelfHook];
      buildInputs = lib.optionals stdenv.hostPlatform.isLinux [stdenv.cc.cc.lib];

      dependencies = [numpy];

      pythonImportsCheck = ["smlibpy"];

      meta = {
        description = "Python API for the NVIDIA SMLib NURBS kernel";
        homepage = "https://github.com/awv-informatik/smlibpy";
        # Wrapper is MIT; the bundled SMLib kernel is Apache 2.0.
        license = [lib.licenses.mit lib.licenses.asl20];
        platforms = builtins.attrNames srcByPlatform;
      };
    }
