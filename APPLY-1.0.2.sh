#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p .checkpoints
printf 'Creating rollback checkpoint: %s\n' "$STAMP"
git status --short
git rev-parse HEAD > ".checkpoints/pre-1.0.2-${STAMP}.commit"
tar -czf ".checkpoints/pre-1.0.2-${STAMP}.tar.gz" --exclude=.git --exclude=node_modules --exclude=android/app/build .
printf '\nAfter extracting this package over the repo root, run:\n'
printf '  npm ci\n  npm run typecheck\n  npm test\n  npm run build\n  npx cap sync android\n  cd android && ./gradlew :app:assembleDebug --no-daemon --no-parallel --max-workers=1 --console=plain\n'
