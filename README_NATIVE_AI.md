# Ya Ali — Native AI architecture

## On-device GGUF
Android uses a JNI bridge (`LocalAIPlugin` → `yaali_llama_jni` → llama.cpp). The Android CMake build fetches pinned llama.cpp `b10516` and builds an arm64 CPU backend. A GGUF selected in the app is copied into private app storage, loaded with mmap, and used for local token generation.

The project intentionally does not ship a multi-hundred-MB model inside the source ZIP. Users select a compatible GGUF once on the phone. A small instruct model is recommended for phones with limited RAM.

## Network AI
OpenRouter, Gemini, Groq and an OpenAI-compatible endpoint remain optional. Custom endpoints support Ollama/LM Studio/LocalAI on a reachable computer. Android cleartext traffic is enabled because local endpoints commonly use `http://192.168.x.x:port`.

## Diagnostics
Provider connection tests record HTTP/DNS/API errors and latency. Android logcat remains best-effort because Android does not grant ordinary apps unrestricted access to every process' logs.

## 0.5.0 Edge Runtime status
- ExecuTorch Android 1.4.0: wired through `EdgeAIPlugin` for PTE text LLMs.
- ONNX Runtime Android 1.29.0: included as the generic Android ONNX foundation.
- ONNX Runtime GenAI 0.15.2: real Java generation path is available when the official source-built Android AAR is placed at `android/app/libs/onnxruntime-genai-android-0.15.2.aar`; run `scripts/setup-onnx-genai-android.sh` for the exact build recipe.
- LiteRT-LM 0.16.1: packaged and capability-detected. Generation is intentionally not claimed until the upstream Android API can be bound without an unstable guessed signature.
- Endpoint Lab detects OpenAI `/v1`, Responses, Ollama, LM Studio `/api/v1`, llama.cpp, LocalAI, vLLM and MLC compatibility.
