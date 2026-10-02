# KAI 51 — Independent Local Intelligence Core

KAI 51 is the HAxBRO-owned intelligence architecture in this repository.

## What is independent here

- KAI identity and orchestration
- 12-entry browser-local memory
- context and intent planning
- local tool routing
- App Maker / Code Writer / Security routing signals
- verification and recovery
- local language-model execution
- no OpenAI, Groq, Gemini, or Anthropic provider API
- no provider SDK and no provider API key

## Local model runtime

The repository now connects KAI 51 to a real browser-local text-generation runtime using Transformers.js + ONNX:

- Model: `onnx-community/Qwen3-0.6B-ONNX`
- Quantization: `q4f16`
- Device: WebGPU when available, otherwise WASM
- Browser cache: enabled
- Provider: none

The model weights are downloaded once into the browser's cache during installation. After the model is cached, generation is performed on the user's device rather than through a hosted model-provider API.

## Architecture boundary

KAI 51 is not defined as the model weights alone. The model is a replaceable local intelligence module behind KAI's own identity, memory, planner, tools, verification and recovery layers. This means the local model can be upgraded later without replacing KAI's architecture.

The current 0.6B browser model is an initial local brain/runtime target. A substantially larger local model can be introduced later for stronger reasoning, provided the target device has enough memory and compute.

## HTML connection

`index.html` imports `kai51/core.js` directly. The page can:

1. install/load the local brain;
2. run KAI local tools;
3. route open-ended prompts into the local model;
4. show the KAI route, mode, verification state and provider status.

## Validation

The repository contains a GitHub Actions validation workflow that checks the KAI core JavaScript syntax and required files.

