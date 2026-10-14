export const access = "public";
export const methods = ["POST"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INGEST_KEY = process.env.HAXBRO_INGEST_KEY;

function clean(value, max=5000){ return typeof value === "string" ? value.trim().slice(0,max) : ""; }

export default async function(req,res){
  const supplied = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if(!INGEST_KEY || !supplied || supplied !== INGEST_KEY) return res.status(401).json({error:"Unauthorized"});
  if(!SUPABASE_KEY) return res.status(503).json({error:"Supabase service key not configured"});

  const body=req.body||{};
  const url=clean(body.url,2000);
  if(!/^https?:\/\//i.test(url)) return res.status(400).json({error:"Valid public http(s) URL required"});
  const title=clean(body.title,300) || url;
  const category=clean(body.category,120) || "general";
  const priority=Math.max(0,Math.min(3,Number(body.priority||2)));
  try{
    const headers={"content-type":"application/json",apikey:SUPABASE_KEY,authorization:`Bearer ${SUPABASE_KEY}`};
    const existsResp=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs?select=id,status,target&target=eq.${encodeURIComponent(url)}&limit=1`,{headers});
    const existsData=await existsResp.json();
    if(!existsResp.ok) return res.status(existsResp.status).json({error:"Supabase queue lookup failed",detail:existsData});
    if(Array.isArray(existsData)&&existsData.length){
      return res.status(200).json({ok:true,warehouse:"supabase",queued:false,deduplicated:true,target:url,existing:existsData[0]});
    }
    const r=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs`,{method:"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({target:url,category,priority,status:"queued"})});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:"Supabase queue write failed",detail:data});
    return res.status(201).json({ok:true,warehouse:"supabase",queued:true,target:url,result:data});
  }catch(e){
    console.error(e);
    return res.status(502).json({error:"Supabase queue unavailable"});
  }
}