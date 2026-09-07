# Ya-Ali 1.0.5 — Audio Core

## Runtime

Ya-Ali now contains a real Android Sherpa-ONNX plugin for:

- streaming ASR from `AudioRecord`
- local VITS/Piper-compatible TTS
- `AudioTrack` playback
- explicit model paths and provenance
- 30-second STT safety timeout
- resilient fallback to the existing Android recognizer

Sherpa-ONNX documents Android as fully local for real-time speech recognition and provides Android builds/APIs for both ASR and TTS. Current upstream model catalog includes Arabic ASR and multilingual Qwen3 ASR with Arabic and Persian support. The Qwen3 0.6B int8 model is approximately 1.95 GB and therefore is not bundled into the APK.

## Model policy

Models are **not silently downloaded**. A model must be explicitly installed and its source/license recorded.

Recommended model families:

- Arabic: Sherpa-ONNX Arabic/Moonshine or a compatible streaming transducer where available.
- Persian: Qwen3-ASR 0.6B int8 through Sherpa-ONNX for high-quality offline recognition; use VAD/simulated streaming when low-latency streaming is required.
- TTS: VITS/Piper-compatible Sherpa-ONNX voices; Arabic and Persian model catalogs are available upstream.

## Important limitation

Phoneme-level pronunciation scoring is kept separate from ASR text recognition. ASR tokens are not treated as true acoustic phonemes. Exact phoneme scoring requires an acoustic alignment/phoneme model and will not be falsely represented as complete merely because STT succeeds.
