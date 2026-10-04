import {execFileSync} from "node:child_process";

const model=process.env.MODEL_ID||"HuggingFaceTB/SmolLM2-360M-Instruct";
const out=process.env.OUTPUT_DIR||"build/kai51";

execFileSync("python",[
  "-m","optimum.commands.optimum_cli",
  "export","onnx",
  "--model",model,
  "--task","text-generation-with-past",
  "--optimize","O3",
  out
],{stdio:"inherit"});

execFileSync("python",[
  "-m","optimum.commands.optimum_cli",
  "onnxruntime","quantize",
  "--onnx_model",out,
  "--avx2",
  "--per_channel",
  "-o",out+"/quantized"
],{stdio:"inherit"});

console.log("Prepared KAI 51 ONNX + quantized artifacts:",out);
