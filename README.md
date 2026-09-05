# Ya Ali — یا امیرالمؤمنین علی علیه السلام

Persian-first offline-capable language assistant for Iraqi Arabic, Lebanese Arabic, and American English.

## AI modes
- Online providers: OpenRouter, Gemini, Groq, plus any OpenAI-compatible endpoint.
- Automatic online failure fallback to Local AI, then local language-bank search.
- Local GGUF model import/status management is included. Direct on-device generation requires a native inference engine such as llama.cpp to be linked into the Android APK.
- OpenAI-compatible endpoints can expose non-GGUF models through Ollama, LM Studio, or LocalAI on a reachable machine.

## Speech
- Native Android speech recognition via `NativeSTT` with microphone permission.
- Native Android TTS via `NativeTTS`.
- Browser speech recognition/TTS fallback for non-native builds.

## Diagnostics
The Diagnostics tab exposes application logs and best-effort Android logcat output. Common authorization/API-key/token/password values are redacted before display.

## Supported learning targets
- American English (`en-US`)
- Iraqi Arabic (`ar-IQ`)
- Lebanese Arabic (`ar-LB`)

## Commands
```bash
npm ci
npm run typecheck
npm test
npm run build
npm run android:sync
npm run android:build
```

## Ya Ali — Runtime Hardening Notes (2026-09-03)

- Android STT is crash-hardened: on-device recognition is preferred when advertised; otherwise the Android system recognition activity is used as a safe fallback.
- Native Android clipboard support was added for reliable Logcat copying.
- Android Logcat is filtered toward Ya Ali, AndroidRuntime, SpeechRecognizer, llama.cpp/libc, crash and ANR lines to make native failures diagnosable.
- Local GGUF inference has a user-cancellable generation path and a 90-second safety timeout in the JS layer.
- The language bank now uses a versioned mirror and merges legacy local data with a substantially larger built-in seed set.
- Learning now includes persistent spaced-review scheduling, four review ratings, due counts and a study streak.
- Pronunciation practice compares recognized speech with the target item and gives a learner-friendly similarity score. It is a text-match coach, not acoustic phoneme scoring.
- Online integrations include OpenRouter, Gemini, Groq, Hugging Face Inference Providers, Cloudflare Workers AI, and a custom OpenAI-compatible/Ollama/LM Studio/LocalAI endpoint.
- Direct on-device LLM inference remains GGUF/llama.cpp. Other model formats are exposed through compatible local/remote endpoints instead of being falsely treated as native Android model files.

## Professional hardening (0.4.0)
- Performance Lab for real local inference measurements.
- Privacy Center with secret redaction for diagnostic exports.
- Device Health and controlled cache hygiene.
- Android 16 predictive-back integration using `OnBackInvokedDispatcher`.
- Runtime capability claims remain explicit and truthful; no format-extension spoofing.


### 0.5.0 professional runtime upgrade
Android 16/API 36 baseline, explicit 16 KB native alignment, Endpoint Lab, ExecuTorch PTE execution, ONNX Runtime foundation, optional ONNX Runtime GenAI AAR path, LiteRT-LM capability detection, and the supplied Ya-Ali icon.

## 0.7.0 architecture highlights
- Endpoint Lab discovers OpenAI Chat/Responses/Embeddings, Ollama native APIs, LM Studio native API, llama.cpp legacy completion, LocalAI/vLLM health surfaces, and MLC/OpenAI-compatible gateways.
- Custom endpoint generation uses a compatibility fallback chain rather than vendor-name assumptions.
- Local non-GGUF execution is explicitly separated by runtime: ONNX Runtime/GenAI, ExecuTorch, and LiteRT-LM.
- Learning uses an FSRS-6-compatible scheduler plus adaptive skill prioritization for vocabulary, grammar, pronunciation, listening and conversation.
- Android target/compile SDK 36 and 16 KB-page readiness remain mandatory; native dependencies must be tested on a 16 KB environment before release.


## 0.8.0 architecture highlights
- Android Keystore-backed secure storage for provider secrets, with native migration from legacy localStorage.
- Multi-endpoint profile pool with capability/latency/priority scoring.
- SQLite v3 append-only learning events and durable dialect state.
- Dialect Learning v2: weighted mastery, retention, progression level, daily goal, confusion risk, and pronunciation feedback.


## 0.9.0 architecture highlights
- SQLite v4 durable learning projections and event log.
- FSRS-6 review state hydration from SQLite.
- Seven-dialect learning with confusion-aware practice.
- Durable endpoint pool with capability/latency/failure-aware routing.
