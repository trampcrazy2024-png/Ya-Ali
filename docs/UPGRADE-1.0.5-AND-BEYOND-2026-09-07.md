# Ya-Ali 1.0.5+ — Architecture and Learning Upgrade

Date: 2026-09-07

## Release intent

Ya-Ali 1.0.5 extends the existing offline-first architecture without collapsing all local models into a single runtime. The learning system remains domain-first and deterministic where possible; AI/network features enter through provider ports.

## Implemented in this pass

### Architecture / runtime
- Android target/compile SDK remains API 36.
- Non-GGUF model routing is explicit:
  - GGUF → llama.cpp
  - ONNX GenAI bundle → ONNX Runtime GenAI
  - PTE → ExecuTorch + tokenizer
  - LiteRT-LM → LiteRT-LM
  - Safetensors/PyTorch → conversion or endpoint; never passed to llama.cpp
- ONNX model bundles can be imported as ZIP archives and safely extracted into app-private storage.
- ZIP path traversal is rejected.
- Native model listing/deletion handles ONNX directories.
- ExecuTorch native resources are closed after generation.
- LiteRT-LM uses an explicit initialize → conversation → response → close lifecycle because current releases have documented native lifecycle crash reports; Ya-Ali does not retain a conversation between calls.
- ONNX GenAI uses the current Model/Tokenizer/Generator/GeneratorParams API shape through a reflection boundary so the optional AAR remains optional.
- Runtime capability reporting is conservative.

### Learning system foundation
Pure/core modules now provide deterministic building blocks for:
1. Deep Research planning
2. Adaptive Scenario Generator briefs
3. Phoneme-level pronunciation scoring
5. Dynamic Difficulty Adjustment
7. Context-aware vocabulary suggestions
10. Learning Analytics aggregation
11. Gamification XP/levels/badges
15. Dynamic difficulty
16. Sentence mining
17. Grammar checker rules
18. Translation Memory ranking
19. Immersion tracking

Advanced provider contracts now cover:
- Deep Research
- phoneme scoring
- offline speech
- voice commands
- multilingual/custom TTS
- voice cloning
- shadowing
- corpus curation
- offline Wikipedia
- cross-device sync
- social learning

## Durable database

Migration v8 adds durable tables for:
- research reports
- generated adaptive scenarios
- phoneme scores
- translation memory
- grammar mistake bank
- gamification state
- immersion events

The database version is now 8.

## The remaining product slices

The following are intentionally provider/infrastructure work, not fake local implementations:

- Social Learning & Leaderboards: requires authenticated sync/backend policy.
- Voice-Activated Commands: requires a real STT/intent runtime.
- Shadowing: requires audio alignment/phoneme timing implementation.
- Offline Wikipedia: requires licensed downloadable article packs and an offline index.
- Sherpa-ONNX STT: requires Android native runtime/model packaging and device benchmarks.
- Multilingual custom TTS: requires real voice packs/runtime integration and provenance metadata.
- Cross-platform Sync: requires identity, conflict resolution, encryption and server policy.
- Voice cloning: requires an actual local TTS/voice-cloning model and a consent/privacy flow.

These are not marked complete merely because interfaces exist.

## Non-GGUF policy

Raw `.safetensors`, `.bin`, `.pt`, and `.pth` checkpoints are not executable mobile chat models. They must be exported to a mobile runtime or used behind an endpoint. Renaming an extension is never treated as conversion.

ONNX GenAI is a model-directory format in practice; Ya-Ali therefore supports importing a ZIP bundle containing ONNX model files instead of pretending that a single arbitrary `.onnx` file is always a complete chat model.

ExecuTorch LLM deployment uses exported `.pte` programs plus tokenizer/model assets. LiteRT-LM uses `.litertlm` bundles and an explicit engine lifecycle.

## Verification status

Static checks completed in this environment:
- JSON syntax: PASS
- shell syntax: PASS
- npm lock/workspace metadata: PASS

The Android Gradle wrapper JAR is missing from the supplied source archive and the environment cannot fetch it because DNS/network access is unavailable. Therefore a dependency-backed Android compile/build has not been falsely declared PASS.

A real `npm ci` remains the release gate because this environment has no usable package cache/network path. The release gate must run in a networked build environment before publishing 1.0.5.
