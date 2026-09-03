#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-/usr/local/sdkman/candidates/java/21.0.10-ms}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

npm ci
npm run build
npx cap sync android

cd android

if [ -f gradle/wrapper/gradle-wrapper.jar ]; then
  ./gradlew :app:assembleDebug --no-daemon --max-workers=1 -Dorg.gradle.jvmargs="-Xmx1536m"
else
  gradle --version
  gradle :app:assembleDebug --no-daemon --max-workers=1 -Dorg.gradle.jvmargs="-Xmx1536m"
fi

APK="app/build/outputs/apk/debug/app-debug.apk"
ZIP="app/build/outputs/apk/debug/app-debug.zip"

test -s "$APK"
rm -f "$ZIP"
zip -j -q "$ZIP" "$APK"

echo "APK: $APK"
echo "ZIP: $ZIP"
ls -lh "$APK" "$ZIP"
