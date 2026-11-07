# HAxBRO AI — KAI 51

HAxBRO's browser-local AI workspace. The active conversational model is Qwen3-0.6B running through Transformers.js and ONNX Runtime Web.

## Active model
- Upstream: `Qwen/Qwen3-0.6B`
- Browser ONNX: `onnx-community/Qwen3-0.6B-ONNX`
- Parameter class: 0.6B
- License: Apache-2.0 (see upstream model card)
- Browser execution: WebGPU q4f16 when available; WASM q4 otherwise.
- Installation starts automatically when the workspace opens; browser caching is enabled.
- Normal conversation and code-generation prompts use the same local Qwen3 model with different system instructions.

## Web and knowledge tools
`api/kai/search.js` searches Google, Bing and Wikipedia, ranks/deduplicates results, opens public HTTPS pages and extracts readable article text. The browser passes evidence to Qwen3 and displays source links. If retrieval fails or no relevant readable pages are found, KAI must say it could not verify the information rather than fabricate sources.

## Code generation and fine-tuning
- KAI detects programming requests and switches to a coding-focused system prompt.
- Fine-tuning entry point: `training/finetune_qwen3_code.py`.
- `training/` contains a local PEFT/LoRA fine-tuning pipeline for Qwen3-0.6B.
- The browser uses upstream Qwen3 ONNX until a locally trained adapter is evaluated, merged, exported and converted to a browser-ready ONNX package.
- The tiny example JSONL is only a data-format smoke test, not a production-quality corpus.

## Verification
Run `npm test` for repository tests. The GitHub Actions workflow `Qwen3 0.6B local inference verification` downloads the ONNX model on a hosted runner and verifies model initialization, a non-empty HAxBRO chat reply, and JavaScript code generation. CI does not prove performance on every phone or laptop; browser-specific installation and inference must also be tested in the deployed workspace.

## Existing first-party modules
The `kai51/` modules retain HAxBRO's deterministic App Maker, decoder, capability registry and browser-local memory. They are supporting tools, not substitutes for the learned Qwen3 language model.

## Fine-tuning boundary
See `training/README.md`. Actual training, evaluation, adapter merge and ONNX export require local compute and a real licensed dataset. Do not describe the model as fine-tuned until those steps complete.
