#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
command -v node >/dev/null && echo "node=$(node --version)" || echo "node=MISSING"
command -v npm >/dev/null && echo "npm=$(npm --version)" || echo "npm=MISSING"
if [[ -n "${JAVA_HOME:-}" ]]; then echo "JAVA_HOME=$JAVA_HOME"; fi
if [[ -n "${ANDROID_HOME:-}" ]]; then echo "ANDROID_HOME=$ANDROID_HOME"; fi
[[ -x android/gradlew ]] && echo "gradlew=OK" || echo "gradlew=MISSING"
[[ -f package-lock.json ]] && echo "package-lock=OK" || echo "package-lock=MISSING"
[[ -f android/app/src/main/cpp/CMakeLists.txt ]] && echo "native-cmake=OK" || echo "native-cmake=MISSING"
echo "runtime-matrix=GGUF/llama.cpp + ONNX/GenAI-ready + ExecuTorch/PTE-ready + endpoint fallback"
echo "android-api=$(grep -E 'compileSdkVersion|targetSdkVersion' android/variables.gradle | tr '\n' ';')"
echo "ndk=$(grep -E 'ndkVersion' android/app/build.gradle | head -1 | tr -d '\n')"
echo "edge-runtime=ExecuTorch 1.4.0 + ONNX Runtime 1.29.0 + LiteRT-LM 0.16.1 + optional ONNX GenAI 0.15.2 AAR"
