# Ya-Ali 1.1.0-rc.1 — Recheck Evidence

## Findings fixed during recheck
- `adaptiveScenarioGenerator.ts` had real TypeScript errors under `exactOptionalPropertyTypes`; optional fields are now conditionally supplied and generated skill values are explicitly typed.
- `EdgeAIRuntimePlugin.java` had a duplicate LiteRT-LM capability assignment in the same capabilities object; the duplicate was removed.
- `scripts/verify-gradle-wrapper.sh` and `scripts/install-gradle-wrapper.sh` were still referring to Gradle 8.11.1 while `gradle-wrapper.properties` targets 8.13; both scripts now target 8.13.

## Checks executed
- JSON parse: PASS
- shell syntax (`bash -n`): PASS
- TypeScript/TSX parser/transpile syntax for changed files: PASS
- isolated type/syntax checks for new Core/database modules: PASS
- `bash scripts/verify-npm-lock.sh`: PASS
- `npm ci --offline`: BLOCKED by uncached `yauzl-2.10.0.tgz`
- `bash scripts/verify-gradle-wrapper.sh`: BLOCKED because wrapper JAR is absent

## What is still unproven
The environment has no installed Gradle and cannot complete package downloads, so the following are not claimed as passing:
- full `npm ci`
- full workspace typecheck
- Vitest suite
- Vite production build
- Capacitor Android sync
- Gradle Android assembleDebug
- real-device Sherpa benchmark

The project is therefore still an RC, not a final release.
