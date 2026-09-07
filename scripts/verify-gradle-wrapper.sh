#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAR="$ROOT/android/gradle/wrapper/gradle-wrapper.jar"
PROPS="$ROOT/android/gradle/wrapper/gradle-wrapper.properties"
if [[ ! -f "$JAR" ]]; then
  echo "MISSING: $JAR"
  echo "Generate it on a networked machine with: cd android && gradle :wrapper --gradle-version 8.13"
  exit 10
fi
[[ -f "$PROPS" ]] || { echo "MISSING: $PROPS"; exit 11; }
jar tf "$JAR" >/dev/null
echo "PASS: Gradle Wrapper JAR is present and readable"
sha256sum "$JAR"
