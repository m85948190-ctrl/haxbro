# HAxBRO Qwen3-0.6B coding fine-tune

This directory contains a reproducible local PEFT/LoRA fine-tuning pipeline. It does not change the website's inference weights by itself.

- Base: `Qwen/Qwen3-0.6B`
- Browser ONNX runtime: `onnx-community/Qwen3-0.6B-ONNX`
- Upstream model license: Apache-2.0; verify the model card before redistributing derivatives.

## Dataset
Create `training/data/code_sft.jsonl`, one JSON object per line:
```json
{"instruction":"Write a JavaScript function that adds two numbers.","input":"","output":"function add(a, b) {\n  return a + b;\n}"}
```
Use only code/data you own or whose licenses allow training. Remove secrets, credentials, personal data, malware and prompt-injection examples. Keep a held-out evaluation set.

## Install and run locally
Python 3.10/3.11 and an NVIDIA CUDA GPU are strongly recommended. CPU-only training may be very slow.
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r training/requirements.txt
python training/finetune_qwen3_code.py --data training/data/code_sft.example.jsonl --output training/output/qwen3-06b-haxbro-code-lora --epochs 2
```
The checked-in sample is only a tiny smoke-test starter, not a sufficient production training corpus.

The script saves a PEFT adapter. To use it in the browser, merge it into the base model and export/quantize a new ONNX model with a compatible Optimum/ONNX toolchain. Transformers.js does not directly load PEFT adapters. Until a fine-tuned export is evaluated and verified, the website continues using upstream Qwen3-0.6B ONNX.

## Status
The repository includes the repeatable fine-tuning pipeline. Actual training, evaluation, merge and ONNX export require local compute and a real licensed dataset. Do not describe the weights as fine-tuned until those steps complete.
