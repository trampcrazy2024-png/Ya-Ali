# Ya-Ali 1.0.5 — Release Status

## Current state

1.0.5 development foundation has been applied to the architecture, learning core, database and non-GGUF runtime boundary.

### Applied
- learning-core foundations for research, adaptive scenarios, pronunciation, DDA, sentence mining, grammar, translation memory, context vocabulary, analytics, gamification and immersion
- advanced AI/provider contracts for the remaining feature families
- database migration v8
- ONNX ZIP bundle import and safe extraction
- non-GGUF runtime lifecycle hardening
- version bump to 1.0.5

### Not yet release-proven
- actual `npm ci` with package downloads
- full Vitest suite with installed dependencies
- full TypeScript workspace typecheck with installed dependencies
- Vite production build
- Capacitor Android sync
- Android debug APK build
- device inference for ONNX/PTE/LiteRT-LM
- Sherpa-ONNX real-device benchmark

GitHub upload is intentionally not part of this stage.

## Latest 1.0.5 hardening batch — 2026-09-07

Applied:

- real Sherpa-ONNX Android STT/TTS plugin
- AudioPipeline bridge
- explicit Sherpa model registry with provenance
- adaptive scenario JSON generator
- Deep Research Lite report builder + Markdown export
- frequency/staleness-aware Corpus Curator
- model format distinction for ONNX GenAI bundles
- database-learning integration contract test
- Gradle wrapper verification gate
- 1.0.5 release gate script

Research basis: Sherpa-ONNX supports fully local Android ASR/TTS, provides Java/Kotlin APIs, and current upstream catalogs include Arabic/Persian-capable ASR options and Arabic/Persian TTS model families. citeturn1search5turn7search2turn8search0

### Not falsely marked complete

- The actual `gradle-wrapper.jar` cannot be generated in this offline environment because no Gradle installation is available and the wrapper artifact cannot be downloaded. The repository now contains an explicit verification/generation gate instead of a fake binary.
- Full `npm ci` and Android Gradle build remain environment-gated until a networked build environment supplies missing npm/Gradle artifacts.
- Exact acoustic phoneme scoring is not equated with ASR token matching; it remains a separate acoustic-alignment requirement.

## Verification after Audio/Adaptive batch

- `bash scripts/verify-npm-lock.sh` — PASS
- `npm ci --dry-run --ignore-scripts --offline` — PASS (lock/workspace consistency)
- real `npm ci --offline` — BLOCKED by uncached `yauzl-2.10.0.tgz`; this is an environment/cache limitation, not a lockfile mismatch
- JSON syntax — PASS
- shell syntax — PASS
- TypeScript syntax for new Core modules — PASS; dependency-backed mobile compilation remains blocked until dependencies are installed
- App TSX syntax — PASS after correction; remaining compiler output is dependency-resolution only
- Java syntax parse — no Java syntax errors observed; dependency/Android SDK classes are unavailable in this environment
- ZIP integrity — PASS
- Gradle Wrapper JAR — still missing; generation script added, but this environment has no Gradle installation and no network
- GitHub upload — NOT performed
