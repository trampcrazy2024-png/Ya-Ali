# Ya-Ali — Professional Local Model Architecture

## Model strategy

Ya-Ali uses an adapter architecture instead of pretending that every model file can be executed by one engine.

| Input | Runtime | Android direct | Notes |
|---|---|---:|---|
| `.gguf` | llama.cpp | Yes | Current production path; CPU and future GPU backends |
| `.onnx` | ONNX Runtime / GenAI | Architecture-ready | Requires an ONNX GenAI Android runtime build/AAR |
| `.pte` | ExecuTorch | Architecture-ready | Requires ExecuTorch Android AAR and exported model |
| `.safetensors`, `.bin`, `.pt`, `.pth` | Endpoint or conversion | No | Raw training/checkpoint weights are not a portable mobile inference package |
| `.tflite` | LiteRT | Task/model dependent | Best for smaller task models; not a universal chat runtime |
| Ollama/LM Studio/LocalAI | OpenAI-compatible/Ollama endpoint | Yes, LAN | No model file is copied into the APK; inference remains local on the user's LAN |

This is deliberate: ONNX Runtime requires ONNX models for on-device execution, while ExecuTorch LLM deployment uses exported `.pte` programs. Raw Hugging Face checkpoints such as safetensors are source weights and normally need conversion/export before mobile inference.

## Runtime priority

1. On-device GGUF / llama.cpp when a compatible model is loaded.
2. On-device ONNX GenAI when the optional runtime is packaged and a compatible ONNX model is loaded.
3. On-device ExecuTorch when the optional runtime is packaged and a compatible PTE model is loaded.
4. LAN local endpoint (Ollama / LM Studio / LocalAI).
5. Configured online providers.

## Why this is safer

A file extension alone cannot determine whether a model is executable. The model architecture, tokenizer, graph/program, quantization and runtime must agree. The UI therefore detects the format, explains the runtime required, and never sends an ONNX/PTE/Safetensors file into llama.cpp.

## Recommended production model sizes

For a typical Android phone, start with 1B–3B instruct models. Larger models should be optional because RAM pressure, thermals and latency vary substantially by device.

## Next native-runtime milestone

The next native milestone is to package ONNX Runtime GenAI and ExecuTorch as optional Android modules, each behind a feature flag. This keeps the GGUF path stable while adding true non-GGUF on-device inference without coupling all model formats to llama.cpp.
