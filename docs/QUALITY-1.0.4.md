# Ya Ali 1.0.4 — Quality and Regression Gates

## Architecture gate

The workspace typecheck now covers:

- `packages/shared`
- `packages/core`
- `packages/database`
- `apps/mobile`

Core remains dependency-light and defines ports/contracts for persistence and AI providers.

## Test discovery gate

Vitest now includes tests under both `apps/mobile/src/**/*.test.*` and `apps/mobile/tests/**/*.test.ts`. The previous configuration only matched the latter pattern, which could silently skip the actual source tests.

## UI regression gates

The Android WebView interaction layer explicitly provides:

- page-level vertical scrolling
- isolated chat-message scrolling
- touch scrolling on Android WebView
- safe-area aware bottom navigation
- responsive mobile/landscape viewport sizing
- no horizontal overflow
- a 44–46px microphone touch target
- visible listening state and stop behavior

## Speech gate

`NativeSTTPlugin` now declares the microphone permission using Capacitor's permission system and requests it from the `listen` call when needed. Android's `SpeechRecognizer` still requires `RECORD_AUDIO`; the direct recognizer is created on the main thread and destroyed after use. On API 31+, on-device recognition is used when available. citeturn1search0turn3search0

## Content bank gate

The built-in bank combines authored phrases, vocabulary seeds, scenario-derived terms and scenario steps. Imports remain provenance-aware rather than silently converting unknown data into first-party content.
