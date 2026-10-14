import { createKai51Plan, truthfulIdentity } from "lib/kai51-core";
import { browser } from "hatchable";
import { retrieveKaiContext, knowledgePrompt } from "lib/kai-knowledge";

const clean=(v,n=30000)=>String(v??"").replace(/\u0000/g,"").slice(0,n);
const escName=v=>clean(v,100).replace(/[<>"'\`]/g,"").replace(/\s+/g," ").trim();

function extractJson(value){
  const raw=String(value||"").trim();
  const fenced=raw.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/i);
  const text=fenced?fenced[1]:raw;
  const a=text.indexOf("{"), b=text.lastIndexOf("}");
  if(a<0||b<a) throw new Error("KAI 51 returned invalid build data.");
  return JSON.parse(text.slice(a,b+1));
}
function htmlFrom(v){
  const s=String(v||"");
  const a=s.toLowerCase().indexOf("<!doctype html>");
  const b=s.toLowerCase().lastIndexOf("</html>");
  return a>=0&&b>a?s.slice(a,b+7):"";
}
function titleFrom(html){
  const m=String(html||"").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return escName((m?.[1]||"KAI Product").replace(/<[^>]+>/g,""));
}

function isWebAnswerProduct(request){
  const q=String(request||'');
  return /\b(?:ai assistant|ai search|ai answer|answer engine|web search|web-answer|research assistant|search assistant|search and answer|chat assistant|chatbot|chat bot|conversational ai)\b/i.test(q)
    || (/\b(?:ai|artificial intelligence)\b/i.test(q) && /\b(?:search|answer|questions?|web|research)\b/i.test(q));
}
function injectWebAnswerRuntime(html,request){
  if(!isWebAnswerProduct(request)) return html;
  if(/HAXBRO_WEB_ANSWER_RUNTIME_V1/.test(String(html||""))) return html;
  const bridge = `<script id="HAXBRO_WEB_ANSWER_RUNTIME_V1">
(()=> {
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=s=>String(s??'').replace(/\\s+/g,' ').trim();
  const words=q=>clean(q).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2).slice(0,12);
  const pick=(text,q)=>{
    const parts=String(text||'').replace(/\\s+/g,' ').split(/(?<=[.!?])\\s+/).map(clean).filter(x=>x.length>35);
    const ws=words(q);
    const scored=parts.map((s,i)=>({s,i,score:ws.reduce((n,w)=>n+(s.toLowerCase().includes(w)?1:0),0)})).sort((a,b)=>b.score-a.score||a.i-b.i);
    const useful=scored.filter(x=>x.score>0).slice(0,3).map(x=>x.s);
    return useful.length?useful.join(' '):parts.slice(0,2).join(' ');
  };
  const find=()=>{
    const form=document.querySelector('form');
    const input=document.querySelector('textarea,input[type="text"],input:not([type])');
    const buttons=[...document.querySelectorAll('button,input[type="submit"]')];
    const send=buttons.find(b=>/send|search|ask|submit|go/i.test(b.textContent||b.value||''))||buttons[buttons.length-1];
    const surface=document.querySelector('[id*="message" i],[class*="message" i],[id*="chat" i],[class*="chat" i],[id*="result" i],[class*="result" i],[id*="answer" i],[class*="answer" i]')||document.querySelector('main')||document.body;
    return {form,input,send,surface};
  };
  const append=(surface,html)=>{
    const box=document.createElement('div');
    box.className='haxbro-web-answer';
    box.style.cssText='margin:14px 0;padding:14px 16px;border:1px solid rgba(80,180,255,.22);border-radius:16px;line-height:1.55;white-space:normal';
    box.innerHTML=html;
    surface.appendChild(box);
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  let inFlight=false;
  let lastQuery='';
  let lastAcceptedAt=0;
  const submit=async e=>{
    const {input,surface}=find();
    const q=clean(input?.value);
    if(!q)return;
    const now=Date.now();
    // One physical user action must produce one request. This protects against
    // duplicated form/click/keydown listeners and rapid repeated event dispatch.
    if(inFlight || (q===lastQuery && now-lastAcceptedAt<4000)){
      e?.preventDefault?.(); e?.stopImmediatePropagation?.();
      return;
    }
    inFlight=true; lastQuery=q; lastAcceptedAt=now;
    e?.preventDefault?.(); e?.stopPropagation?.(); e?.stopImmediatePropagation?.();
    append(surface,'<div style="opacity:.7">Searching the web…</div>');
    const loading=surface.lastElementChild;
    try{
      const r=await fetch('/api/kai/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:q,mode:'fast'})});
      const d=await r.json();
      if(!r.ok||!Array.isArray(d.sources))throw new Error(d.error||'Web search failed');
      const sources=d.sources.filter(s=>s&&s.url).slice(0,4);
      const answer=sources.map(s=>pick(s.text||s.title,q)).filter(Boolean).slice(0,3).join(' ');
      const sourceHtml=sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title||s.url)+'</a></li>').join('');
      loading.remove();
      append(surface,(answer?'<div>'+esc(answer)+'</div>':'<div>No reliable web result found for this request.</div>')+(sourceHtml?'<div style="margin-top:10px"><strong>Sources</strong><ul>'+sourceHtml+'</ul></div>':''));
    }catch(err){
      loading.innerHTML='<div>Web search could not complete this request. Please try again.</div>';
    }finally{
      // Release the lock after the request completes. A new, different question
      // can be sent immediately; the same question is still deduped for 4 seconds.
      inFlight=false;
    }
  };
  const wire=()=>{
    const {form,input,send}=find();
    if(!input)return;
    // Capture at document level so generated apps with multiple legacy handlers
    // cannot echo/submit the same user message several times.
    if(!window.__haxbroWebAnswerEvents){
      window.__haxbroWebAnswerEvents=true;
      document.addEventListener('submit',e=>{
        const f=e.target;
        if(f&&f.contains(input)){submit(e);}
      },true);
      document.addEventListener('click',e=>{
        const target=e.target?.closest?.('button,input[type="submit"]');
        if(target&&((send&&target===send)||/send|search|ask|submit|go/i.test(target.textContent||target.value||'')))submit(e);
      },true);
      document.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&!e.shiftKey&&e.target===input)submit(e);
      },true);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
</script>`;
  return /<\/body>/i.test(html)?html.replace(/<\/body>/i,bridge+'</body>'):html+bridge;
}
async function designResearch(request){
  const q=clean(request,500).replace(/\s+/g," ").trim();
  if(!q)return {query:"",results:[]};
  try{
    const result=await browser.session(async page=>{
      const url="https://www.google.com/search?q="+encodeURIComponent(q+" app UI design");
      await page.goto(url,{waitUntil:"domcontentloaded"});
      return await page.evaluate(()=>{
        return Array.from(document.querySelectorAll("a")).map(a=>({
          title:(a.querySelector("h3")?.textContent||a.textContent||"").trim(),
          url:a.href||""
        })).filter(x=>x.title&&/^https?:/i.test(x.url)).slice(0,8);
      });
    });
    return {query:q,results:Array.isArray(result)?result:[]};
  }catch(e){
    return {query:q,results:[],error:"design research unavailable"};
  }
}
function inspect(html,request){
  const h=String(html||""); const l=h.toLowerCase(); const q=String(request||"").toLowerCase();
  const checks=[
    ["doctype",/^\s*<!doctype html>/i.test(h)],
    ["viewport",/name=["']viewport["']/i.test(h)],
    ["css",/<style[\s>]/i.test(h)],
    ["javascript",/<script[\s>]/i.test(h)],
    ["controls",/<(?:button|input|select|textarea|form)[\s>]/i.test(h)],
    ["events",/addEventListener|onclick|onsubmit|onchange|oninput/i.test(h)],
    ["responsive",/@media|clamp\(/i.test(h)],
    ["visible interface",/<body[^>]*>/i.test(h)&&/<(?:header|main|section|div|form|nav|footer)[\s>]/i.test(h)]
  ];
  if(/calculator|calculator app|arithmetic/.test(q)) checks.push(["calculator logic",/calculate|operator|keydown|eval|expression/i.test(l)]);
  if(/game|playable/.test(q)) checks.push(["game loop or canvas",/canvas|requestanimationframe|keydown|pointer/i.test(l)]);
  if(/chatbot|chat bot|chat assistant|conversational|messaging|ai assistant/.test(q)){
    checks.push(
      ["chat composer",/<(?:textarea|input)[^>]*(?:prompt|message|chat|input)[^>]*>/i.test(h)||/<(?:textarea|input)[^>]*>/i.test(h)],
      ["chat submit control",/<(?:button|form)[^>]*(?:send|submit|message|chat)[^>]*>/i.test(h)||/<form[\\s>]/i.test(h)],
      ["message surface",/(?:messages|message-list|chat-messages|conversation|chat-log|transcript)/i.test(l)],
      ["response mutation",/(?:textcontent|innerhtml|appendchild|insertadjacenthtml|createelement|append\()/i.test(l)],
      ["chat response path",/(?:reply|response|respond|assistant|bot).{0,180}(?:textcontent|innerhtml|appendchild|append\(|createelement)/is.test(l)||/(?:textcontent|innerhtml|appendchild|append\(|createelement).{0,180}(?:reply|response|respond|assistant|bot)/is.test(l)]
    );
  }
  const passed=checks.filter(x=>x[1]).length;
  return {checks:checks.map(([name,ok])=>({name,ok})),passed,total:checks.length,passRate:passed/checks.length};
}

async function compute(system,prompt,maxTokens=9000){
  throw new Error("KAI 51 server app-generation inference is disabled: no external model provider is permitted. Use the browser-local KAI 51 neural runtime for model generation.");
}

async function synthesize(request,context,phase="BUILD"){
  const plan=createKai51Plan({prompt:request,username:"app-maker",history:context});
  const system=`${truthfulIdentity()}

You are KAI 51, the independent intelligence and build authority inside HAxBRO AI App Maker.
This is a LIVE PRODUCT BUILD AGENT, not a template selector and not a deterministic demo compiler.

Your job:
1. Understand the user's actual product request.
2. Decide the product type, information architecture, screens, state, interactions and edge cases.
3. Generate the actual working application.
4. Inspect it against the request.
5. Repair defects when validation finds them.
6. Preserve existing applications during modifications.

IMPORTANT:
- The user's requested product is authoritative. A calculator must be a calculator; a game must be a game; a CRM must be a CRM. Never replace a specific product with a generic dashboard, task list, chatbot, or "KAI Product".
- Think internally, but NEVER expose chain-of-thought. Return concise plan metadata plus the artifact.
- Every visible control must have real behavior. Do not create decorative buttons.
- Implement actual state and interactions in JavaScript. Use browser-local persistence when useful.
- Build responsive desktop/tablet/mobile layouts. Avoid overlap, clipping, giant empty areas and controls covering other controls.
- For existing apps: preserve the existing name, purpose, working features and identity unless the user explicitly asks to change them. Apply the requested modification in place.
- A visual request such as "make the UI red" is NOT a rename request.
- If the user asks to fix overlap/collision, repair layout; do not rename the product.
- Use only self-contained HTML with inline CSS and JavaScript. No external npm packages and no dependency on HAxBRO runtime for the generated app unless the request explicitly needs a public API.
- The generated HTML MUST begin with <!doctype html> and contain a viewport meta tag.
- NEVER substitute a requested product with a generic chatbot, dashboard, landing page, or placeholder. If the request is not a chatbot, there must be no chatbot UI.
- If the request IS a chatbot/chat assistant/messaging app, it MUST contain a prominent visible message composer (textarea or input), a visible send/submit control, a scrollable conversation/message surface, user-message rendering, assistant-message rendering, Enter-to-send behavior where appropriate, loading state, empty state, and a guaranteed local response path that works without an external API. The first user message must produce a visible assistant response; do not create a dead chat shell.
- For generated chat apps, the local response path must be implemented entirely in the artifact and must not depend on an unavailable HAxBRO runtime, secret key, or provider. If an external AI API is explicitly requested, implement it with a local fallback so the UI still responds when the API is unavailable.
- If the requested product is an AI answer/search assistant, web-answer tool, research assistant, or anything whose core job is "search the web and answer": build a REAL working web-search experience, not an echo/demo. The generated artifact MUST call the same-origin HAxBRO web-search route /api/kai/search with POST JSON containing query and mode; never call Groq, OpenAI, Gemini, Anthropic, or any other model API directly from the generated artifact. Render a visible searching state, then synthesize an answer locally from returned page text/snippets using deterministic extraction (matching sentences, definition-like sentences, headings, and concise source-backed excerpts), and always render clickable source links. If search returns no sources, show a useful "No reliable web result found" state instead of repeating the user's text. The first normal query must produce either a source-backed answer or a clear search failure message. Enter and the send button must both work. This rule is specifically for web-answer apps and does not turn every generated app into a chatbot.
- WEB DESIGN RESEARCH IS REFERENCE INPUT: compare the live search references with the user's requested product, extract useful layout/interaction conventions, and then design an original implementation. Do not copy source code, text, logos or proprietary visual assets from referenced sites.
- Do not return markdown. Return ONLY JSON with:
{"name":string,"summary":string,"productType":string,"features":string[],"screens":string[],"architecture":string,"html":string,"testChecklist":string[]}

PHASE: ${phase}
SESSION PLAN:
${JSON.stringify(plan)}

PROJECT CONTEXT:
${clean(context,24000)}`;

  const prompt=`USER REQUEST:
${clean(request,9000)}

${phase==="REPAIR"?"REPAIR TASK: Inspect the current artifact below. Fix every issue indicated by validation while preserving all working behavior.":""}

Return the finished artifact, not instructions to the user.
${phase==="REPAIR"? "\nCURRENT ARTIFACT:\n"+clean(context,28000):""}`;

  const r=await compute(system,prompt,12000);
  return extractJson(r);
}

export async function runAppMakerAgent(prompt,{existing=null,appName=""}={}){
  const request=clean(prompt,9000).trim();
  if(!request) throw new Error("Describe the application you want KAI 51 to build.");

  const logs=[];
  const log=(stage,message,meta={})=>logs.push({stage,message,at:new Date().toISOString(),...meta});
  const existingHtml=existing?.files?.find(f=>/\.html$/i.test(String(f.path||"")) )?.content||"";
  log("UNDERSTAND","KAI 51 is interpreting the product intent and existing application state.");
  log("RESEARCH","KAI 51 is checking live web references for current product patterns, visual structure and interaction conventions.");
  const research=await designResearch(request);
  const kaiContext=await retrieveKaiContext(request,{history:existing?.summary||""});
  const context=JSON.stringify({
    brand:"HAxBRO AI / Hacks Bro AI",
    appMaker:"KAI 51 / I51",
    visual:"premium futuristic professional; restrained black/midnight and electric cyan/blue",
    request,
    existingName:existing?.name||appName||"",
    existingSummary:existing?.summary||"",
    existingHtml:existingHtml.slice(0,28000),
    webDesignResearch:research,
    kaiKnowledgeLayer:{
      contract:knowledgePrompt(kaiContext),
      researched:kaiContext.researched,
      sources:kaiContext.sources,
      toolResults:kaiContext.tools,
      knowledgeHits:kaiContext.knowledge.length
    }
  });
  log("PLAN","KAI 51 is combining product intent with retrieved knowledge, live references, organizing tools and source evidence before deciding product type, screens, state, interactions and responsive structure.",{researchResults:research.results?.length||0,knowledgeHits:kaiContext.knowledge.length,sourceCount:kaiContext.sources.length,webResearch:kaiContext.researched});

  let draft;
  try{
    draft=await synthesize(request,context,"BUILD");
  }catch(e){
    log("ERROR","KAI 51 build computation stopped: "+clean(e?.message||e,500));
    throw new Error("KAI 51 could not complete the live build computation.");
  }

  let html=htmlFrom(draft?.html);
  if(!html) throw new Error("KAI 51 returned no complete application artifact.");
  log("BUILD","KAI 51 generated the requested application artifact.",{productType:draft.productType||"custom"});

  // Make the generated web-answer experience functional in BOTH the srcdoc preview and the published artifact.
  // This bridge uses HAxBRO's existing web-search route and contains no model/provider credentials.
  html=injectWebAnswerRuntime(html,request);

  let validation=inspect(html,request);
  const chatBuild=/chatbot|chat bot|chat assistant|conversational|messaging|ai assistant|ai search|ai answer|answer engine|web search|research assistant|search assistant/i.test(request);
  const chatChecks=chatBuild?validation.checks.filter(x=>/^(chat composer|chat submit control|message surface|response mutation|chat response path)$/.test(x.name)):[];
  const chatContractPass=!chatBuild||chatChecks.length===5&&chatChecks.every(x=>x.ok);
  const needsRepair=validation.passRate<0.8||!chatContractPass;
  log("TEST",needsRepair?"Validation found product-contract issues; KAI 51 is running a repair pass.":"Initial structure and product-contract checks passed.",{validation,chatContractPass});

  if(needsRepair){
    try{
      const repairContext=JSON.stringify({...JSON.parse(context),currentArtifact:html.slice(0,28000),validation});
      const repaired=await synthesize(request,repairContext,"REPAIR");
      const repairedHtml=htmlFrom(repaired?.html);
      if(repairedHtml){
        const after=inspect(repairedHtml,request);
        const afterChatChecks=chatBuild?after.checks.filter(x=>/^(chat composer|chat submit control|message surface|response mutation|chat response path)$/.test(x.name)):[];
        const afterChatContract=!chatBuild||afterChatChecks.length===5&&afterChatChecks.every(x=>x.ok);
        if(after.passRate>=validation.passRate&&afterChatContract){
          draft={...draft,...repaired};
          html=repairedHtml;
          validation=after;
          log("REPAIR","KAI 51 completed a bounded repair pass.",{validation});
        }else{
          log("REPAIR","Repair output scored lower than the existing artifact; keeping the safer build.",{validation});
        }
      }
    }catch(e){
      log("REPAIR","Repair computation was unavailable; the initial validated artifact is retained.",{error:clean(e?.message||e,300)});
    }
  }

  html=injectWebAnswerRuntime(html,request);
  const finalName=existing?.name||escName(draft?.name)||escName(appName)||titleFrom(html);
  const summary=existing?.summary||clean(draft?.summary||"Working application generated by KAI 51.",900);
  log("VERIFY","KAI 51 completed final artifact verification. Preview is ready for human interaction testing.",{validation});

  return {
    name:finalName,
    summary,
    files:[{path:"index.html",content:html}],
    published:false,
    publicUrl:"",
    plan:{
      intent:request.slice(0,500),
      productType:clean(draft?.productType||finalName,180),
      features:Array.isArray(draft?.features)?draft.features.slice(0,20):[],
      screens:Array.isArray(draft?.screens)?draft.screens.slice(0,20):[],
      architecture:clean(draft?.architecture||"KAI 51 live product architecture",1000),
      validation:Array.isArray(draft?.testChecklist)?draft.testChecklist.slice(0,20):[]
    },
    validation,
    knowledgeContext:{researched:kaiContext.researched,sources:kaiContext.sources,toolResults:kaiContext.tools,knowledgeHits:kaiContext.knowledge.length},
    agent:{
      name:"KAI 51 Live Product Agent",
      authority:"KAI 51",
      compute:"Hatchable managed AI runtime",
      provider:"KAI 51 orchestration; managed compute only",
      logs
    }
  };
}