# Ya-Ali 1.1.0-rc.1 — The Adaptive Voice

## Status
Release candidate engineering is implemented, but **release gate is not yet green** in this offline build environment.

## Implemented in this batch
- Re-checked and fixed compile errors in adaptive scenario generation under `exactOptionalPropertyTypes`.
- Removed duplicate LiteRT-LM capability assignment in `EdgeAIRuntimePlugin`.
- Added two-minute Micro-Learning challenge generator targeting the weakest Skill Vector skills.
- Connected adaptive scenario vocabulary to due SRS items in the learning UI.
- Added privacy-preserving local telemetry for STT/TTS/inference timing and failure counts; no text/audio/prompt/API-key data is stored and no network upload occurs.
- Added migration v9 for micro-challenges and privacy telemetry storage.
- Added reproducible `scripts/release-gate-1.1.0-rc.sh`.
- Versioned package/mobile metadata as `1.1.0-rc.1`.

## Gate blockers
- `gradle-wrapper.jar` is still absent in this environment.
- Actual `npm ci` cannot complete offline because `yauzl-2.10.0.tgz` is not cached.
- Therefore full workspace typecheck/test/build and Android assembleDebug cannot honestly be marked PASS here.
- Real-device Sherpa STT/TTS benchmark still requires a connected Android device.

## Definition of done for release
1. Networked reproducible environment runs `npm ci`.
2. `npm run typecheck`, `npm test`, `npm run build` all pass.
3. Valid Gradle wrapper JAR is generated/checked in and verified.
4. `npm run android:sync` and `./gradlew :app:assembleDebug` pass.
5. APK is installed on a representative Android 16 device.
6. Sherpa STT/TTS latency/RAM/CPU benchmark is captured.
7. Only then is 1.1.0 promoted from RC to release and GitHub publication considered.
