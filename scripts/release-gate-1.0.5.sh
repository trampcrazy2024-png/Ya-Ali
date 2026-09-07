#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/verify-npm-lock.sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run build
bash scripts/verify-gradle-wrapper.sh
npm run android:sync
(cd android && ./gradlew :app:assembleDebug --no-daemon --max-workers=1 -Dorg.gradle.jvmargs="-Xmx1536m")
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
test -f "$APK"
sha256sum "$APK"
echo "RELEASE GATE 1.0.5: PASS"
