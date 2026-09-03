#!/usr/bin/env bash
set -euo pipefail
export JAVA_HOME="${JAVA_HOME:-/usr/local/sdkman/candidates/java/21.0.10-ms}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
java -version
"$ANDROID_HOME/platform-tools/adb" version 2>/dev/null || true
