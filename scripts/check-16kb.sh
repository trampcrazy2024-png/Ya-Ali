#!/usr/bin/env bash
set -euo pipefail
APK="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"
if [[ ! -f "$APK" ]]; then echo "APK not found: $APK"; exit 2; fi
if command -v zipalign >/dev/null 2>&1; then
  zipalign -c -P 16 -v 4 "$APK"
else
  echo "zipalign not installed; install Android build-tools then rerun."
  exit 3
fi
if command -v adb >/dev/null 2>&1; then
  echo "Device PAGE_SIZE:"; adb shell getconf PAGE_SIZE || true
fi
echo "16 KB verification command completed for $APK"
