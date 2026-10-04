import {env,pipeline} from "@huggingface/transformers";
import {mkdir,writeFile} from "node:fs/promises";

const base="https://github.com/m85948190-ctrl/haxbro/releases/download/kai51-model-latest";
const dir="build/kai51-model";
await mkdir(dir,{recursive:true});
for(const file of ["config.json","tokenizer.json","tokenizer_config.json","special_tokens_map.json","generation_config.json","model_q4.onnx"]){
  const res=await fetch(base+"/"+file);
  if(!res.ok) throw new Error("GitHub model asset failed: "+file+" HTTP "+res.status);
  await writeFile(dir+"/"+file,Buffer.from(await res.arrayBuffer()));
}
env.allowRemoteModels=false;
env.allowLocalModels=true;
env.localModelPath="build/";
env.useBrowserCache=false;
env.useFSCache=false;

const pipe=await pipeline("text-generation","kai51-model",{device:"cpu",dtype:"q4"});
const output=await pipe("You are KAI 51, the core intelligence of HAxBRO AI. Answer briefly. Who are you and what is 2+2?",{max_new_tokens:48,do_sample:false,return_full_text:false});
const item=Array.isArray(output)?output[0]:output;
const answer=String(item?.generated_text??item?.text??"").trim();
if(!answer) throw new Error("KAI 51 returned an empty response");
console.log(JSON.stringify({ok:true,source:"GitHub Release",answer}));
