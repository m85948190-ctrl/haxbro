import { ai } from 'hatchable';
import { KAI_NATIVE_ONLY } from 'lib/kai-native-test-mode';
export const access='public';
export const methods=['POST','OPTIONS'];

const ROLES={
  'kai-23':{name:'Kai 23',job:'Image Quality Inspector',checks:['composition','anatomy/geometry consistency','lighting/shadows','prompt fidelity','artifacts','resolution/readiness']},
  'kai-34':{name:'Kai 34',job:'Video Quality Inspector',checks:['frame continuity','motion consistency','camera stability','temporal artifacts','prompt fidelity','delivery readiness']},
  'kai-45':{name:'Kai 45',job:'Frame Builder',checks:['keyframe construction','pose continuity','camera timing']},
  'kai-67':{name:'Kai 67',job:'Image Builder',checks:['scene construction','materials','lighting','composition']},
  'kai-78':{name:'Kai 78',job:'Motion Builder',checks:['motion planning','transitions','timing','camera paths']},
  'kai-89':{name:'Kai 89',job:'Render Builder',checks:['render parameters','frame assembly','output consistency']},
  'kai-098':{name:'Kai 098',job:'Precision Detailer',checks:['micro geometry','facial detail','mouth/eye detail','surface detail','exact proportions']}
};

function clean(v,n=8000){return String(v??'').replace(/\u0000/g,'').slice(0,n).trim();}
function roleData(id){return ROLES[id]||ROLES['kai-67'];}

function localPlan(prompt,mode){
  const p=prompt.toLowerCase();
  const isVideo=mode==='video'||/video|motion|animate|clip|film|camera move/.test(p);
  const is3d=/3d|character|robot|human|body|skeleton|architecture|scene|environment/.test(p);
  return {
    mode:isVideo?'video':'image',
    pipeline:is3d?'PROCEDURAL_3D_FIRST':'IMAGE_FIRST',
    localPreferred:true,
    steps:isVideo
      ? ['interpret scene','build keyframes','interpolate frames','render locally when supported','run Kai 34 continuity check','assemble video']
      : ['interpret prompt','construct scene/geometry','apply materials and lighting','render frame','run Kai 23 quality check','deliver asset'],
    constraints:['No cardboard-looking anatomy','Use continuous smooth visible geometry','Skeleton is a rig, not visible box primitives','Use real shadows/depth where renderer supports them']
  };
}

export default async function(req,res){
  if(KAI_NATIVE_ONLY)return res.status(503).json({ok:false,error:'KAI_NATIVE_ONLY',message:'Native-only test mode is active.'});
  if(req.method==='OPTIONS')return res.status(204).send('');
  const b=req.body||{};
  const action=clean(b.action||'plan',40);
  const role=clean(b.role||'kai-9',40);
  const prompt=clean(b.prompt);
  const mode=clean(b.mode||'image',20);

  if(action==='roles') return res.json({ok:true,name:'Kai 9.0',roles:Object.entries(ROLES).map(([id,v])=>({id,...v})),architecture:'Kai 9.0 coordinates specialized art workers; providers remain adapters/fallbacks.'});
  if(!prompt && action!=='roles') return res.status(400).json({ok:false,error:'Add an art prompt first.'});

  if(action==='plan'){
    const base=localPlan(prompt,mode);
    let aiPlan=null;
    try{
      const r=await ai.generateText({
        model:'sonnet',
        purpose:'haxbro-art-kai-9',
        maxSteps:1,
        prompt:`You are Kai 9.0, HAxBRO Art Intelligence. Create a compact production plan for this art request.
Request: ${prompt}
Mode: ${mode}
Requirements: procedural 3D when appropriate; smooth non-cardboard geometry; precise skeleton rig; detailed face/mouth/body; physically coherent lighting/shadows; local/browser rendering preferred; external providers only as adapters/fallbacks.
Return JSON with keys: scene,geometry,rig,lighting,camera,animation,render,qa.`
      });
      aiPlan=r;
    }catch(e){console.warn('Kai 9 planning model unavailable',e?.message||e)}
    return res.json({ok:true,kai:'Kai 9.0',lead:'Kai 9.0',assigned:role,base,aiPlan});
  }

  const rd=roleData(role);
  return res.json({ok:true,kai:'Kai 9.0',worker:rd.name,job:rd.job,checks:rd.checks,mode,request:prompt,
    result:{
      status:'planned',
      verdict:'READY',
      note:`${rd.name} has accepted the ${rd.job.toLowerCase()} stage. The role is isolated so Kai 9.0 can pass the asset to the next specialist.`
    }});
}