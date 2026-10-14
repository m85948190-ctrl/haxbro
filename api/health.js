export const config = { runtime: "nodejs" };
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({ok:false,error:"Method not allowed"});}
  return res.status(200).json({ok:true,service:"HAxBRO Vercel backend",version:"1.0.0",time:new Date().toISOString(),models:{local:"onnx-community/SmolLM2-135M-Instruct-ONNX",github:"m85948190-ctrl/haxbro@kai51-model-latest"},providers:{openai:false,gemini:false,groq:false,anthropic:false}});
}
