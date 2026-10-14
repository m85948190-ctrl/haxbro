export const config = { runtime: "nodejs" };
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).json({ok:false,error:"Method not allowed"});}
  return res.status(200).json({ok:true,architecture:"browser-local neural inference with retrieval-first evidence",lanes:[
    {id:"local",name:"KAI 51 LOCAL",model:"onnx-community/SmolLM2-135M-Instruct-ONNX",host:"Hugging Face",mode:"browser-neural",downloadProxy:false},
    {id:"github",name:"KAI 51 HEAVY",model:"HuggingFaceTB/SmolLM2-360M-Instruct",host:"Hugging Face",mode:"browser-neural",downloadProxy:false},
    {id:"lite",name:"KAI LITE",model:"onnx-community/SmolLM2-135M-Instruct-ONNX",host:"Hugging Face + web evidence",mode:"browser-neural-with-retrieval",engines:["Google","Bing","Wikipedia"]}
  ],providers:{openai:false,gemini:false,groq:false,anthropic:false},note:"Configured model routes only; actual readiness must be confirmed by successful browser initialization and inference. The legacy GitHub release is not currently used by the Transformers.js inference path."});
}
