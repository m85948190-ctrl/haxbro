export const access = "public";
export const methods = ["GET"];
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: SUPABASE_KEY || "", authorization: `Bearer ${SUPABASE_KEY || ""}` };
export default async function(req,res){
  try {
    if(!SUPABASE_KEY) return res.status(503).json({sources:0,chunks:0,workers:0,error:'Supabase knowledge service not configured'});
    const [src, ch, w] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/haxbro_knowledge_sources?select=id&limit=1`,{headers:{...hdrs,Prefer:'count=exact'}}),
      fetch(`${SUPABASE_URL}/rest/v1/haxbro_knowledge_chunks?select=id&limit=1`,{headers:{...hdrs,Prefer:'count=exact'}}),
      fetch(`${SUPABASE_URL}/rest/v1/haxbro_knowledge_workers?select=id&limit=1`,{headers:{...hdrs,Prefer:'count=exact'}})
    ]);
    const parseCount = r => Number((r.headers.get('content-range')||'*/0').split('/')[1]||0);
    if(!src.ok||!ch.ok||!w.ok) return res.status(502).json({sources:0,chunks:0,workers:0,error:'Supabase knowledge status failed'});
    return res.json({sources:parseCount(src),chunks:parseCount(ch),workers:parseCount(w),store:'supabase'});
  } catch(e){ console.error(e); return res.status(500).json({sources:0,chunks:0,workers:0,error:'Knowledge status unavailable'}); }
}