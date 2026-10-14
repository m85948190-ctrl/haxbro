import { scheduler } from 'hatchable';
export const access='public';
export const methods=['POST'];
export default async function(req,res){
  const b=req.body||{};
  const job=String(b.jobId||'').trim();
  if(!/^kai_[a-z0-9_]+$/i.test(job))return res.status(400).json({error:'invalid job'});
  await scheduler.now('/api/kai-worker',{jobId:job,message:String(b.message||''),username:String(b.username||''),history:String(b.history||''),kaiMemory:String(b.kaiMemory||'')});
  return res.json({ok:true,started:true});
}