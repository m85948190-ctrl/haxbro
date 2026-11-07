import { env, pipeline } from "@huggingface/transformers";
const modelId="onnx-community/Qwen3-0.6B-ONNX";
env.allowRemoteModels=true;env.allowLocalModels=true;env.useBrowserCache=false;env.cacheDir=process.env.HF_HOME||".cache/huggingface";
console.log("Loading "+modelId+" on CPU with q4 quantization...");
const pipe=await pipeline("text-generation",modelId,{device:"cpu",dtype:"q4",progress_callback:p=>{if(p&&p.status)console.log(p.status,p.file||"",p.progress||"")}});
async function ask(messages,maxTokens=96){
 const prompt=pipe.tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true,enable_thinking:false});
 const result=await pipe(prompt,{max_new_tokens:maxTokens,do_sample:false,return_full_text:false});
 const item=Array.isArray(result)?result[0]:result,g=item&&item.generated_text;
 const answer=(Array.isArray(g)?String(g.at(-1)&&g.at(-1).content||""):String(g||item&&item.text||"")).trim();
 if(!answer)throw new Error("Qwen3 generated an empty response.");return answer;
}
const chat=await ask([{role:"system",content:"You are KAI 51, HAxBRO AI's local assistant. Answer briefly and accurately."},{role:"user",content:"Reply with one short sentence confirming that HAxBRO is online."}]);
console.log("CHAT_SMOKE_TEST:",chat);
if(!/haxbro|online|ready/i.test(chat))throw new Error("Model loaded but did not return a recognizable HAxBRO chat response.");
const code=await ask([{role:"system",content:"You are HAxBRO Code. Output a short correct JavaScript function."},{role:"user",content:"Write a JavaScript function named add(a, b) that returns a plus b."}],128);
console.log("CODE_SMOKE_TEST:",code);
if(!/function\s+add|add\s*=\s*\(/i.test(code)||!/return|=>/.test(code))throw new Error("Coding smoke test did not produce a recognizable add function.");
console.log(JSON.stringify({ok:true,model:modelId,chat_reply_verified:true,code_generation_verified:true,chat_preview:chat.slice(0,240),code_preview:code.slice(0,300)},null,2));
