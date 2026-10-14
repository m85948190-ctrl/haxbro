import { events } from 'hatchable';
export const access='public';
export const methods=['GET','POST','OPTIONS'];
export default async function(req,res){const job=String(req.query?.job||req.body?.job||'').trim();if(!/^kai_[a-z0-9_]+$/i.test(job))return res.status(400).json({error:'invalid job'});return res.json(await events.grant(['kai:'+job],{ttl:900}));}