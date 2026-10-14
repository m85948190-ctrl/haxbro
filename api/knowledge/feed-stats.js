export const access = "public";
export const methods = ["GET"];
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hdrs={apikey:SUPABASE_KEY||"",authorization:`Bearer ${SUPABASE_KEY||""}`};
const q=(url)=>fetch(url,{headers:{...hdrs,Prefer:"count=exact"}});
const count=(r)=>Number((r.headers.get("content-range")||"*/0").split("/")[1]||0);
export default async function(req,res){
  try{
    if(!SUPABASE_KEY) return res.status(503).json({error:"Supabase unavailable"});
    const [sources,jobsQueued,jobsDone,jobsFailed,jobsTotal,pages,chunks]=await Promise.all([
      q(`${SUPABASE_URL}/rest/v1/haxbro_sources?select=id&limit=1`),
      q(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs?select=id&status=eq.queued&limit=1`),
      q(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs?select=id&status=in.(done,completed,indexed)&limit=1`),
      q(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs?select=id&status=in.(failed,error)&limit=1`),
      q(`${SUPABASE_URL}/rest/v1/haxbro_research_jobs?select=id&limit=1`),
      q(`${SUPABASE_URL}/rest/v1/haxbro_pages?select=id&limit=1`),
      q(`${SUPABASE_URL}/rest/v1/haxbro_chunks?select=id&limit=1`)
    ]);
    if([sources,jobsQueued,jobsDone,jobsFailed,jobsTotal,pages,chunks].some(r=>!r.ok)) return res.status(502).json({error:"Supabase analytics query failed"});
    const data={warehouse:"supabase",sources_stored:count(sources),queue_pending:count(jobsQueued),queue_completed:count(jobsDone),queue_failed:count(jobsFailed),queue_total:count(jobsTotal),pages_stored:count(pages),chunks_stored:count(chunks),generated_at:new Date().toISOString()};
    data.feed_success_percent=data.queue_total?Math.round((data.queue_completed/data.queue_total)*100):0;
    return res.json(data);
  }catch(e){return res.status(500).json({error:"Feed analytics unavailable"});}
}