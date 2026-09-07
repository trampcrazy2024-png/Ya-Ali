#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo '== 1/7 dependency install =='
npm ci --prefer-offline --no-audit --no-fund

echo '== 2/7 repository typecheck =='
npm run typecheck

echo '== 3/7 tests =='
npm test

echo '== 4/7 web production build =='
npm run build

echo '== 5/7 Capacitor Android sync =='
npm run android:sync

echo '== 6/7 Android debug build =='
cd android
./gradlew :app:assembleDebug --no-daemon --max-workers=1 -Dorg.gradle.jvmargs='-Xmx1536m'
cd ..

echo '== 7/7 artifact + tree checks =='
test -f android/app/build/outputs/apk/debug/app-debug.apk
sha256sum android/app/build/outputs/apk/debug/app-debug.apk
printf '\nRELEASE GATE: PASS\n'
