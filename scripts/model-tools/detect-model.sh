#!/usr/bin/env bash
set -euo pipefail
file="${1:-}"
if [[ -z "$file" || ! -f "$file" ]]; then echo "usage: $0 /path/to/model" >&2; exit 2; fi
name="$(basename "$file" | tr '[:upper:]' '[:lower:]')"
case "$name" in
  *.gguf) echo "format=gguf runtime=llama.cpp direct_android=yes" ;;
  *.onnx) echo "format=onnx runtime=onnxruntime-genai direct_android=yes*" ;;
  *.pte) echo "format=pte runtime=executorch direct_android=yes*" ;;
  *.safetensors) echo "format=safetensors runtime=conversion-or-endpoint direct_android=no" ;;
  *.bin|*.pt|*.pth) echo "format=pytorch runtime=conversion-or-endpoint direct_android=no" ;;
  *.tflite) echo "format=tflite runtime=litert task-dependent" ;;
  *) echo "format=unknown" ;;
esac
