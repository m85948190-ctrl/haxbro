import {env,pipeline} from "@huggingface/transformers";
import {KAI51_CONFIG} from "./config.js";

let runtimePromise=null;

function releaseFetch(input,init){
  const url=new URL(String(input),globalThis.location && globalThis.location.href || "https://haxbro.local/");
  const base=KAI51_CONFIG.modelHost.replace(/\/$/,"");
  if(!url.href.startsWith(base+"/")) return fetch(input,init);
  const file=url.pathname.split("/").pop();
  return fetch(base+"/"+file,init);
}

async function chooseDevice(){
  if(!globalThis.navigator || !navigator.gpu) return "wasm";
  try{
    const adapter=await navigator.gpu.requestAdapter();
    return adapter?"webgpu":"wasm";
  }catch{return "wasm";}
}

export async function loadKAI51({onProgress=()=>{}}={}){
  if(runtimePromise) return runtimePromise;
  runtimePromise=(async()=>{
    env.allowRemoteModels=KAI51_CONFIG.allowRemoteModels;
    env.allowLocalModels=KAI51_CONFIG.allowLocalModels;
    env.localModelPath=KAI51_CONFIG.localModelPath;
    env.useBrowserCache=KAI51_CONFIG.useBrowserCache;
    env.cacheKey=KAI51_CONFIG.cacheKey;
    env.remoteHost=KAI51_CONFIG.modelHost;
    env.remotePathTemplate="{file}";
    env.fetch=releaseFetch;

    const device=await chooseDevice();
    onProgress({stage:"runtime",device,progress:10});

    const pipe=await pipeline("text-generation",KAI51_CONFIG.modelId,{
      device,
      dtype:device==="webgpu"?KAI51_CONFIG.dtypeWebGPU:KAI51_CONFIG.dtypeWasm,
      progress_callback:p=>onProgress({stage:"model",device,progress:Number(p && p.progress)||0})
    });

    onProgress({stage:"ready",device,progress:100});

    return {
      device,
      async generate({prompt,history=[]}){
        const messages=[
          {role:"system",content:"You are KAI 51, the core intelligence of HAxBRO AI. Be concise, helpful, accurate, and answer the user directly."},
          ...history.slice(-KAI51_CONFIG.context.maxMessages),
          {role:"user",content:String(prompt).slice(0,KAI51_CONFIG.context.maxPromptChars)}
        ];
        const out=await pipe(messages,KAI51_CONFIG.generation);
        const item=Array.isArray(out)?out[0]:out;
        const generated=item && item.generated_text;
        const last=Array.isArray(generated)?generated[generated.length-1]:generated;
        const response=typeof last==="object"
          ?String(last.content||"").trim()
          :String(last||item && item.text||"").trim();
        if(!response) throw new Error("KAI 51 produced no response");
        return {response,device,model:KAI51_CONFIG.name,local:true};
      }
    };
  })();
  try{return await runtimePromise;}
  catch(error){runtimePromise=null;throw error;}
}
