export const config = { runtime: "nodejs", maxDuration: 25 };

const clean=(v,n=500)=>String(v??"").replace(/[\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,n);
const decodeEntities=s=>String(s||"")
  .replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&nbsp;/gi," ")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Number(n)||0)))
  .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,parseInt(n,16)||0)));
const strip=s=>decodeEntities(String(s||"")
  .replace(/<!--[\s\S]*?-->/g," ")
  .replace(/<(script|style|svg|noscript|template|nav|footer|header|form|aside)[^>]*>[\s\S]*?<\/\1>/gi," ")
  .replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();

const STOP=new Set(["what","when","where","which","who","whom","why","how","was","were","are","is","the","and","for","with","from","into","about","tell","give","short","answer","please","explain","sources","source","find","search","latest","today","current","does","did","can","could","would","should","this","that","these","those"]);
const terms=q=>clean(q).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2&&!STOP.has(x));
function rank(items,q){
 const ts=terms(q);
 return (items||[]).map(x=>{
  const title=String(x.title||"").toLowerCase(),hay=(title+" "+String(x.url||"")+" "+String(x.snippet||x.text||"")).toLowerCase();
  const hits=ts.filter(t=>hay.includes(t)).length,titleHits=ts.filter(t=>title.includes(t)).length;
  return {...x,_score:hits+titleHits*2,_hits:hits};
 }).filter(x=>ts.length?x._hits>=Math.min(2,ts.length):true)
 .sort((a,b)=>b._score-a._score).slice(0,8).map(({_score,_hits,...x})=>x);
}
function safePublicUrl(value){
 try{
  const u=new URL(value);
  if(u.protocol!=="https:"||u.username||u.password||u.port)return null;
  const h=u.hostname.toLowerCase();
  if(h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h.endsWith(".internal")||
     /^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)||
     /^172\.(1[6-9]|2\d|3[01])\./.test(h)||h==="::1"||h.startsWith("fc")||h.startsWith("fd"))return null;
  return u;
 }catch{return null;}
}
async function get(url,ms=4800,accept="text/html,application/json"){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{
  const r=await fetch(url,{signal:c.signal,redirect:"manual",headers:{
   "user-agent":"HAxBRO-KAI/1.0 (+https://haxbro.hatchable.site)",
   "accept":accept
  }});
  if(r.status>=300&&r.status<400){
   const location=r.headers.get("location");if(!location)throw new Error("Redirect without location");
   const next=safePublicUrl(new URL(location,url).toString());if(!next)throw new Error("Unsafe redirect blocked");
   const rr=await fetch(next,{signal:c.signal,redirect:"manual",headers:{"user-agent":"HAxBRO-KAI/1.0","accept":accept}});
   if(!rr.ok)throw new Error("HTTP "+rr.status);
   return {text:await rr.text(),status:rr.status,url:next.toString(),contentType:rr.headers.get("content-type")||""};
  }
  if(!r.ok)throw new Error("HTTP "+r.status);
  return {text:await r.text(),status:r.status,url:r.url||url,contentType:r.headers.get("content-type")||""};
 }finally{clearTimeout(t);}
}
async function google(q){
 const {text:html}=await get("https://www.google.com/search?gbv=1&hl=en&q="+encodeURIComponent(q));
 const out=[],re=/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;let m;
 while((m=re.exec(html))&&out.length<10){
  let url=m[1],title=clean(strip(m[2]),200);
  if(url.startsWith("/url?q=")){try{url=decodeURIComponent(url.slice(7).split("&")[0]);}catch{}}
  const safe=safePublicUrl(url);if(!safe||!title||/google\./i.test(safe.hostname))continue;
  const context=html.slice(Math.max(0,m.index-600),Math.min(html.length,re.lastIndex+800));
  out.push({title,url:safe.toString(),snippet:clean(strip(context),700),text:clean(strip(context),700),engine:"Google"});
 }
 return out;
}
async function bing(q){
 const {text:html}=await get("https://www.bing.com/search?q="+encodeURIComponent(q));
 const out=[],re=/<li class="b_algo"[\s\S]*?<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?[\s\S]*?<\/li>/gi;let m;
 while((m=re.exec(html))&&out.length<10){
  const safe=safePublicUrl(m[1]),title=clean(strip(m[2]),200),snippet=clean(strip(m[3]||""),700);
  if(safe&&title&&!/bing\.com/i.test(safe.hostname))out.push({title,url:safe.toString(),snippet,text:snippet,engine:"Bing"});
 }
 return out;
}
async function wiki(q){
 const api="https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch="+encodeURIComponent(q)+"&format=json&origin=*&srlimit=5";
 const {text:raw}=await get(api,4500,"application/json");const data=JSON.parse(raw),out=[];
 for(const item of (data?.query?.search||[]).slice(0,4)){
  const title=clean(item.title,180),url="https://en.wikipedia.org/wiki/"+encodeURIComponent(title.replace(/ /g,"_"));
  let snippet=clean(strip(item.snippet||""),600);
  try{const {text:summary}=await get("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title.replace(/ /g,"_")),3500,"application/json");const parsed=JSON.parse(summary);if(parsed.extract)snippet=clean(parsed.extract,1500);}catch{}
  out.push({title,url,snippet,text:snippet,engine:"Wikipedia"});
 }
 return out;
}
function pageText(html){
 const title=clean(strip((String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||""),220);
 const candidates=[...String(html).matchAll(/<(main|article)[^>]*>([\s\S]*?)<\/\1>/gi)].map(x=>x[2]);
 const body=(candidates.join(" ")||((String(html).match(/<body[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||html));
 const text=clean(strip(body),4200);
 return {title,text};
}
async function scrape(source){
 const safe=safePublicUrl(source.url);if(!safe)return {...source,readStatus:"blocked",readError:"Only public HTTPS pages can be read."};
 try{
  const page=await get(safe.toString(),5200,"text/html,application/xhtml+xml;q=0.9,*/*;q=0.5");
  if(!/html|xhtml/i.test(page.contentType))return {...source,readStatus:"unsupported",readError:"The page did not return HTML.",snippet:source.snippet||source.text||""};
  const extracted=pageText(page.text);
  if(extracted.text.length<180)return {...source,readStatus:"thin",readError:"The page exposed too little readable text.",snippet:source.snippet||source.text||""};
  return {...source,title:extracted.title||source.title,url:page.url,text:extracted.text,readStatus:"read",contentLength:extracted.text.length};
 }catch(e){return {...source,readStatus:"failed",readError:clean(e?.message||e,180),snippet:source.snippet||source.text||""};}
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","public, s-maxage=120, stale-while-revalidate=300");
 if(req.method!=="GET"&&req.method!=="POST"){res.setHeader("Allow","GET, POST");return res.status(405).json({ok:false,error:"Method not allowed"});}
 let q="";try{q=clean(req.method==="POST"?(req.body?.query||req.body?.message):(req.query?.q||req.query?.query),500);}catch{}
 if(!q)return res.status(400).json({ok:false,error:"Provide a query."});
 const settled=await Promise.allSettled([google(q),bing(q),wiki(q)]);
 const engines=[],all=[];
 for(let i=0;i<settled.length;i++){const r=settled[i];if(r.status==="fulfilled"){engines.push(["Google","Bing","Wikipedia"][i]);all.push(...r.value);}}
 const found=rank(all,q).filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i).slice(0,5);
 const scraped=await Promise.all(found.map(scrape));
 const sources=scraped.map((s,i)=>({...s,sourceNumber:i+1}));
 const readCount=sources.filter(s=>s.readStatus==="read").length;
 const relevant=sources.some(s=>(s.readStatus==="read"?s.text:s.snippet||s.text||"").length>120);
 return res.status(200).json({
  ok:true,query:q,engine:engines.join(" + ")||"none",searched:engines,sources,relevant,answerable:relevant,
  research:{searchedCount:found.length,readCount,failedCount:sources.length-readCount,mode:"search-open-extract"},
  warning:relevant?null:"No readable relevant source was found. KAI should not invent an answer from unrelated search results."
 });
}
