# ADR 0001 — Explicit multi-runtime local AI

## Decision
Ya-Ali routes each model family to an explicit runtime: GGUF to llama.cpp, PTE to ExecuTorch, ONNX GenAI to ONNX Runtime GenAI, and LiteRT-LM packages to LiteRT-LM. Endpoint-hosted formats remain endpoint-backed.

## Why
The application must be honest about execution. Generic file-extension recognition is not enough to guarantee that a runtime can load or tokenize a model. A runtime capability probe plus a real generation path is the acceptance boundary.

## Rejected alternative
A single "universal local model" path was rejected because it would encourage passing incompatible artifacts into llama.cpp and reporting them as runnable.

## Business meaning
Users see a model as ready only when the matching runtime is present. This prevents failed offline sessions and misleading compatibility claims.

## Operational consequence
Android builds now include native runtime dependencies and must be validated for API 36 and 16 KB ELF alignment. Optional ONNX GenAI AAR installation remains a release input.

**Stale when:** the supported local-runtime matrix or Android packaging strategy changes.
