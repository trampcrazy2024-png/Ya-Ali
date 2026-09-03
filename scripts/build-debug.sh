#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/setup-android-env.sh
npm ci
npm run build
npx cap sync android
cd android
./gradlew :app:assembleDebug --no-daemon --max-workers=1 -Dorg.gradle.jvmargs="-Xmx1536m"
ls -lh app/build/outputs/apk/debug/app-debug.apk
