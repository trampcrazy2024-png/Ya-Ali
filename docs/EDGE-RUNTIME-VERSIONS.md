# Ya-Ali Edge Runtime Versions — 1.0.5

| Runtime | Version | Model | Status |
|---|---:|---|---|
| llama.cpp | pinned source revision in CMake | GGUF | production path |
| ExecuTorch Android | 1.4.0 | PTE + tokenizer | integrated; real device gate required |
| ONNX Runtime Android | 1.29.0 | generic ONNX | integrated for task/runtime capability |
| ONNX Runtime GenAI | 0.15.2 optional AAR | ONNX GenAI bundle | optional; build from source/AAR required |
| LiteRT-LM Android | 0.16.1 | `.litertlm` | integrated; real device gate required |

## Non-GGUF execution rules

- A filename extension is not enough to prove execution compatibility.
- ONNX GenAI is treated as a model bundle/directory; Ya-Ali supports importing a ZIP bundle containing the model files.
- PTE requires tokenizer/model assets.
- LiteRT-LM bundles carry the runtime-specific model package and do not use llama.cpp.
- Raw Safetensors/PyTorch checkpoints are not accepted as direct chat runtimes.

## Release caveats

ONNX Runtime GenAI's Java API is currently documented as requiring a source-built Android AAR, and its Android native packaging must be checked for 16 KB ELF alignment before release. The upstream build system now explicitly sets a 16 KB maximum page size for Android, but Ya-Ali must verify the actual packaged AAR/APK rather than trusting the flag.

LiteRT-LM 0.16.x has active native lifecycle crash reports. Ya-Ali therefore uses a short-lived engine/conversation lifecycle and still requires real-device regression tests before declaring it production-stable.
