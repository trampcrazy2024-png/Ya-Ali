# Ya-Ali 0.5.0 — Endpoint + Edge Runtime Professional Upgrade

## Delivered
- API 36 / Android 16 build baseline.
- NDK r28c line with explicit 16 KB linker alignment.
- AGP 8.13.2 + Gradle 8.13.
- ExecuTorch 1.4.0 Android LLM bridge for PTE.
- ONNX Runtime Android 1.29.0 foundation.
- Optional ONNX Runtime GenAI 0.15.2 AAR path with real Java API generation when the AAR is installed.
- LiteRT-LM 0.16.1 dependency + truthful capability detection.
- Endpoint matrix for OpenAI, Responses, Ollama, LM Studio, llama.cpp, LocalAI, vLLM and MLC compatibility.
- Android LAN/CORS-safe probing through CapacitorHttp.
- Exact user-supplied app icon copied into Android and PWA icon assets.
- Runtime diagnostics and tests extended.

## Verification
Static checks, JSON validation, icon hash validation and targeted source tests were run. Full npm/Gradle builds require the project dependencies and Android SDK/NDK cache to be available; no green build claim is made without that environment.

**Stale when:** this release is superseded or any pinned runtime version changes.
