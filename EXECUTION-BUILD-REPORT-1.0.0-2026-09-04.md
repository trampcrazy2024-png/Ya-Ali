# گزارش اجرایی کامل Ya-Ali Professional 1.0.0

## 1. خلاصه اجرایی
این سند برای مجری/Build Engineer نوشته شده است. نسخه 1.0.0 ادامه مستقیم نسخه 0.9.0 است و دو مسیر را هم‌زمان ارتقا می‌دهد:
1. Learning OS: SQLite-first durable review ledger، FSRS-6 telemetry/optimizer و زیرساخت recovery.
2. Runtime/Architecture: benchmark و auto-selection برای Runtimeهای محلی و health-aware endpoint routing.

## 2. ساختار اصلی پروژه
```text
apps/mobile/
  src/App.tsx                 UI اصلی
  src/ai.ts                   AI providers/router
  src/learning.ts             FSRS-6 scheduler + adaptive learning
  src/services/
    adaptiveLearning.ts       skill adaptation
    dialectEngine.ts          dialect definitions/prompts
    dialectLearning.ts        per-dialect mastery/confusion
    learningPersistence.ts    SQLite durable learning I/O
    learningRecovery.ts       ledger audit
    runtimeBenchmark.ts       local runtime benchmark
    runtimeAutoSelect.ts      fastest-runtime selection
    edgeAiRuntime.ts          Capacitor EdgeAI bridge
    endpointMatrix.ts         endpoint protocol detection
    endpointProfiles.ts       endpoint pool/health scoring
    endpointPersistence.ts    endpoint SQLite persistence
    secureStorage.ts          Android secure storage bridge
    voicePackManager.ts       voice packs
    diagnosticsEngine.ts      diagnostics
  modelManager.ts             local model import/load/status
  languageBank.ts              SQLite migrations + language bank
packages/database/
  src/migrations/v001_initial.ts
  src/migrations/v002_language_bank.ts
  src/migrations/v003_learning.ts
  src/migrations/v004_learning_runtime.ts
  src/migrations/v005_learning_os.ts
android/
  app/src/main/java/com/yaali/assistant/plugins/
    EdgeAIRuntimePlugin.java
    LocalAIPlugin.java
    YaAliSecureStoragePlugin.java
```

## 3. Learning architecture
```text
User interaction
   ↓
Learning Signal
   ↓
Adaptive Learning
   ↓
Dialect Learning / Skill Vector
   ↓
FSRS-6 Review
   ↓
localStorage mirror + SQLite projection
   ↓
append-only learning_review_log + learning_events
   ↓
Analytics / Recovery / Optimizer
```

### FSRS-6
- 21 default parameters are retained.
- Default desired retention is 0.90.
- Do NOT manually replace FSRS parameters without a controlled optimizer experiment.
- The 1.0.0 optimizer changes only the recommended desired-retention target based on observed outcomes and keeps a conservative range.

### Dialects
Supported learning targets:
- Iraqi Arabic
- Lebanese/Levantine
- Gulf Arabic
- Saudi Arabic
- Egyptian Arabic
- Modern Standard Arabic (MSA)
- American English

Dialect mastery is tracked separately from global skill mastery. Confusion events are used to prioritize recognition exercises.

## 4. Runtime architecture
```text
Model format
 ├─ GGUF       → llama.cpp
 ├─ PTE        → ExecuTorch
 ├─ ONNX       → ONNX Runtime / ONNX GenAI when AAR exists
 ├─ LiteRT-LM  → LiteRT-LM
 ├─ Safetensors/PyTorch/TFLite → export or compatible endpoint
```

### Important truthfulness rule
A non-GGUF file must never be presented as directly executable by llama.cpp. Runtime selection is format-specific.

### Current Android runtime dependencies
From `android/app/build.gradle`:
- `org.pytorch:executorch-android:1.4.0`
- `org.pytorch:executorch-android-vulkan:1.4.0`
- `com.microsoft.onnxruntime:onnxruntime-android:1.29.0`
- `com.microsoft.onnxruntime:onnxruntime-android-qnn:1.29.0`
- `com.google.ai.edge.litertlm:litertlm-android:0.16.1`
- optional local `onnxruntime-genai-android-0.15.2.aar`

If the optional GenAI AAR is absent, generic ONNX Runtime remains available but ONNX GenAI chat generation is not claimed as available.

## 5. Endpoint architecture
Supported families include:
- OpenAI-compatible `/v1/*`
- OpenAI Responses
- Ollama `/api/*`
- LM Studio `/api/v1/*`
- llama.cpp
- LocalAI
- vLLM
- MLC

On Android, custom endpoint HTTP is routed through CapacitorHttp to avoid browser CORS restrictions. API keys are supplied through the secure settings path; do not hard-code credentials.

Endpoint pool behavior:
1. Filter enabled profiles.
2. Score capability coverage, latency, priority and failures.
3. Probe stale profiles.
4. Select the healthiest candidate.
5. Record success/failure and latency.

For LAN endpoints on Android use the host's LAN IP, not `127.0.0.1`/`localhost`.

## 6. Android build prerequisites
Install:
- Node.js 20 or newer.
- npm compatible with the Node release.
- JDK compatible with the project's Android Gradle Plugin.
- Android SDK Platform 36.
- Android Build Tools matching the installed SDK.
- Android NDK `28.2.13676358`.
- CMake `3.22.1`.
- Gradle wrapper JAR for the project's configured Gradle version.

Set:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

## 7. First-time dependency installation
From repository root:
```bash
npm ci
```

Do not use `npm install` for the release build unless intentionally regenerating the lockfile.

## 8. Web/PWA build
```bash
npm run typecheck
npm test
npm run build
```

## 9. Capacitor Android synchronization
```bash
npx cap sync android
```

## 10. Debug APK build
Recommended one-command build:
```bash
./scripts/build-apk.sh
```

Equivalent manual sequence:
```bash
npm ci
npm run build
npx cap sync android
cd android
./gradlew clean assembleDebug --no-daemon
```

Expected output:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The helper script copies it to:
```text
artifacts/ya-ali-1.0.0-debug.apk
```

## 11. Release APK
Before signing a release APK:
1. Configure a private keystore outside source control.
2. Put passwords in environment/CI secret storage.
3. Configure the release signing block in Gradle.
4. Run:
```bash
cd android
./gradlew clean assembleRelease --no-daemon
```

Never commit `.jks`, passwords, API keys or signing secrets.

## 12. Android 16 / 16 KB page-size requirements
The project targets SDK 36 and includes native linker configuration for 16 KB page-size compatibility. Verify the final APK/AAB with:
```bash
bash scripts/check-16kb.sh
```

Also test installation and native runtime loading on an Android 16 device/emulator configured for 16 KB pages.

## 13. Local AI model setup
### GGUF
Import a compatible instruct/chat GGUF through the model manager. llama.cpp is the execution runtime.

### ExecuTorch
Use a PTE model plus the required tokenizer assets. The native plugin executes PTE through ExecuTorch.

### ONNX
Generic ONNX Runtime is packaged. ONNX GenAI chat requires the optional GenAI Android AAR. Use the supplied setup script/documentation to build/install that AAR from the official source.

### LiteRT-LM
Use a model exported for LiteRT-LM and ensure the packaged LiteRT-LM runtime matches the project's dependency. CPU/GPU/NPU backend selection is runtime-dependent; do not assume all devices expose all backends.

## 14. Runtime benchmark / auto selection
After a model is loaded on Android:
```text
benchmarkAvailableRuntimes()
        ↓
SQLite runtime_benchmarks
        ↓
fastest successful chars/sec
        ↓
autoSelectRuntime()
```

Benchmark is real generation, not a synthetic timer. A runtime that cannot generate a response is not considered successful.

## 15. Learning database migrations
Migrations must run in order:
```text
v001 initial
v002 language bank
v003 durable learning events + dialect state
v004 learning review state + endpoint profiles
v005 learning review log + runtime benchmarks + endpoint route events
```

Never delete an existing migration or reuse an existing migration version. New schema changes require a new migration number.

## 16. Recovery strategy
The durable ledger is append-only. Review events include the FSRS state snapshot. This allows:
- auditing review history,
- validating data integrity,
- reconstructing latest known item states,
- future full event replay without changing the scheduler API.

When implementing future replay, preserve event ordering by `created_at` and use deterministic state transitions.

## 17. Secure storage
Sensitive provider credentials should be stored through Android Keystore-backed secure storage. Do not put API keys in source files, `.env` committed files, screenshots or release archives.

## 18. Diagnostics checklist
Run:
```bash
npm run doctor
bash scripts/check-16kb.sh
npm run typecheck
npm test
```
Then on Android verify:
- Local model load
- Local generation
- STT/TTS
- Secure storage
- Endpoint probe
- Endpoint failover
- SQLite migrations
- Learning review persistence
- Dialect mastery updates
- Runtime benchmark

## 19. Network/LAN checklist
For a model server on another machine:
- server must listen on LAN interface, not only loopback;
- Android phone and host must share reachable network;
- use host LAN address such as `192.168.x.x`;
- verify firewall;
- probe `/v1/models` or the relevant native API;
- then run a short chat request.

## 20. Release acceptance criteria
A release is considered build-green only when all of the following are true:
1. `npm ci` succeeds.
2. TypeScript check succeeds.
3. Tests succeed.
4. Vite build succeeds.
5. `npx cap sync android` succeeds.
6. Gradle wrapper and dependencies resolve.
7. Debug APK builds.
8. APK installs on Android 16.
9. 16 KB verification passes.
10. At least one supported local runtime generates successfully.
11. SQLite migration v5 completes on a fresh install and upgrade from 0.9.0.
12. Learning review survives application restart.
13. Dialect learning survives application restart.
14. Endpoint failover works with a deliberately failing first endpoint.

## 21. Current environment limitation
If the build engineer sees a missing `gradle-wrapper.jar`, missing Android SDK/NDK, unavailable Maven repositories, or absent npm dependencies, do not mark the release green. Restore the dependency environment first and rerun the complete acceptance checklist.

## 22. Version identity
- Application: Ya-Ali Professional
- Version: 1.0.0
- Android versionCode: 8
- Date: 2026-09-04
- Release branch/source should retain the pre-change checkpoint for rollback.
