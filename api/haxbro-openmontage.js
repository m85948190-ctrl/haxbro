import { openMontageConfigured, runOpenMontage } from 'lib/openmontage-runner';
export const access='public';
export const methods=['POST','OPTIONS'];
function cors(res){res.setHeader('access-control-allow-origin','*');res.setHeader('access-control-allow-methods','POST, OPTIONS');res.setHeader('access-control-allow-headers','content-type, authorization');}
export default async function(req,res){
  cors(res); if(req.method==='OPTIONS') return res.status(204).send('');
  const b=req.body||{}, prompt=String(b.prompt||'').trim();
  if(!prompt) return res.status(400).json({ok:false,error:'OpenMontage needs a production prompt.'});
  if(!openMontageConfigured()) return res.status(503).json({ok:false,engine:'OpenMontage',connected:false,error:'OpenMontage is not connected yet. HAxBRO will not fake the render.'});
  try{return res.json({ok:true,engine:'OpenMontage',connected:true,result:await runOpenMontage({prompt,referenceUrl:b.referenceUrl,type:b.type||'video',duration:b.duration,aspectRatio:b.aspectRatio||'16:9'})});}
  catch(error){return res.status(502).json({ok:false,engine:'OpenMontage',connected:true,error:error.message||'OpenMontage production failed'});}
}