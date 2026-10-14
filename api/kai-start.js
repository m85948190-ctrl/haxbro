import { scheduler } from 'hatchable';
export const access='public';
export const methods=['POST','OPTIONS'];
function cors(res){res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-allow-methods','POST, OPTIONS');res.setHeader('access-control-allow-headers','content-type');}
function id(){return 'kai_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10)}
export default async function(req,res){cors(res);if(req.method==='OPTIONS')return res.status(204).send('');if(req.method!=='POST')return res.status(405).json({error:'POST required'});const body=req.body||{};const jobId=id();return res.json({ok:true,jobId,channel:'kai:'+jobId});}