import { getTrainingPack, recordTrainingExample } from 'lib/kai-training';
import { admin } from 'hatchable';

export const access='public';
export const methods=['GET','POST'];

export default async function(req,res){
  try{
    const pack=await getTrainingPack();
    if(req.method==='GET'){
      return res.json({
        ok:true,
        source:'HATCHABLE',
        canonical:true,
        model:{name:'KAI 51',base:'HuggingFaceTB/SmolLM2-360M-Instruct',weightsHostedInHatchable:false},
        pack:{slug:pack.slug,version:pack.version,checksum:pack.checksum},
        rules:pack.rules,
        examples:pack.examples,
        sync:{required:true,cacheKey:'haxbro:kai51:training:'+pack.version+':'+pack.checksum}
      });
    }
    if(!await admin.check(req))return res.status(403).json({ok:false,error:'Owner authorization required for training updates.'});
    const body=req.body||{};
    if(body.action!=='record')return res.status(400).json({ok:false,error:'action=record required'});
    const example=await recordTrainingExample(body);
    return res.json({ok:true,source:'HATCHABLE',example});
  }catch(e){
    console.error('KAI training sync error',e);
    return res.status(500).json({ok:false,error:String(e?.message||e)});
  }
}