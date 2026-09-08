# Ya-Ali 1.0.2 — Architecture

## Target
Offline-first Android 16 assistant with local DB as source of truth and pluggable AI/STT/TTS providers.

## Layers
1. UI: React/Vite/Capacitor; safe-area and dynamic viewport aware.
2. Application: conversation, learning orchestration, adaptive planning, voice packs.
3. Domain: FSRS-compatible review state, skill vector, CEFR progression, learning modes.
4. Data: Capacitor SQLite + repositories + versioned migrations; local mirror is a resilient cache only.
5. Runtime: provider interfaces for local AI (llama.cpp/MediaPipe/ONNX/LiteRT) and optional cloud providers.
6. Native: Android STT/TTS and resource downloads; lifecycle operations stay on Android main thread where required.

## Offline-first contract
- Local DB remains authoritative for learning and vocabulary state.
- Network is optional and only augments packs/models/providers.
- UI must remain usable when network and cloud providers are unavailable.
- Imported data is validated before insertion.

## Speech reliability
Recognition Activity is attempted first. If an OEM returns cancellation without a result, the plugin falls back to direct `SpeechRecognizer`. Direct recognizer creation, start, cancel and destroy are posted to the main thread. Runtime microphone permission is checked before starting.

## Resource management
Voice packs stay outside the APK. Custom HTTPS/HTTP sources are allowed with a 512MB per-pack ceiling and SHA-256 metadata when Web Crypto is available.

## Rollback
The pre-upgrade healthy checkpoint is commit `482c99ed7bcaf552b3cb6b0d59d9634dc84fe86d`. Restore the checkpoint before applying any later batch if a build or runtime regression appears.
