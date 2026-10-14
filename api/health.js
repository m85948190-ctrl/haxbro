export const config = { runtime: "nodejs" };
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({ok:false,error:"Method not allowed"});}
  return res.status(200).json({ok:true,service:"HAxBRO Vercel backend",version:"1.1.0",time:new Date().toISOString(),models:{local:"onnx-community/SmolLM2-135M-Instruct-ONNX",heavy:"HuggingFaceTB/SmolLM2-360M-Instruct",lite:"SmolLM2-135M + Google/Bing/Wikipedia evidence"},providers:{openai:false,gemini:false,groq:false,anthropic:false},note:"These are configured model routes, not proof of runtime readiness. Browser inference status is authoritative."});
}
