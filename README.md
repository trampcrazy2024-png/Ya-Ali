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
