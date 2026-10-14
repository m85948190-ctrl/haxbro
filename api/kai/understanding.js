export const access='public';
export const methods=['POST','OPTIONS'];

const clean=(v,n=5000)=>String(v??'').replace(/\u0000/g,'').replace(/\s+/g,' ').slice(0,n).trim();

async function webRecognize(input){
  const bing='https://api.bing.com/osjson.aspx?query='+encodeURIComponent(input);
  const sr=await fetch(bing,{headers:{'user-agent':'Mozilla/5.0 HAxBRO-KAI-89'}});
  if(!sr.ok)throw new Error('Bing suggestions HTTP '+sr.status);
  const data=await sr.json();
  const suggestions=Array.isArray(data?.[1])?data[1].map(x=>clean(x,240)).filter(Boolean).slice(0,8):[];
  const words=input.split(/\\s+/).filter(Boolean);
  let language='unknown';
  try{
    const gr=await fetch('https://www.google.com/search?gbv=1&hl=en&q='+encodeURIComponent(input),{headers:{'user-agent':'Mozilla/5.0 HAxBRO-KAI-89'}});
    if(gr.ok){
      const html=await gr.text();
      language=(html.match(/<html[^>]+lang=["']([^"']+)/i)||[])[1]||'unknown';
    }
  }catch{}
  const candidate=suggestions[0]||''; return {corrected:candidate,language,evidence:suggestions.join(' | '),suggestions};
}
function safeCorrection(input,web){
  const original=clean(input),candidate=clean(web?.corrected||'');
  if(!candidate||candidate.length<2||candidate.length>original.length+120)return original;
  const a=original.split(/\s+/).map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')).filter(Boolean);
  const b=candidate.split(/\s+/).map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,'')).filter(Boolean);
  if(!a.length||!b.length||Math.abs(a.length-b.length)>3)return original;
  return candidate;
}

export default async function(req,res){
  if(req.method==='OPTIONS')return res.status(204).send('');
  const input=clean(req.body?.text||req.body?.message);
  if(!input)return res.status(400).json({ok:false,error:'text required'});
  let web=null;
  try{web=await webRecognize(input);}catch(e){console.warn('KAI 89 web recognition unavailable',e?.message||e);}
  const normalized=safeCorrection(input,web);
  return res.json({ok:true,engine:'KAI 89',role:'web-language-recognition',normalizedText:normalized,language:clean(web?.language||'unknown',80),webEvidence:clean(web?.evidence||'',1800),intent:'unknown',confidence:normalized!==input?0.85:(web?.language&&web.language!=='unknown'?0.65:0.25),changed:normalized!==input,generated:false,webRecognized:true,handoff:'KAI 51'});
}