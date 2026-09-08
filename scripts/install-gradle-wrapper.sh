#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"
if command -v gradle >/dev/null 2>&1; then
  gradle :wrapper --gradle-version 8.13 --distribution-type bin
else
  echo "Gradle is not installed in this environment." >&2
  echo "Install Gradle 8.13 or run this script in the networked build environment; it will generate gradle/wrapper/gradle-wrapper.jar." >&2
  exit 10
fi
