# Ya Ali — یا امیرالمؤمنین علی علیه السلام

Persian-first offline-capable language assistant focused on Iraqi Arabic, Lebanese Arabic and American English.

## AI routes
- Direct online Free-tier providers: OpenRouter, Gemini, Groq.
- Multiple model fallback per provider.
- Custom OpenAI-compatible endpoint for Ollama/LM Studio/LocalAI or another compatible local/network runtime.
- Android Local GGUF model import/lifecycle bridge is included. Native inference requires a linked llama.cpp runtime in the Android APK.
- When no AI route works, local language-bank search remains available.

## Language bank
SQLite-backed repositories plus a local mirror, seed vocabulary/phrases, dialect metadata, pronunciation, examples, favorites, learned state and import/export.

## Diagnostics
The app includes a Persian `عیب‌یابی` tab with application logs, export/clear actions and best-effort Android logcat capture. Android sandbox/security restrictions can prevent an ordinary app from reading unrelated system logs.

## Brand
App name: **Ya Ali**
Persian title: **یا امیرالمؤمنین علی علیه السلام**


## Ya Ali final verification

Project name: **Ya Ali** — **یا امیرالمؤمنین علی علیه السلام**.

Primary learner language: Persian. Supported learning targets: American English (`en-US`), Iraqi Arabic (`ar-IQ`), and Lebanese Arabic (`ar-LB`).

### AI modes

1. Online free-tier providers: OpenRouter, Gemini, and Groq (provider availability and quotas can change).
2. OpenAI-compatible endpoint: useful for Ollama, LM Studio, LocalAI, or another compatible local/network runtime.
3. Native local GGUF: the Android app provides model import/management and exposes a native LocalAI interface. A GGUF file alone is not an inference engine; a compatible native `llama.cpp` library must be bundled for on-device generation.
4. Local Language Bank remains available as a deterministic offline fallback.

### Diagnostics

The Diagnostics tab stores application logs and can request available Android logcat output. Android security restrictions may prevent an ordinary app from reading protected logs from other processes; the app therefore shows whatever logcat the OS permits and redacts common credentials/tokens before display.

### Verification

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run android:sync
cd android && gradle --no-daemon assembleDebug
```

The GitHub Actions workflow also runs the web checks and builds a debug APK artifact.
