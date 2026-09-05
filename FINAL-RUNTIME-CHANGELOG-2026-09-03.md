# Ya Ali — Final Runtime Hardening Changelog

## Fixed from device report
- STT crash hardening: all SpeechRecognizer lifecycle operations run on Android main thread, on-device recognition is preferred when available, and a safe system recognition activity fallback is used.
- Avoided calling `cancel()` from inside `RecognitionListener.onError()`, which can recurse through OEM recognition services.
- Added SpeechRecognizer destroy/recreate lifecycle handling and a 30-second timeout.
- Added native Android clipboard support for reliable Logcat copying.
- Android Logcat is filtered to useful Ya Ali/native crash/STT/TTS/JNI/llama/libc/ANR lines.
- Local GGUF generation now has native cancellation and a JS safety timeout.
- Local inference errors are returned as errors rather than being displayed as if they were model answers.
- Language-bank mirror version was advanced and legacy v2/v3 data is migrated into the new mirror, so the larger seed bank is not silently skipped.

## Product upgrades
- Built-in vocabulary seed expanded substantially for Iraqi Arabic, Lebanese Arabic and American English.
- Learning screen now has persistent spaced review with Again/Hard/Good/Easy ratings, due items and study streak.
- Added microphone pronunciation practice with text-match feedback.
- Translator now presents Natural Translation first and expandable Literal/Pronunciation/Note/Example sections.
- Local Model Library supports multiple imported GGUF models, selection, Load and Delete.
- Custom endpoint model discovery supports OpenAI-compatible `/v1/models` and Ollama `/api/tags`.
- Added Hugging Face Inference Providers and Cloudflare Workers AI provider integrations.
- Local GGUF is the first AI route; online providers are fallbacks/complements.
- Added polished per-tab visual tokens and learning/model/diagnostic components.
- Replaced launcher icon assets with the approved Ya Ali app icon and included the source image under `design/`.

## Technical boundary
- Direct on-device LLM execution remains GGUF/llama.cpp.
- Non-GGUF models are selected through compatible endpoints (Ollama/LM Studio/LocalAI/OpenAI-compatible) rather than being falsely treated as native GGUF files.
- Pronunciation scoring is text similarity, not acoustic phoneme scoring.
- Full Android build/runtime verification must still be performed in a connected Android build environment/device.
