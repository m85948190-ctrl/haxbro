import { buildNativeProduct } from 'lib/kai-native-builder';

export const access='public';
export const methods=['POST'];

export default async function(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'POST required'});
  const prompt=String(req.body?.prompt||req.body?.idea||'').trim();
  if(!prompt) return res.status(400).json({ok:false,error:'Tell KAI what application to build.'});
  const existing=req.body?.existing&&typeof req.body.existing==='object'?req.body.existing:null;
  try{
    // The server-side model computation is disabled by design. This route is the
    // legacy UI's local recovery lane, so return a real native artifact immediately.
    const native=buildNativeProduct(prompt,{existing,appName:String(req.body?.appName||existing?.name||'').trim()});
    return res.json({ok:true,...native,published:false,publicUrl:'',fallback:true,recovery:existing?'targeted-local-modification':'first-party-local-app-maker',agent:{name:existing?'KAI 51 Native Modification Recovery':'KAI 51 Native App Maker Recovery',authority:'KAI 51',compute:'local-deterministic',provider:null},export:{route:'/api/app-export',downloadRoute:'/api/app-download',formats:['html','bundle']}});
  }catch(e){
    return res.status(422).json({ok:false,error:e?.message||'KAI 51 App Maker could not safely complete the requested build or modification.'});
  }
}