#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

export npm_config_audit=false
export npm_config_fund=false
export npm_config_fetch_retries=2
export npm_config_fetch_retry_mintimeout=5000
export npm_config_fetch_retry_maxtimeout=30000
export npm_config_fetch_timeout=60000

if [[ "${1:-}" == "--offline" ]]; then
  echo "[deps] Running strict offline npm ci..."
  npm ci --offline --ignore-scripts
  exit 0
fi

echo "[deps] Validating package-lock/package.json consistency..."
npm ci --dry-run --ignore-scripts --prefer-offline >/tmp/yaali-npm-ci-dry-run.log 2>&1 || {
  cat /tmp/yaali-npm-ci-dry-run.log
  echo "[deps] npm ci preflight failed. Do not run npm install to mutate the lockfile."
  exit 20
}

echo "[deps] Clean install..."
npm ci --prefer-offline --no-audit --no-fund

echo "[deps] PASS: clean dependency installation completed."
