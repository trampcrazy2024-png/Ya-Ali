# Ya-Ali Professional Engineering Upgrade — 2026-09-04

## Implemented

- Model format registry: GGUF, ONNX, PTE, Safetensors, PyTorch, TFLite.
- Native picker/import now preserves non-GGUF files instead of rejecting them at import time.
- GGUF files remain isolated to llama.cpp and cannot accidentally be sent to another runtime.
- Non-GGUF local models are classified into three production paths:
  - ONNX → ONNX Runtime GenAI.
  - PTE → ExecuTorch.
  - raw Safetensors/PyTorch → conversion or local endpoint.
- Custom endpoint supports OpenAI-compatible and native Ollama APIs and discovers models through `/v1/models` and `/api/tags`.
- Runtime matrix and diagnostic explanation are exposed to the TypeScript layer.
- Added reproducible `doctor.sh` and model-format detector.
- Version bumped to 0.2.0 / Android 1.2-style release line.

## Engineering decision

A professional mobile inference layer must not equate a file extension with an executable model. ONNX Runtime Mobile requires ONNX models; ExecuTorch LLM deployment requires exported PTE programs. Raw Safetensors/PyTorch checkpoints require conversion/export or a serving runtime. This is why the application now recognizes and imports these formats without pretending that llama.cpp can execute them.

## Native-runtime roadmap

The next isolated implementation modules are:

1. ONNX Runtime GenAI Android AAR/JNI behind `YAALI_ONNX_RUNTIME`.
2. ExecuTorch Android AAR/JNI behind `YAALI_EXECUTORCH_RUNTIME`.
3. Device capability detection and automatic runtime selection.
4. Model manifest containing tokenizer, chat template, quantization, context length and RAM estimate.
5. Background model loading, memory guard, thermal-aware generation limits and crash-safe unload.

The existing GGUF/llama.cpp path remains the fallback and is not replaced by experimental runtimes.
