import { buildNativeProduct } from 'lib/kai-native-builder';
export const access='public';
export const methods=['POST'];
const safe=(v,n=9000)=>String(v??'').replace(/\u0000/g,'').slice(0,n);
function classify(s){const t=String(s).toLowerCase();if(/calculator|calc/.test(t))return'calculator';if(/task|todo|kanban|project management/.test(t))return'productivity';if(/note/.test(t))return'notes';if(/timer|pomodoro|countdown/.test(t))return'timer';if(/draw|canvas|paint|editor/.test(t))return'creative tool';if(/dashboard|analytics/.test(t))return'dashboard';if(/game|snake|quiz/.test(t))return'game';return'custom web product'}
export default async function(req,res){
 const prompt=safe(req.body?.prompt,3500); if(!prompt)return res.status(400).json({error:'Tell KAI what you want to change or build.'});
 const product=req.body?.product||null;
 const files=product?.files?.length?product.files:[];
 const type=classify(prompt);
 const intent={productType:type,latestRequest:prompt,preserveIdentity:!!files.length,requiredFlow:['understand','modify or build','validate','deliver']};
 const native=buildNativeProduct(prompt,{existing:files.length?product:null,appName:product?.name||''});
 return res.json({reply:'KAI understood the requested change as a '+type+' task and prepared the native build path.',ready:true,confidence:.92,understanding:intent,buildBrief:JSON.stringify(intent),questions:[],toolPlan:['inspect_product','understand_intent','native_modify_or_build','test_interactions','preserve_existing_features'],nativePreview:{name:native.name,summary:native.summary,files:native.files},kai:{engine:'KAI Native Product Compiler',provider:'none',local:true}});
}