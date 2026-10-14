import { appIntentCi } from 'lib/app-intent-intelligence';

export const access='public';
export const methods=['POST'];

export default async function(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 const message=String(req.body?.message||'').trim();
 if(!message)return res.json({ok:true,engine:'KAI 51 · SINGLE INTENT ROUTER',capability:'chat',wantsApp:false,confidence:0,reason:'empty',destination:null,prompt:'',autoBuild:false});
 const result=appIntentCi(message);
 return res.json({
  ok:true,
  engine:'KAI 51 · SINGLE INTENT ROUTER',
  capability:result.wantsApp?'app-maker':'chat',
  ...result,
  pipeline:['local-app-intent-intelligence','preserve-original-prompt','handoff']
 });
}