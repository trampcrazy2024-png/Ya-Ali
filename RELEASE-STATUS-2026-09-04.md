# Ya-Ali 0.6.0 Release Status

## Implemented
- FSRS-6-compatible DSR scheduler with migration from `yaali_srs_v1`.
- Adaptive learning skill vector and priority queue.
- Expanded endpoint capability matrix: OpenAI Chat/Responses/Embeddings, Ollama, LM Studio, llama.cpp legacy completion, LocalAI, vLLM and MLC-compatible surfaces.
- Custom endpoint generation fallback chain expanded.
- LiteRT-LM Android generation bridge is now wired through the official Kotlin API's Java-callable synchronous `Conversation.sendMessage` path; CPU/GPU/NPU backend selection is supported.
- ONNX Runtime Android 1.29.0 + QNN package and ExecuTorch Android 1.4.0 + Vulkan package are declared.
- Android target/compile SDK 36 and 16 KB readiness retained.
- User-provided app icon retained as the canonical source asset.

## Verification
- JSON/XML sanity checks: PASS.
- Targeted TypeScript checks for learning/adaptive modules: PASS.
- Targeted TypeScript check for endpoint matrix: PASS.
- `git diff --check`: PASS.
- Full npm TypeScript/build gate: BLOCKED by missing project `node_modules` in the execution environment.
- Android Gradle gate: BLOCKED because `gradle-wrapper.jar` is absent and network access cannot fetch it.

Do not call this APK/build-green until the full gates run in a provisioned Android/npm environment.
