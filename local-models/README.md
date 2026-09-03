# Ya Ali local GGUF models

Android now has a real llama.cpp native inference bridge. The Android build fetches pinned llama.cpp b10516 with CPU/arm64 settings suitable for Android.

Recommended starting point: a small instruct/chat GGUF (about 0.5B–3B parameters, Q4_K_M or similar). Larger models may exceed phone RAM.

Models are copied into the app's private storage and are not uploaded by Ya Ali.
