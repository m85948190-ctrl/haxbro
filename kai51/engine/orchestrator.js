import {KAI51_CONFIG} from "./config.js";

const now=()=>Date.now();
const clean=(v,n)=>String(v??"").replace(/\u0000/g,"").slice(0,n).trim();

export function createOrchestrator({reasoner,web=null,creative=null,knowledge=null}){
  let busy=false;
  async function run({message,history=[],mode="normal",attachments=[]}){
    if(busy) throw new Error("KAI 51 is already processing a request");
    busy=true;
    const started=now();
    try{
      const prompt=clean(message,KAI51_CONFIG.context.maxPromptChars);
      const route=classify(prompt);
      const context=(Array.isArray(history)?history:[]).slice(-KAI51_CONFIG.context.maxMessages)
        .map(x=>({role:x?.who==="user"?"user":"assistant",content:clean(x?.text,KAI51_CONFIG.context.maxCharsPerMessage)}));
      const result=await reasoner.generate({prompt,history:context,mode,route,attachments});
      return {ok:true,engine:"KAI 51",architecture:"single-core-orchestrator",route,result,latencyMs:now()-started};
    }finally{busy=false;}
  }
  return {run,status:()=>({busy,architecture:"single-core-orchestrator",swarm:false})};
}

function classify(p){
  const q=p.toLowerCase();
  return {
    needsWeb:/\b(latest|today|news|search|research|source|current|verify|website|web)\b/.test(q),
    needsCode:/\b(code|debug|program|javascript|python|html|css|api|app|software)\b/.test(q),
    needsCreative:/\b(image|video|cinematic|thumbnail|poster|animate|animation)\b/.test(q),
    needsKnowledge:/\b(remember|knowledge|save|recall|learn)\b/.test(q)
  };
}
