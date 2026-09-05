# Edge Runtime Versions

Current pinned runtime targets for the 0.5.0 Android build:

| Runtime | Version | Role |
|---|---:|---|
| ExecuTorch Android | 1.4.0 | PTE LLM execution |
| ONNX Runtime Android | 1.29.0 | Generic ONNX runtime / foundation |
| ONNX Runtime GenAI | 0.15.2 | Optional ONNX generative API, loaded as local AAR |
| LiteRT-LM Android | 0.16.1 | LiteRT-LM capability detection and future stable bridge |
| Android API | 36 | Android 16 target |
| NDK | 28.2.13676358 | 16 KB page-size aware native build |
| AGP | 8.13.2 | API 36 build tooling |
| Gradle | 8.13 | Android build toolchain |

ExecuTorch is wired through its Android Java LLM API. ONNX Runtime GenAI is intentionally optional because the official Java package is currently published as a source-built AAR rather than a stable Maven artifact. LiteRT-LM is detected from its installed Android library, but the bridge does not guess a reflection signature for generation; that avoids shipping a false-positive runtime.

**Why:** non-GGUF formats require their own runtime. Renaming a file to `.gguf` must never turn it into a llama.cpp model.

**When not to use:** do not claim ONNX GenAI or LiteRT-LM generation is active unless Diagnostics reports the corresponding runtime as available.

**Stale when:** any upstream runtime release, Java API, or Android packaging contract changes.

Code: `android/app/src/main/java/com/yaali/assistant/plugins/EdgeAIRuntimePlugin.java`, `apps/mobile/src/modelFormats.ts`.
