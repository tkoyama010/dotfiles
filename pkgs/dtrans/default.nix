{
  lib,
  python3,
  fetchPypi,
}:
# dtrans (https://github.com/kriss-spy/deep-translate-shell): a modern
# command-line translator powered by LLMs. Rewrite of translate-shell with
# support for OpenAI-compatible APIs (Qwen via DashScope, DeepSeek, Gemini, ...).
python3.pkgs.buildPythonApplication rec {
  pname = "dtrans";
  version = "1.1.0";
  pyproject = true;

  src = fetchPypi {
    inherit pname version;
    hash = "sha256-2OZjNf3y6uQDHpAtX53p2PAFyYcN9b75nJiqe8HxUaM=";
  };

  build-system = [python3.pkgs.hatchling];

  dependencies = with python3.pkgs; [
    click
    rich
    pydantic
    httpx
    openai
    google-genai
    tenacity
  ];

  meta = {
    description = "Modern command-line translator powered by LLMs";
    homepage = "https://github.com/kriss-spy/deep-translate-shell";
    license = lib.licenses.mit;
    mainProgram = "dtrans";
  };
}
