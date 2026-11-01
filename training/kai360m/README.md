# KAI 360M conversation fine-tuning

This folder is the first real neural-weight training pipeline for HAxBRO KAI's existing
`HuggingFaceTB/SmolLM2-360M-Instruct` (361.8M parameter) foundation model.

It is deliberately separate from the live Hatchable prompt-conditioning pack. Adding
rules/examples to that pack changes the prompt; it does **not** train or change model
weights. This pipeline performs supervised fine-tuning (SFT) with LoRA adapters, then
merges the adapter into the 360M base model.

## What changes and what does not

- Base: `HuggingFaceTB/SmolLM2-360M-Instruct` (Apache-2.0).
- Method: assistant-turn-only causal-LM loss with LoRA on attention and MLP projections.
- Parameter count: the foundation stays 361.8M; LoRA adds a small temporary trainable adapter.
- Inference target: merge adapter back into the same 360M architecture, then export and
  quantize a deployment artifact. The live ONNX file is **not** trainable and is not edited.
- 135M remains a separate fallback and is not touched.
- No OpenAI/Gemini/Claude/Groq API key or hosted inference provider is used.

## Dataset policy

`data/train.jsonl` and `data/eval.jsonl` are original starter examples written for KAI.
They are a pipeline smoke-test and a small initial conversational curriculum, **not enough
data to claim a meaningful general-intelligence improvement**. Expand with licensed,
consented, high-quality examples before treating a checkpoint as a release candidate.
Keep evaluation examples out of training data. Never put secrets, private conversations,
personal records, or unlicensed scraped text into the dataset.

Each JSONL row contains a `messages` array using standard `system`, `user`, and
`assistant` roles. Multi-turn rows are supported. Loss is applied only to assistant
turns; user/system tokens are context, not targets.

## Install

Python 3.10 or 3.11 is recommended. Use a CUDA GPU with enough VRAM for practical
training. Apple Silicon MPS and CPU are supported as best-effort paths but may be slow.

```bash
cd training/kai360m
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Train

```bash
python train_sft.py \
  --train data/train.jsonl \
  --output-dir outputs/kai360m-conversation-lora \
  --epochs 3 \
  --max-length 1024 \
  --batch-size 2 \
  --gradient-accumulation 8
```

For a quick pipeline smoke test, use `--max-samples 4 --epochs 1`. That checks
loading/tokenization/training code; it is not a useful model-quality run.

The script detects CUDA, MPS, or CPU. It downloads the public base weights from Hugging
Face the first time. No API key is required for this public model. The training run itself
uses the machine/GPU compute and storage where it is launched.

## Evaluate

```bash
python evaluate.py --base-only --eval data/eval.jsonl --output outputs/eval-before.jsonl
python evaluate.py --adapter-dir outputs/kai360m-conversation-lora --eval data/eval.jsonl --output outputs/eval-after.jsonl
```

Review generated answers for context retention, naturalness, instruction following,
factuality, and hallucination. Do not promote a checkpoint solely because training loss
decreased. The release gate is: after-training results must improve on the held-out set
without materially regressing general instruction-following tests.

## Merge

```bash
python merge_adapter.py \
  --adapter-dir outputs/kai360m-conversation-lora \
  --output-dir outputs/kai360m-merged
```

This creates ordinary Hugging Face weights with the LoRA update merged into the original
360M model. Keep the original base and adapter for reproducibility.

## Mobile/browser export

The live HAxBRO runtime currently expects a Transformers.js-compatible Q4 ONNX package.
The merged checkpoint must be exported and quantized, then validated against the exact
Transformers.js runtime before it replaces the current model.

Start with the export:

```bash
optimum-cli export onnx --model outputs/kai360m-merged --task text-generation-with-past outputs/kai360m-onnx
```

This produces ONNX export files; it is **not automatically the same layout or Q4
quantization** as the current `onnx-community/SmolLM2-360M-Instruct-ONNX` package.
Do not copy it into production until tokenizer/config parity, generation, WebGPU/WASM
loading, and output quality have been verified. Quantized file size depends on the chosen
format; 361.8M parameters cannot fit into a 42–55 MB app package as full model weights.

## Reproducibility

Record the base model revision, dataset hash, training arguments, package versions,
random seed, checkpoint hash, evaluation outputs, and export/quantization settings for
every candidate. Do not label a model "KAI-trained" until an actual run completes and
its artifacts are retained.
