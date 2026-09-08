# RC1 Stability Notes — Adaptive Voice

## Scope
This pass stabilizes the RC1 voice, local GGUF conversation path, scrolling, and adaptive learning/conversation UX without changing the product architecture.

## Voice
- `NativeSTT` declares the microphone permission through Capacitor and requests it on first use.
- Android system speech recognition remains the provider; offline/on-device availability is preferred when the device exposes it.
- Permission denial is returned as a Persian actionable error instead of a generic `Voice isn't available`.

## Local GGUF conversation
- GGUF generation uses the model's native chat template with separate `system` and `user` messages instead of wrapping the entire transcript as one user message.
- Qwen3 GGUF receives `/no_think` to avoid unnecessary visible/long reasoning on a phone.
- Default local context is reduced to 1536 and response budget to 192 tokens for RC1 responsiveness.
- Generation has a 60-second cancellation guard.
- Conversation prompting is short-turn, adaptive, correction-aware, and explicitly handles one-word/very-short learner messages.

## UI
- Message scrolling uses mobile touch scrolling and contained overscroll to reduce nested-scroll jank.

## Rollback
Use the pre-change checkpoint produced with this pass if the native build or device regression appears.
