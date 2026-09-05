#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-}}"
if [[ -z "${ANDROID_HOME}" ]]; then echo "ERROR: ANDROID_HOME/ANDROID_SDK_ROOT is not set" >&2; exit 2; fi
export ANDROID_HOME
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
(( NODE_MAJOR >= 20 )) || { echo "ERROR: Node.js 20+ required" >&2; exit 2; }

npm ci
npm run typecheck
npm run build
test -f apps/mobile/dist/index.html
npx cap sync android

cd android
if [[ -x ./gradlew && -f gradle/wrapper/gradle-wrapper.jar ]]; then
  ./gradlew clean assembleDebug --no-daemon
elif command -v gradle >/dev/null 2>&1; then
  gradle --no-daemon :app:clean :app:assembleDebug --max-workers=2
else
  echo "ERROR: Neither a complete Gradle wrapper nor a system Gradle executable is available." >&2
  exit 3
fi

mkdir -p ../artifacts
APK="app/build/outputs/apk/debug/app-debug.apk"
test -f "$APK"
cp -f "$APK" ../artifacts/ya-ali-1.0.1-debug.apk
sha256sum ../artifacts/ya-ali-1.0.1-debug.apk
ls -lh ../artifacts/ya-ali-1.0.1-debug.apk
