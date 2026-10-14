import { ai, browser } from 'hatchable';
import { KAI_NATIVE_ONLY } from 'lib/kai-native-test-mode';

export const access='public';
export const methods=['POST','OPTIONS'];

const clean=(v,n=9000)=>String(v??'').replace(/\u0000/g,'').slice(0,n).trim();
function has(s,words){return words.some(w=>s.includes(w));}

function lexical(prompt){
  const s=prompt.toLowerCase();
  const logo=has(s,['logo','logomark','brandmark','wordmark']);
  const thumb=has(s,['thumbnail','youtube','cover','promo','promotional','promotion','video']);
  const subjects=[];
  if(has(s,['skeleton','skull','bone','bones']))subjects.push('skeleton');
  if(has(s,['robot','android','cyborg','mech','droid']))subjects.push('robot');
  if(has(s,['bear','grizzly','panda','horse','dog','puppy','wolf','fox','cat','lion','tiger','bird','eagle','owl','snake','fish','shark','whale']))subjects.push('animal_or_creature');
  if(has(s,['human','person','man','woman','boy','girl']))subjects.push('human');
  const action=has(s,['destroy','destroying','break','breaking','fight','fighting','run','running','fly','flying','jump','jumping','explode','exploding'])?'action_requested':null;
  const m=s.match(/(?:called|named|name is|logo is)\s+["“]?([^"”.,]+)["”]?/i);
  const logoName=(m&&m[1]||'').trim();
  return {logo,thumbnail:thumb,logoName,subjects,action,primaryIntent:logo?'logo_promotion':thumb?'promotional_visual':subjects[0]||'visual_scene'};
}

async function webContext(prompt){
  const q=encodeURIComponent(prompt+' visual reference style design');
  try{return clean(await browser.html('https://www.bing.com/search?q='+q),12000)}catch(e){return '';}
}

function fallbackPlan(p,l){
  if(l.logo)return {assetType:'logo_promotion',subject:'the requested logo/brand identity',composition:'centered logo hero with strong negative space and thumbnail-safe hierarchy',textPolicy:'use the exact requested logo name; never replace it with a humanoid',geometry:'logo-first 2D/3D brand treatment; no character unless explicitly requested',camera:'front-facing hero/product camera',lighting:'clean studio lighting with controlled glow and depth',background:'purpose-built promotional background matching the request',motion:'subtle logo rotation/parallax only if requested',referenceSearch:'use web references only to understand style/composition, not to copy assets',negative:['generic humanoid','random character','unrequested anatomy','placeholder robot']};
  if(l.thumbnail)return {assetType:'promotional_thumbnail',subject:l.subjects[0]||'the exact subject described by the user',composition:'high-contrast thumbnail composition with clear focal subject and readable hierarchy',textPolicy:'preserve explicitly requested names/words',geometry:'subject-specific geometry only when a 3D subject is actually requested',camera:'thumbnail-safe framing',lighting:'dramatic but coherent depth lighting',background:'promotional scene derived from the request',motion:'none for still image',referenceSearch:'research current visual references when useful',negative:['default humanoid','random character']};
  return {assetType:l.subjects[0]||'scene',subject:l.subjects[0]||'exact requested scene',composition:'follow the semantic request before choosing a visual template',geometry:'subject-specific construction',camera:'auto-framed to the actual subject',lighting:'physically coherent depth lighting',referenceSearch:'research ambiguous terms when useful',negative:['default humanoid']};
}

export default async function(req,res){
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(KAI_NATIVE_ONLY)return res.status(503).json({ok:false,error:'KAI_NATIVE_ONLY',message:'Native-only test mode is active.'});
  const b=req.body||{},prompt=clean(b.prompt);
  if(!prompt)return res.status(400).json({ok:false,error:'Add an art prompt first.'});
  const lexicalResult=lexical(prompt);
  const web=await webContext(prompt);
  let model=null;
  try{
    model=await ai.generateText({
      model:'gpt-5',
      purpose:'haxbro-kai-4567-semantic-art-interpreter',
      maxSteps:1,
      prompt:'You are Kai 4-5-6-7, the semantic director BEFORE Kai 9.0. Your only job is to understand what the user actually wants to create and issue a precise machine-readable order to Kai 9.0. Never default to a humanoid. A logo request is a logo request. A thumbnail request is a promotional composition. A named object or animal must remain that object. User request: '+prompt+' Lexical hints: '+JSON.stringify(lexicalResult)+' Web reference material: '+web.slice(0,9000)+' Return ONLY JSON with keys assetType, subject, purpose, composition, text, geometry, materials, environment, lighting, camera, action, motion, framing, color, referenceGuidance, negativeConstraints, buildOrder. Be literal. Preserve exact names and requested entities. If the request says logo, do not invent a character. If the request says thumbnail, optimize for thumbnail composition. If the request asks for an action, encode the action. Web material is reference/context only; do not copy protected assets.'
    });
  }catch(e){console.warn('Kai 4567 model unavailable',e?.message||e);}
  let interpreted=null;
  if(typeof model==='string')try{interpreted=JSON.parse(model)}catch{}
  if(model && typeof model==='object'){
    const raw=model.text||model.output_text||model.content||model.result;
    if(typeof raw==='string')try{interpreted=JSON.parse(raw)}catch{}
  }
  const fallback=fallbackPlan(prompt,lexicalResult);
  const order=Object.assign({},fallback,interpreted||{});
  order.lexical=lexicalResult;
  order.webResearchUsed=Boolean(web);
  order.webResearchExcerpt=web.slice(0,4000);
  if(!order.text)order.text='';
  if(!order.action)order.action=lexicalResult.action;
  if(!order.negativeConstraints)order.negativeConstraints=fallback.negative;
  return res.json({ok:true,kai:'Kai 4-5-6-7',order,delegate:'Kai 9.0',instruction:'Build exactly this interpreted order. Do not substitute a generic humanoid.'});
}