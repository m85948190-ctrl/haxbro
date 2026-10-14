export const config = { runtime: "nodejs" };
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({ok:false,error:"Method not allowed"});}
  return res.status(200).json({ok:true,architecture:"local-first",lanes:[
    {id:"local",name:"KAI 51 LOCAL",model:"onnx-community/SmolLM2-135M-Instruct-ONNX",host:"Hugging Face",mode:"browser-local",downloadProxy:false},
    {id:"github",name:"KAI 51 GITHUB",model:"HAxBRO SmolLM2-360M q4",host:"GitHub release kai51-model-latest",manifest:"https://github.com/m85948190-ctrl/haxbro/releases/tag/kai51-model-latest",downloadProxy:false},
    {id:"lite",name:"KAI LITE",mode:"retrieval-first",engines:["Google","Bing","Wikipedia"]}
  ],providers:{openai:false,gemini:false,groq:false,anthropic:false},note:"Model readiness is reported by the browser only after actual initialization and inference; this endpoint does not claim a model is loaded."});
}
