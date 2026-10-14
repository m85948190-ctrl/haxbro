import { buildOpenMontagePlan } from 'lib/openmontage-bridge';

export const access='public';
export const methods=['POST','OPTIONS'];

function cors(res){
  res.setHeader('access-control-allow-origin','*');
  res.setHeader('access-control-allow-methods','POST, OPTIONS');
  res.setHeader('access-control-allow-headers','content-type');
}
const clean=(v,n=6000)=>String(v??'').replace(/\u0000/g,'').slice(0,n).trim();

export default async function(req,res){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).send('');
  const b=req.body||{};
  const prompt=clean(b.prompt);
  if(!prompt) return res.status(400).json({ok:false,error:'Describe what you want HAxBRO Creative Beast to make.'});
  const type=b.type==='video'?'video':b.type==='image'?'image':'auto';
  if(b.action==='plan'||!b.action||b.action==='prepare'){
    return res.json(buildOpenMontagePlan({prompt,type}));
  }
  return res.status(400).json({ok:false,error:'Unsupported creative action.'});
}