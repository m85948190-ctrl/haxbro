import { classifyIntent, createExecutionPlan, validateProviderResult } from '../../lib/kai-ci.js';
import { appIntentCi } from 'lib/app-intent-intelligence';

export const access='public';
export const methods=['POST'];

export default async function(req,res){
 const body=req.body||{},message=String(body.message||'').trim();
 if(!message)return res.status(400).json({ok:false,error:'message is required'});
 const appIntent=appIntentCi(message);
 const plan=createExecutionPlan(message,String(body.username||'anonymous'));
 const validation=Array.isArray(body.providerResults)?body.providerResults.map(validateProviderResult):[];
 const valid=validation.filter(x=>x.ok).length;
 const recovery=valid?{action:'select-best-valid',candidates:valid}:appIntent.wantsApp?{action:'handoff-workspace',workspace:'app-maker'}:plan.intent.workspace?{action:'handoff-workspace',workspace:plan.intent.workspace}:{action:'retry-or-degrade'};
 res.json({ok:true,identity:'KAI 51',appIntent,intent:classifyIntent(message),plan,recovery,validation});
}