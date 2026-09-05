#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/android/app/libs/onnxruntime-genai-android-0.15.2.aar"
mkdir -p "$(dirname "$OUT")"
if [[ -f "$OUT" ]]; then echo "Already present: $OUT"; exit 0; fi
cat <<MSG
ONNX Runtime GenAI Android 0.15.2 is supported by this project through an optional local AAR.
Build it from the official onnxruntime-genai source with:
  python build.py --build_java --android --android_home <ANDROID_SDK> --android_ndk_path <NDK> --android_abi arm64-v8a --config Release
Then copy the generated build/Android/Release/src/java/build/android/outputs/aar/onnxruntime-genai-release.aar to:
  $OUT
The app will automatically detect the AAR and expose ONNX GenAI in EdgeAI capabilities.
MSG
exit 0
