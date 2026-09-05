# Ya-Ali Mega Upgrade — 2026-09-04

This release upgrades the existing runtime-fixed baseline without bundling large AI/audio models into the APK.

## Included
- Multi-runtime model manager contract: GGUF/llama.cpp remains direct; ONNX/PTE/LiteRT are explicitly separate runtimes; remote non-GGUF uses endpoints.
- Dynamic model discovery for OpenRouter free models, Groq active models, Gemini generation models, Hugging Face router models and custom endpoints.
- Provider health/fallback diagnostics.
- Dialect engine for Iraqi, Lebanese, Gulf, Saudi, Egyptian, MSA and American English.
- Dialect-aware prompt building.
- Voice Pack Manager with persistent manifest, progress, install/remove lifecycle and IndexedDB blob storage.
- Professional Diagnostics tab covering runtime, STT, Local AI, models, providers, storage, network and voice packs plus Logcat.
- Test coverage for dialect core.

## Deliberate safety/engineering choices
- No fake model/runtime compatibility: file extensions are not treated as conversion.
- No API keys are embedded in the application bundle.
- Large TTS/ASR/model assets are not shipped inside the APK; they are managed as external packs.
- Dialect-specific Arabic voice assets are not mislabeled when the upstream source does not prove dialect coverage. The manager is ready for a verified CDN/manifest.

## Next recommended upgrade
- Add a native Android secure credential store (Keystore-backed) instead of browser localStorage for API keys.
- Add a real native LiteRT-LM/ONNX Runtime bridge and benchmark it on the target Android 16 device.
- Add verified licensed Iraqi/Lebanese/Gulf/Saudi/Egyptian TTS packs and sherpa-onnx STT models when exact dialect coverage is confirmed.
