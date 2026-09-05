# Ya-Ali 0.3.1 — Final Offline-First Upgrade

## Included
- Offline/PWA shell with service-worker cache and installable web manifest.
- Android safe-area and focus-visible accessibility polish.
- Explicit local-runtime capability matrix for llama.cpp/GGUF, ONNX Runtime GenAI/ONNX, ExecuTorch/PTE, LiteRT-LM, and remote endpoints.
- Diagnostics now reports which native runtime bridges are actually available instead of implying format support equals execution support.
- Runtime matrix unit coverage.
- Existing 0.3.0 mega-upgrade retained: dynamic provider discovery, local/remote AI routing, dialect engine, voice-pack manager, professional diagnostics, language bank, conversation persistence, and non-GGUF truthfulness.

## Truthfulness boundary
The repository still does not claim native LiteRT-LM, ONNX Runtime GenAI, or ExecuTorch execution until the corresponding Android bridges are physically installed and expose capabilities. The runtime matrix makes that state explicit.

## Validation
- JSON/package metadata updated to 0.3.1.
- Runtime matrix and PWA assets are dependency-light.
- Full npm dependency installation/build could not be completed in the sandbox because `npm ci --ignore-scripts` timed out; therefore no APK/build-green claim is made here.
