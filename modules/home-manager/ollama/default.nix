{...}: {
  services.ollama = {
    enable = true;
    loadModels = [
      "qwen2.5vl:7b"
    ];
  };
}
