import { appIntentCi } from 'lib/app-intent-intelligence';

export const access='public';
export const methods=['POST','OPTIONS'];

export default async function(req,res){
 if(req.method==='OPTIONS')return res.status(204).send('');
 const message=String(req.body?.message||req.body?.text||'').trim();
 if(!message)return res.status(400).json({ok:false,error:'message is required'});
 return res.json({ok:true,...appIntentCi(message),pipeline:['local-understand','local-classify','handoff']});
}