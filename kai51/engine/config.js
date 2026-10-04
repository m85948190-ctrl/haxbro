export const KAI51_CONFIG={
  name:"HAxBRO AI Model",
  modelId:"HuggingFaceTB/SmolLM2-360M-Instruct",
  modelRevision:"main",
  modelHost:"https://raw.githubusercontent.com/m85948190-ctrl/haxbro-models/main",
  localModelPath:"/models/kai51/",
  allowRemoteModels:false,
  allowLocalModels:true,
  useBrowserCache:true,
  deviceOrder:["webgpu","wasm"],
  dtypeWebGPU:"q4f16",
  dtypeWasm:"q4",
  generation:{max_new_tokens:96,temperature:0.45,do_sample:false,return_full_text:false},
  context:{maxMessages:3,maxCharsPerMessage:900,maxPromptChars:2500},
  noMultiAgentSwarm:true,
  architecture:"single-core-orchestrator"
};
