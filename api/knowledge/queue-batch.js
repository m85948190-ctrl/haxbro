export const access = "public";
export const methods = ["POST"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INGEST_KEY = process.env.HAXBRO_INGEST_KEY;
const MAX_BATCH = 100;
const CONCURRENCY = 10;

function clean(value, max=5000){ return typeof value === "string" ? value.trim().slice(0,max) : ""; }
function normalizedUrl(value){ try { const u = new URL(value); u.hash=""; u.hostname=u.hostname.toLowerCase(); if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,''); return u.toString(); } catch { return ""; } }

async function one(source, headers){
  const url=normalizedUrl(source?.url);
  if(!/^https?:\/\//i.test(url)) return {ok:false,url:url||String(source?.url||""),reason:"invalid_url"};
  const title=clean(source?.title,300)||url;
  const category=clean(source?.category,120)||"general";
  const rawPriority=Number(source?.priority ?? 1);
  const priority=Number.isFinite(rawPriority)?Math.max(0,Math.min(3,Math.round(rawPriority))):1;
  try {
    const existsResp=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs?select=id,status,target&target=eq.${encodeURIComponent(url)}&limit=1`,{headers});
    const existsData=await existsResp.json();
    if(!existsResp.ok) return {ok:false,url,reason:"lookup_failed",status:existsResp.status};
    if(Array.isArray(existsData)&&existsData.length) return {ok:true,url,deduplicated:true,queued:false,status:200};
    const r=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs`,{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify({target:url,category,priority,status:"queued"})});
    if(!r.ok){ const d=await r.json().catch(()=>null); return {ok:false,url,reason:"write_failed",status:r.status,detail:d}; }
    return {ok:true,url,queued:true,deduplicated:false,status:r.status};
  } catch(e){ return {ok:false,url,reason:"exception"}; }
}

export default async function(req,res){
  const supplied=String(req.headers?.authorization||"").replace(/^Bearer\s+/i,"").trim();
  if(!INGEST_KEY||!supplied||supplied!==INGEST_KEY) return res.status(401).json({error:"Unauthorized"});
  if(!SUPABASE_KEY) return res.status(503).json({error:"Supabase service key not configured"});
  const incoming=Array.isArray(req.body?.sources)?req.body.sources:[];
  if(!incoming.length) return res.status(400).json({error:"sources array required"});
  if(incoming.length>MAX_BATCH) return res.status(413).json({error:`Maximum batch size is ${MAX_BATCH}`});
  const headers={"content-type":"application/json",apikey:SUPABASE_KEY,authorization:`Bearer ${SUPABASE_KEY}`};
  const results=[];
  for(let i=0;i<incoming.length;i+=CONCURRENCY){
    const slice=incoming.slice(i,i+CONCURRENCY);
    const settled=await Promise.all(slice.map(s=>one(s,headers)));
    results.push(...settled);
  }
  const queued=results.filter(x=>x.queued).length;
  const deduplicated=results.filter(x=>x.deduplicated).length;
  const failed=results.length-queued-deduplicated;
  return res.status(failed?207:200).json({ok:failed===0,warehouse:"supabase",processed:results.length,queued_successfully:queued,deduplicated,failed,results});
}