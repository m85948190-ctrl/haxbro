export const config = { runtime: "nodejs" };
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({ok:false,error:"Method not allowed"});}
  return res.status(200).json({
    ok:true,service:"HAxBRO KAI on Render",version:"2.0.0",time:new Date().toISOString(),
    model:{id:"onnx-community/Qwen3-0.6B-ONNX",execution:"browser-local WebGPU/WASM",provider:null},
    tools:{webSearch:["Google","Bing","Wikipedia"],pageReading:true,calculator:true,algebra:["evaluate","simplify","solve-linear-and-quadratic","derivative"],coding:["HTML","CSS","JavaScript","Python"],appMaker:true},
    privacy:{hostedAiInference:false,apiKeyRequired:false,conversationStorage:"browser-local"},
    note:"Model readiness is confirmed by the browser after local initialization. Tool availability is served by this Render backend."
  });
}
