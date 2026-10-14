import { db } from 'hatchable';
export const access='public';
export const methods=['GET','POST'];
export default async function(req,res){
  try{
    if(req.method==='POST'){
      const b=req.body||{};
      await db.query('INSERT INTO haxbro_chat_analytics (mode,knowledge_source,provider,model,response_ms,success) VALUES ($1,$2,$3,$4,$5,$6)',[
        String(b.mode||'normal'),String(b.knowledgeSource||'none'),b.provider||null,b.model||null,Number.isFinite(Number(b.responseMs))?Number(b.responseMs):null,b.success!==false
      ]);
      return res.json({ok:true});
    }
    const totals=await db.query('SELECT count(*)::int AS total,count(*) FILTER (WHERE success=true)::int AS successful FROM haxbro_chat_analytics');
    const sources=await db.query('SELECT knowledge_source,count(*)::int AS count FROM haxbro_chat_analytics GROUP BY knowledge_source ORDER BY count DESC');
    const providers=await db.query("SELECT coalesce(provider,'unknown') AS provider,count(*)::int AS count,round(avg(response_ms))::int AS avg_ms FROM haxbro_chat_analytics GROUP BY coalesce(provider,'unknown') ORDER BY count DESC");
    const t=totals.rows[0]||{total:0,successful:0,researched:0};
    const total=Number(t.total||0);
    const own=Number(sources.rows.find(x=>x.knowledge_source==='supabase')?.count||0);
    const ownPlus=Number(sources.rows.find(x=>x.knowledge_source==='supabase+notion')?.count||0);
    const internal=own+ownPlus;
    res.json({total,successful:Number(t.successful||0),internal_knowledge_answers:internal,external_or_no_knowledge_answers:Math.max(0,total-internal),independence_percent:total?Math.round(internal/total*100):0,sources:sources.rows,providers:providers.rows});
  }catch(e){console.error(e);res.status(500).json({error:'Analytics unavailable'});}
}