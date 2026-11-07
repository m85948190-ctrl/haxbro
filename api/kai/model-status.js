export const config={runtime:"nodejs"};
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({ok:false,error:"Method not allowed"})}
 return res.status(200).json({
  ok:true,
  architecture:"browser-local Qwen3 inference with Google, Bing and Wikipedia retrieval",
  model:{id:"Qwen/Qwen3-0.6B",browserRuntime:"onnx-community/Qwen3-0.6B-ONNX",parameters:"0.6B",license:"Apache-2.0",devicePreference:["webgpu","wasm"],quantization:{webgpu:"q4f16",wasm:"q4"},autoInstallOnVisit:true,browserCache:true},
  capabilities:["conversation","instruction following","coding mode","web retrieval","Wikipedia retrieval"],
  retrieval:["Google","Bing","Wikipedia"],
  providers:{openai:false,gemini:false,groq:false,anthropic:false},
  readiness:"Configuration only. Actual model readiness is shown after successful browser initialization and inference."
 })
}
