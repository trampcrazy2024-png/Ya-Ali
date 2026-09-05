# Ya-Ali Professional Upgrade — 2026-09-04

This release strengthens the app around four production concerns: truthful runtime capability reporting, local performance measurement, privacy-safe diagnostics/export, and Android 16 readiness.

## Research-driven changes
- LiteRT-LM now has an official Android/JVM path and GPU/NPU backends; the project keeps it as an explicit runtime rather than pretending a `.litertlm` file is GGUF. See Google AI Edge documentation.
- ONNX Runtime GenAI supports the generative loop and ONNX Runtime Mobile supports Android CPU/NNAPI/XNNPACK. The app's runtime matrix remains explicit until the native bridge is actually installed.
- sherpa-onnx supports fully local Android STT/TTS and provides Android prebuilt libraries/releases. Voice packs remain license-aware and are not populated with unverified Arabic download URLs.
- Android 16 requires edge-to-edge handling for apps targeting API 36 and changes back navigation toward predictive-back APIs. The UI shell therefore avoids relying on legacy back dispatch and keeps native integration isolated.

## New capabilities
1. Performance Lab: measures real local-model response latency and characters/sec on-device.
2. Privacy Center service: redacts provider secrets from exported diagnostics and exposes a local privacy report.
3. Cache hygiene: removes only known Ya-Ali diagnostic/cache prefixes, never the user's conversations or language bank.
4. Device Health: reports network, storage estimate, hardware concurrency and viewport/device-memory hints when the platform exposes them.
5. Additional tests for performance safety.

## Non-claims
- LiteRT-LM, ONNX Runtime GenAI and ExecuTorch are not claimed as directly executable until their native Android bridges are present and tested.
- No fake dialect TTS URLs are added.
- API keys are still stored using the existing app storage layer; a future Android Keystore bridge is the correct next security step.
