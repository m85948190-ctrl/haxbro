export const config = { runtime: "nodejs", maxDuration: 15 };
const clean=(v,n=5000)=>String(v??"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").trim().slice(0,n);
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,error:"Use POST."});}
  const message=clean(req.body?.message,2200);
  if(!message)return res.status(400).json({ok:false,error:"Enter a message."});
  const wantsWeb=/\b(latest|today|news|search|research|source|sources|current|verify|website|web|who was|what was|what is|who is|when did|where is)\b/i.test(message);
  let evidence=null;
  if(wantsWeb){
    try{
      const base=(req.headers["x-forwarded-proto"]||"https")+"://"+req.headers.host;
      const r=await fetch(base+"/api/kai/search?q="+encodeURIComponent(message),{headers:{"accept":"application/json"}});
      if(r.ok)evidence=await r.json();
    }catch{}
  }
  return res.status(200).json({ok:true,engine:"KAI 51 orchestration API",message,needsBrowserNeuralInference:true,webSearched:wantsWeb,evidence,modelProvider:null,answer:"",note:"The browser-local neural model must generate the final answer. The backend returns source evidence and routing metadata only; it does not fabricate a completed model response."});
}
