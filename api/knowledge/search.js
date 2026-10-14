export const access = "public";
export const methods = ["GET"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs = { apikey: SUPABASE_KEY || "", authorization: `Bearer ${SUPABASE_KEY || ""}` };

export default async function(req,res){
  try {
    const q=String(req.query?.q||"").trim();
    if(!q) return res.json({results:[]});
    if(!SUPABASE_KEY) return res.status(503).json({results:[],error:"Supabase knowledge service not configured"});
    const term=encodeURIComponent(`*${q}*`);
    const url=`${SUPABASE_URL}/rest/v1/haxbro_chunks?select=chunk_index,content,page_id,haxbro_pages(url,title,fetched_at)&content=ilike.${term}&limit=20`;
    const r=await fetch(url,{headers:hdrs});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({results:[],error:"Supabase knowledge search failed",detail:data});
    const results=(Array.isArray(data)?data:[]).map(x=>({url:x.haxbro_pages?.url||"",title:x.haxbro_pages?.title||"",content:x.content||"",chunk_index:x.chunk_index,fetched_at:x.haxbro_pages?.fetched_at||null}));
    return res.json({results,store:"supabase",format:"plain_text"});
  } catch(e){
    console.error(e);
    return res.status(500).json({results:[],error:"Knowledge search unavailable"});
  }
}