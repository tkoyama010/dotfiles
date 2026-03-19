{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.python312
    pkgs.python312Packages.pyvista
  ];

  shellHook = ''
    echo "Python 3.12 + PyVista environment"
    echo "Python version: $(python --version)"
    echo "PyVista available"
  '';
}
