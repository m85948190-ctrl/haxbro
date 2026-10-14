export const access = "public";
export const methods = ["POST"];

// Browser-local KAI performs the neural build; this endpoint is native recovery only.
import { buildNativeProduct } from 'lib/kai-native-builder';

function simpleInteractiveRecovery(prompt,appName){
  const title=String(appName||((String(prompt).match(/\b(?:called|named|titled|name it|call it)\s+["']?([^"'\n,.!?]{1,60}?)(?=\s+(?:that|which|who)\b|[,\n.!?]|$)/i)||[])[1])||'Interactive App').trim().slice(0,60);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>'+esc(title)+'</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#07111b;color:#edf8ff;font:16px system-ui,sans-serif}.app{width:min(640px,100%);padding:clamp(24px,5vw,48px);border:1px solid #244457;border-radius:24px;background:#0c1b29;box-shadow:0 24px 80px #0006}small{color:#72ddff;font-weight:800;letter-spacing:.14em}h1{font-size:clamp(32px,6vw,52px);margin:12px 0}#message{font-size:28px;margin:28px 0 8px}p{color:#9eb5c6;line-height:1.6}button{border:0;border-radius:12px;padding:13px 18px;background:#a9efff;color:#061018;font-weight:900;cursor:pointer}button:focus-visible{outline:3px solid #72ddff;outline-offset:3px}</style></head><body><main class="app"><small>HAxBRO · LOCAL RECOVERY</small><h1>'+esc(title)+'</h1><p>A small interactive app generated locally so you can preview and test the core behavior.</p><h2 id="message" aria-live="polite">Hello</h2><button id="change" type="button">CHANGE MESSAGE</button><p id="status" role="status">Ready.</p></main><script>document.getElementById("change").addEventListener("click",()=>{document.getElementById("message").textContent="World";document.getElementById("status").textContent="Message updated successfully."});</script></body></html>';
  return {name:title,summary:'Working single-page app with a visible message and a functional button interaction.',files:[{path:'index.html',content:html}],kai:{engine:'KAI Native Interactive Recovery',intelligence:'local-deterministic',provider:'none'}};
}
export default async function(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST required"});
  const prompt=String(req.body?.prompt||"").trim();
  if(!prompt) return res.status(400).json({error:"Describe the app you want to build."});
  const existing=req.body?.existing&&typeof req.body.existing==='object'?req.body.existing:null;
  const requestedName=String(req.body?.appName||existing?.name||'').trim();
  try{
    // The server-side model path is intentionally disabled; the browser-local KAI lane
    // is attempted by the client first. This endpoint is its fast, truthful recovery path.
    // Do not wait for web research or knowledge retrieval before returning a usable artifact.
    if(existing){
      const modified=buildNativeProduct(prompt,{existing,appName:requestedName});
      return res.json({ok:true,...modified,published:false,publicUrl:'',fallback:true,recovery:'targeted-local-modification',agent:{name:'KAI 51 Native Modification Recovery',authority:'KAI 51',compute:'local-deterministic',provider:null},export:{route:'/api/app-export',downloadRoute:'/api/app-download',formats:['html','bundle']}});
    }
    if(/\bbutton\b/i.test(prompt)&&/\b(?:chang(?:e|es|ing)|update|switch|replace|toggle)\b/i.test(prompt)&&/\b(?:message|text|label|word)\b/i.test(prompt)){
      const simple=simpleInteractiveRecovery(prompt,requestedName);
      return res.json({ok:true,...simple,published:false,publicUrl:'',fallback:true,recovery:'first-party-interactive-recovery',agent:{name:'KAI 51 Native Interactive Recovery',authority:'KAI 51',compute:'local-deterministic',provider:null},export:{route:'/api/app-export',downloadRoute:'/api/app-download',formats:['html','bundle']}});
    }
    const native=buildNativeProduct(prompt,{appName:requestedName});
    return res.json({ok:true,...native,published:false,publicUrl:'',fallback:true,recovery:'first-party-local-app-maker',agent:{name:'KAI 51 Native App Maker Recovery',authority:'KAI 51',compute:'local-deterministic',provider:null},export:{route:'/api/app-export',downloadRoute:'/api/app-download',formats:['html','bundle']}});
  }catch(e){
    return res.status(500).json({error:e?.message||'KAI App Maker recovery failed'});
  }
}