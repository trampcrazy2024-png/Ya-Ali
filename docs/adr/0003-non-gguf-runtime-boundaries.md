# ADR-0003 — Explicit non-GGUF runtime boundaries

## Status
Accepted — 2026-09-07

## Decision

Ya-Ali treats model format, runtime and model package completeness as separate facts.

- GGUF is executed by llama.cpp.
- ONNX GenAI bundles are executed by ONNX Runtime GenAI.
- PTE is executed by ExecuTorch with required tokenizer/model assets.
- LiteRT-LM bundles are executed by LiteRT-LM.
- Raw training checkpoints are not directly executable by the mobile chat path.

## Why

A filename extension does not prove model compatibility. Different runtimes require different graph/program representations, tokenizer assets, quantization formats and native libraries.

## Consequence

The UI reports a model as runnable only after the corresponding native runtime is available. Importing a model and executing a model are separate states.

## Reversal condition

If a future runtime becomes a stable universal mobile execution layer for the supported model families, this boundary can be revisited, but only after real device inference tests for each model family.
