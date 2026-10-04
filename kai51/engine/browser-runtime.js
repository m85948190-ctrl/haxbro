import {env,pipeline} from "@huggingface/transformers";
import {KAI51_CONFIG} from "./config.js";

export async function loadKAI51({onProgress=()=>{}}={}){
  env.allowRemoteModels=KAI51_CONFIG.allowRemoteModels;
  env.allowLocalModels=KAI51_CONFIG.allowLocalModels;
  env.localModelPath=KAI51_CONFIG.localModelPath;
  env.useBrowserCache=KAI51_CONFIG.useBrowserCache;
  env.remoteHost=KAI51_CONFIG.modelHost;

  const gpu=!!globalThis.navigator?.gpu;
  let device="wasm";
  if(gpu){
    try{device=(await navigator.gpu.requestAdapter())?"webgpu":"wasm";}catch{}
  }
  onProgress({stage:"runtime",device,progress:10});
  const pipe=await pipeline("text-generation","haxbro-ai-model",{
    device,
    dtype:device==="webgpu"?KAI51_CONFIG.dtypeWebGPU:KAI51_CONFIG.dtypeWasm,
    progress_callback:p=>onProgress({stage:"model",device,progress:Number(p?.progress)||0})
  });
  onProgress({stage:"ready",device,progress:100});
  return {
    device,
    async generate({prompt,history=[]}){
      const messages=[...history,{role:"user",content:prompt}];
      const out=await pipe(messages,KAI51_CONFIG.generation);
      const item=Array.isArray(out)?out[0]:out;
      const generated=item?.generated_text;
      const last=Array.isArray(generated)?generated[generated.length-1]:generated;
      const response=typeof last==="object"?String(last.content||""):String(last||item?.text||"").trim();
      if(!response) throw new Error("KAI 51 produced no response");
      return {response,device,model:"HAxBRO AI Model"};
    }
  };
}
