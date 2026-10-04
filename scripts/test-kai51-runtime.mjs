import {env,pipeline} from "@huggingface/transformers";
import {mkdir,writeFile} from "node:fs/promises";

const base="https://github.com/m85948190-ctrl/haxbro/releases/download/kai51-model-latest";
const dir="build/kai51-model";
await mkdir(dir+"/onnx",{recursive:true});

for(const file of ["config.json","tokenizer.json","tokenizer_config.json","special_tokens_map.json","generation_config.json","model_q4.onnx"]){
  const res=await fetch(base+"/"+file);
  if(!res.ok) throw new Error("GitHub model asset failed: "+file+" HTTP "+res.status);
  const target=file.endsWith(".onnx") ? dir+"/onnx/"+file : dir+"/"+file;
  await writeFile(target,Buffer.from(await res.arrayBuffer()));
}

env.allowRemoteModels=false;
env.allowLocalModels=true;
env.localModelPath="build/";
env.useBrowserCache=false;
env.useFSCache=false;

const pipe=await pipeline("text-generation","kai51-model",{device:"cpu",dtype:"q4"});
const messages=[
  {role:"system",content:"You are KAI 51, the core intelligence of HAxBRO AI. Be concise, helpful, and answer the user directly."},
  {role:"user",content:"Who are you and what is 2+2?"}
];
const output=await pipe(messages,{max_new_tokens:64,do_sample:false});
console.log("RAW_OUTPUT",JSON.stringify(output));

const item=Array.isArray(output)?output[0]:output;
let answer="";
if(typeof item?.generated_text==="string") answer=item.generated_text;
else if(Array.isArray(item?.generated_text)){
  const last=item.generated_text.at(-1);
  answer=typeof last==="string"?last:String(last?.content??"");
}
if(!answer) throw new Error("KAI 51 returned an empty response");
console.log(JSON.stringify({ok:true,source:"GitHub Release",answer}));
