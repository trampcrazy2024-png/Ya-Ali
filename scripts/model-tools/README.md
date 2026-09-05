# Model preparation

Raw Hugging Face files (`safetensors`, PyTorch checkpoints) are not automatically executable in Ya-Ali Android.

Use one of these production paths:

- GGUF: convert/quantize with llama.cpp tooling, then import the `.gguf` file.
- ExecuTorch: export the supported LLM to a `.pte` program and package its tokenizer/model assets.
- ONNX Runtime GenAI: export a compatible model to ONNX and package the GenAI model/tokenizer files.
- Ollama / LM Studio / LocalAI: keep the model on a LAN computer and enter its endpoint in Ya-Ali.

Do not rename `.safetensors` to `.gguf`; that changes only the filename, not the model representation.
