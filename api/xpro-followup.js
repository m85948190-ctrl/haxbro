export const access='public';
export const methods=['POST'];
const clean=(v,n=12000)=>String(v??'').slice(0,n);
function answer(question,report){
 const q=clean(question,4000).toLowerCase(),r=report||{},sc=r.sourceCode||{},meta=sc.meta||{};
 const tech=(r.technologies||[]).join(', ')||'No technology was confidently detected.';
 if(/who (made|created|built|developed|designed)|creator|author|developer/.test(q)){
  return meta.author?'Public evidence identifies the author/creator as: '+meta.author+'. This is a page-level attribution, not independent proof of ownership.':'The public evidence does not establish who made or owns this site. I will not invent a creator.';
 }
 if(/tech|framework|stack|cms|built with/.test(q))return 'Detected technology signals: '+tech+'\nExternal scripts: '+((r.scripts||[]).length)+'\nPublic links: '+((r.publicLinks||[]).length)+'.';
 if(/how.*built|architecture|structure|source|code|detail/.test(q)){
  const layers=r.pageXray?.layers||[];
  return ['X Pro reconstruction from public evidence:','', 'Title: '+(meta.title||'none'), 'Technology: '+tech, 'External scripts: '+((r.scripts||[]).length), 'Forms: '+((sc.forms||[]).length), 'Source size: '+(sc.sourceBytes??r.responseSizeBytes??'unknown')+' bytes', 'Structure: '+layers.map(x=>x.name+': '+x.detail).join(' | '), '', 'This is limited to publicly returned evidence.'].join('\n');
 }
 return 'KAI X Pro can only answer this follow-up from the evidence already collected. Ask about the detected technology, public structure, source signals, links, scripts, forms, or attribution.';
}
export default async function(req,res){
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 const q=clean(req.body?.question,4000).trim();let report=req.body?.report;
 if(!q||!report)return res.status(400).json({ok:false,error:'A report and follow-up question are required.'});
 if(typeof report==='string'){try{report=JSON.parse(report)}catch{report={raw:clean(report,12000)}}}
 return res.json({ok:true,answer:answer(q,report),engine:'KAI · X PRO EVIDENCE NODE',provider:'none',nodes:['TARGET','IDENTITY','SOURCE','TECH','ASSETS','STRUCTURE','DATA FLOW','SECURITY','EXPOSURE','CORRELATION','RECONSTRUCTION','REPORT']});
}