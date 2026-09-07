#!/usr/bin/env bash
set -euo pipefail

MODEL_URL="${1:-}"
DEST="${2:-$PWD/local-models/sherpa}"
if [[ -z "$MODEL_URL" ]]; then
  echo "usage: $0 <official-sherpa-model-url> [destination]" >&2
  exit 2
fi
case "$MODEL_URL" in
  https://github.com/k2-fsa/sherpa-onnx/releases/*|https://huggingface.co/*) ;;
  *) echo "Refusing non-approved model host. Use an official sherpa-onnx release or Hugging Face source." >&2; exit 3;;
esac
mkdir -p "$DEST"
archive="$DEST/model.tar.bz2"
curl --fail --location --retry 5 --retry-delay 2 --connect-timeout 20 --max-time 3600 -o "$archive" "$MODEL_URL"
tar -xjf "$archive" -C "$DEST"
rm -f "$archive"
printf 'Sherpa model installed under %s\n' "$DEST"
