import { raceApis, KAI678_PROVIDERS } from 'lib/kai678';
import { KAI_NATIVE_ONLY } from 'lib/kai-native-test-mode';
export const access='public';
export const methods=['POST','OPTIONS'];
export default async function(req,res){
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(KAI_NATIVE_ONLY)return res.status(503).json({ok:false,error:'KAI_NATIVE_ONLY',message:'Native-only test mode is active.'});
  const prompt=String(req.body?.prompt||req.body?.message||'').trim();
  if(!prompt)return res.status(400).json({ok:false,error:'prompt required'});
  const r=await raceApis({prompt,maxTokens:Math.min(3000,Number(req.body?.maxTokens)||1800),timeoutMs:Math.min(6000,Number(req.body?.timeoutMs)||4200)});
  return res.status(r.ok?200:503).json({ok:!!r.ok,engine:'KAI 90',controller:'KAI 6·7·8',primary:true,providers:KAI678_PROVIDERS,...r});
}