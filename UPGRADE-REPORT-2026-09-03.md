# Ya Ali — Runtime Upgrade Report

Date: 2026-09-03

## User test findings addressed

- Android speech recognition no longer forces `EXTRA_PREFER_OFFLINE=true`. The native plugin now prefers Android's on-device recognizer when the device exposes one, otherwise uses the system recognizer, reports specific error codes, and has a 30-second timeout.
- Local GGUF inference now applies the GGUF model's own chat template when available, checks context capacity before decoding, uses a mobile-safe default context of 2048 and output cap of 384 tokens, and reports an empty-generation error instead of appearing to wait forever.
- Local model management now supports multiple imported GGUF files with a selector and delete action.
- Custom local endpoints can discover models from `/v1/models` or Ollama `/api/tags`; the selected endpoint model is stored instead of showing an unrelated hard-coded model name.
- Non-GGUF models are not falsely treated as on-device llama.cpp models. They can be used through a local OpenAI-compatible endpoint (Ollama/LM Studio/LocalAI) when that endpoint exposes the model.
- The language bank gains an additional curated seed vocabulary layer covering Iraqi Arabic, Lebanese Arabic, and American English, with Persian translations, transliteration/pronunciation, examples, topics, and CEFR-style levels.
- The learning screen now works with both Arabic and American-English entries instead of assuming every learning card contains Arabic fields.
- Translator prompting now explicitly requests natural Iraqi/Lebanese colloquial output or natural American English and returns four learner-oriented fields: natural translation, literal translation, pronunciation, and note.
- Tab visuals now use a distinct color identity per tab with gradients, glow, hover/transition treatment, and active-tab emphasis.
- Groq model IDs were updated from models deprecated in August 2026 to current free-plan model IDs documented by Groq.

## External research used

- llama.cpp's Android guidance recommends arm64-v8a and disabling OpenMP/llamafile for Android; the project's JNI bridge follows that direction. The official simple-chat example also uses the model-provided chat template before tokenization and generation.
- Android's current `SpeechRecognizer` API supports on-device recognition when available and exposes explicit errors such as network, language unavailable, insufficient permissions, and recognizer busy.
- AnkiDroid demonstrates mature SRS, statistics, TTS, rich media, and large premade-deck workflows; Ya Ali should move toward the same depth of review history rather than a simple session score.
- Yap demonstrates sentence-based SRS where the target vocabulary is learned in natural sentence context; this is a strong next-step direction for Ya Ali.
- sherpa-onnx documents fully local Android speech recognition; this is the preferred future path if Android's system recognizer is not reliable enough for offline STT.
- MLC LLM demonstrates another viable Android local-model architecture where converted model packages can be bundled or downloaded; this can be considered for non-GGUF on-device support in a later phase.

## Free/low-cost online providers

The application keeps OpenRouter, Gemini, and Groq. Current provider research indicates:

- OpenRouter currently lists a free-model router and multiple free models, with free-plan request limits.
- Gemini Developer API currently has a free tier for selected models, subject to project/account limits.
- Groq currently documents free-plan limits for several models including `openai/gpt-oss-20b` and `openai/gpt-oss-120b`.
- Cerebras currently advertises a $5 free trial credit rather than an unlimited permanent free tier, so it is better treated as an optional trial provider, not promised as permanently free.

## Important runtime limitation

Direct on-device inference in this build remains GGUF/llama.cpp. A different model format should only be added as a real native backend after selecting and integrating a compatible Android runtime (for example MediaPipe/MLC/ONNX Runtime/sherpa-onnx for their respective model families). The UI therefore exposes non-GGUF local models through endpoint discovery rather than pretending every format is directly loadable by llama.cpp.

## Acceptance status

Static source checks: performed.

Full Android rebuild in this environment: not claimed here because the current execution environment does not contain the project's installed npm/Gradle dependency cache and cannot rely on external downloads.

The next device test should specifically cover:

1. STT with Wi-Fi on and off.
2. STT Persian and English.
3. One small 2–4B GGUF model and one larger model.
4. Switching between two imported GGUF files.
5. Local generation of a short Persian prompt and an English prompt.
6. Translator output for an Iraqi phrase, a Lebanese phrase, and American English.
7. Groq connection test after updating its model IDs.
8. Custom endpoint model discovery.
