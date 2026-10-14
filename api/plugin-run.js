import { complete } from '../lib/kai.js';

export const access = 'public';
export const methods = ['POST'];

const json = (u, opts={}) => fetch(u, opts).then(async r => { const t=await r.text(); let d; try{d=JSON.parse(t)}catch{d=t}; if(!r.ok) throw new Error(`Provider returned HTTP ${r.status}`); return d; });
const text = (u, opts={}) => fetch(u, opts).then(async r => { const t=await r.text(); if(!r.ok) throw new Error(`Provider returned HTTP ${r.status}`); return t; });

export default async function(req,res){
  const {pluginId, request} = req.body || {};
  const q=typeof request==='string'?request.trim():'';
  if(!pluginId || !q) return res.status(400).json({error:'pluginId and request are required.'});
  try{
    let result;
    if(pluginId==='wikipedia'){
      const d=await json(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/\s+/g,'_'))}`);
      result={title:d.title,summary:d.extract||'No summary found.',url:d.content_urls?.desktop?.page};
    } else if(pluginId==='arxiv'){
      const xml=await text(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=5`);
      const entries=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>{const x=m[1];const pick=(tag)=>{const z=x.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));return z?z[1].replace(/<[^>]+>/g,'').trim():''};const link=x.match(/<id>([^<]+)<\/id>/)?.[1]||'';return {title:pick('title'),authors:[...x.matchAll(/<name>([^<]+)<\/name>/g)].map(a=>a[1]),published:pick('published'),url:link,summary:pick('summary')};});
      result={query:q,items:entries};
    } else if(pluginId==='github'){
      const d=await json(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=5`,{headers:{Accept:'application/vnd.github+json','User-Agent':'HAxBRO-Plugin'}});
      result={query:q,items:(d.items||[]).map(x=>({name:x.full_name,description:x.description,stars:x.stargazers_count,url:x.html_url,language:x.language}))};
    } else if(pluginId==='weather'){
      const geo=await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
      const p=geo.results?.[0]; if(!p) throw new Error('Location not found.');
      const d=await json(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`);
      result={location:`${p.name}, ${p.country}`,coordinates:{latitude:p.latitude,longitude:p.longitude},current:d.current,source:'Open-Meteo'};
    } else if(pluginId==='web-page-reader'){
      let url=q; if(!/^https?:\/\//i.test(url)) url='https://'+url;
      const html=await text(url,{headers:{'User-Agent':'HAxBRO-Web-Reader/1.0'}});
      const clean=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
      result={url,content:clean.slice(0,12000)};
    } else if(pluginId==='web-research'){
      const d=await json(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`);
      result={query:q,items:(d.query?.search||[]).map(x=>({title:x.title,snippet:x.snippet.replace(/<[^>]+>/g,''),url:'https://en.wikipedia.org/wiki/'+encodeURIComponent(x.title.replace(/ /g,'_'))}))};
    } else if(pluginId==='huggingface'){
      const key=process.env.HF_TOKEN;
      if(!key) throw new Error('Hugging Face token is not configured.');
      const r=await fetch('https://router.huggingface.co/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({model:'Qwen/Qwen2.5-7B-Instruct',messages:[{role:'user',content:q}],max_tokens:1800,temperature:0.2})});
      const raw=await r.text(); if(!r.ok) throw new Error(`Hugging Face HTTP ${r.status}: ${raw.slice(0,500)}`);
      const d=JSON.parse(raw); result={content:d?.choices?.[0]?.message?.content||'Hugging Face returned no text.',provider:'Hugging Face',model:'Qwen/Qwen2.5-7B-Instruct'};
    } else {
      const instructions={
        'code-builder':'Act as a production software engineer. Solve the request with complete, correct code when code is requested. Do not merely give a prompt.',
        'text-tools':'Directly perform the requested text transformation. Return the finished result, not instructions.',
        'calculator':'Solve the mathematical request carefully. Show the calculation and final answer.',
        'json-tools':'Directly validate, format, transform, or explain the JSON supplied by the user.',
        'document-tools':'Create or transform the requested document content directly, with a clean structure ready to copy.',
        'pdf-tools':'Help produce the requested PDF-ready content directly, with headings and structured sections.',
        'data-analyzer':'Analyze the supplied structured data directly and report useful findings, anomalies, and summaries.',
        'app-maker':'Act as an app builder. Turn the user request into a concrete web-app implementation plan and code/files when appropriate.',
        'website-builder':'Act as a website builder. Produce concrete HTML/CSS/JS or an implementation-ready result.',
        'game-builder':'Act as a browser-game developer. Produce a concrete playable implementation when possible.',
        'image-studio':'Act as an image-production assistant. Produce a precise image-generation/editing specification and assets workflow.',
        'video-studio':'Act as a video-production assistant. Produce a concrete shot list, storyboard, prompts, and production settings.',
        'voice-studio':'Act as a voice-production assistant. Produce the requested script, delivery direction, and voice settings.',
        'music-studio':'Act as a music-production assistant. Produce the requested composition/arrangement directly.',
        'presentation-studio':'Create the requested presentation content slide-by-slide.',
        'brand-studio':'Create the requested brand assets/content directly: names, positioning, copy, palette, and identity directions.',
        'automation-builder':'Design the requested automation as concrete triggers, actions, APIs, data flow, and implementation steps.',
        'agent-builder':'Design the requested AI agent with concrete tools, state, workflow, and implementation details.',
        'cyber-lab':'Provide authorized defensive cybersecurity analysis, commands, checks, and remediation for the stated lab/system.',
        'project-helper':'Act as a project engineer: turn the request into concrete architecture, tasks, code changes, and verification steps.',
        'knowledge-bridge':'Answer using HAxBRO knowledge context and clearly distinguish verified information from general reasoning.'
      };
      const system=instructions[pluginId]||'Directly execute the selected HAxBRO plugin task. Do not merely rewrite the request as a prompt.';
      const r=await complete({system,prompt:q,maxTokens:2200,username:req.body?.username||'',history:req.body?.history||''});
      result={content:r.text||String(r),provider:r.provider,model:r.model,status:r.status};
    }
    return res.json({ok:true,pluginId,result,executed:true,executedAt:new Date().toISOString()});
  }catch(e){ console.error('plugin-run',pluginId,e); return res.status(502).json({error:e.message||'Plugin execution failed.',executed:false}); }
}