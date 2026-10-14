import { ai } from 'hatchable';
import { KAI_NATIVE_ONLY } from 'lib/kai-native-test-mode';

export const access = 'public';

const RUBRICS = {
  image: ['visual quality','prompt fidelity','composition','lighting','artifacts','text legibility','anatomical/structural correctness'],
  pptx: ['content accuracy','slide hierarchy','layout consistency','typography','readability','visual polish','overflow/cutoff checks'],
  pdf: ['content completeness','page layout','typography','readability','spacing','broken/missing content','professional polish'],
  zip: ['archive completeness','expected files present','file naming','structure','obvious corruption/empty files','security hygiene'],
  generic: ['correctness','completeness','readability','presentation quality','file integrity','requirement fidelity']
};

export default async function(req,res){
  if(KAI_NATIVE_ONLY)return res.status(503).json({ok:false,error:'KAI_NATIVE_ONLY',message:'Native-only test mode is active.'});
  if(req.method !== 'POST') return res.status(405).json({ok:false,error:'POST required'});
  const body=req.body||{};
  const type=String(body.type||'generic').toLowerCase();
  const requested=String(body.requirements||body.prompt||'').trim();
  const evidence=body.evidence||body.metadata||{};
  const rubric=RUBRICS[type]||RUBRICS.generic;
  if(!requested && !Object.keys(evidence).length) return res.status(400).json({ok:false,error:'Provide requirements or artifact evidence.'});

  const prompt=`You are KAI 7.8, HAxBRO's independent artifact quality inspector. You are a strict gatekeeper, not a cheerleader. Evaluate the supplied artifact evidence against the user's requirements and the rubric. Do not claim to have visually opened or downloaded an artifact unless evidence says it was inspected. If evidence is insufficient for a criterion, mark it unknown rather than inventing a pass. Fail obvious requirement violations. Return ONLY JSON with: verdict (PASS|FAIL|REVIEW), score (0-100), confidence (0-1), summary, failures (array), warnings (array), checks (array of {name,status,reason}), repair_plan (array). A PASS requires no critical failures.\n\nARTIFACT TYPE: ${type}\nRUBRIC: ${rubric.join(', ')}\nUSER REQUIREMENTS: ${requested||'(not supplied)'}\nARTIFACT EVIDENCE: ${JSON.stringify(evidence).slice(0,18000)}`;

  try{
    const out=await ai.generateText({model:'gpt-mini',purpose:'HAxBRO KAI 7.8 artifact quality inspection',system:'Return valid JSON only. Be strict and evidence-based.',prompt,maxSteps:2});
    let text=typeof out==='string'?out:(out?.text||out?.output||'');
    text=text.replace(/^```json\s*/,'').replace(/```\s*$/,'').trim();
    let result;
    try{ result=JSON.parse(text); }catch{ result={verdict:'REVIEW',score:0,confidence:0,summary:'KAI 7.8 could not parse the inspection result.',failures:['Invalid evaluator response'],warnings:[],checks:[],repair_plan:['Run the inspection again.']}; }
    result.kai='7.8'; result.artifactType=type; result.inspectedAt=new Date().toISOString();
    res.json({ok:true,...result});
  }catch(e){
    res.status(502).json({ok:false,kai:'7.8',error:'KAI 7.8 inspection failed',detail:String(e?.message||e)});
  }
}