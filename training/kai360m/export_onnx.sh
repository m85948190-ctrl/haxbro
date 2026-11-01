#!/usr/bin/env bash
set -euo pipefail
MODEL_DIR="${1:-outputs/kai360m-merged}"
OUT_DIR="${2:-outputs/kai360m-onnx}"
if [[ ! -d "$MODEL_DIR" ]]; then
  echo "Merged model directory not found: $MODEL_DIR" >&2
  echo "Run merge_adapter.py first." >&2
  exit 2
fi
command -v optimum-cli >/dev/null 2>&1 || {
  echo "optimum-cli is missing. Install Optimum ONNX Runtime tooling first." >&2
  exit 2
}
mkdir -p "$OUT_DIR"
optimum-cli export onnx --model "$MODEL_DIR" --task text-generation-with-past "$OUT_DIR"
echo
echo "ONNX export completed at: $OUT_DIR"
echo "This is not yet the production Transformers.js Q4 package. Validate tokenizer/config,"
echo "generation parity, browser WASM/WebGPU loading, and quantization before deployment."
