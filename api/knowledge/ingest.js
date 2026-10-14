export const access = "admin";
export const methods = ["POST"];

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xorgweiijpupsxugteuh.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function clean(value, max=5000){
  return typeof value === "string" ? value.trim().slice(0,max) : "";
}
function normalizeUrl(value){
  try {
    const u = new URL(String(value));
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch { return ""; }
}
function htmlToText(html){
  return String(html||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi," ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/p>/gi,"\n\n")
    .replace(/<\/h[1-6]>/gi,"\n\n")
    .replace(/<li\b[^>]*>/gi,"\n• ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&#x27;/gi,"'")
    .replace(/\r/g,"")
    .replace(/[ \t]+/g," ")
    .replace(/\n[ \t]+/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

export default async function(req,res){
  const url=normalizeUrl(req.body?.url);
  if(!url) return res.status(400).json({error:"Valid http(s) URL required"});
  if(!SUPABASE_KEY) return res.status(503).json({error:"Supabase service key not configured"});
  const headers={"content-type":"application/json",apikey:SUPABASE_KEY,authorization:`Bearer ${SUPABASE_KEY}`};
  try {
    const sourceLookup=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_sources?select=id,url,title,domain,status&url=eq.${encodeURIComponent(url)}&limit=1`,{headers});
    const existingSources=await sourceLookup.json();
    if(!sourceLookup.ok) return res.status(sourceLookup.status).json({error:"Supabase source lookup failed",detail:existingSources});

    let source=Array.isArray(existingSources)&&existingSources.length?existingSources[0]:null;
    let html="";
    let text="";
    if(!source || source.status !== "indexed"){
      const pageResp=await fetch(url,{redirect:"follow"});
      if(!pageResp.ok) return res.status(422).json({error:"Source fetch failed",status:pageResp.status,target:url});
      html=await pageResp.text();
      text=htmlToText(html);
      if(!text) return res.status(422).json({error:"No readable text content found",target:url});
    }

    if(!source){
      const u=new URL(url);
      const sourceWrite=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_sources`,{method:"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({url,title:clean(req.body?.title,300)||url,domain:u.hostname,status:"queued",metadata:{category:clean(req.body?.category,120)||"general",ingestion_source:"haxbro"}})});
      const data=await sourceWrite.json();
      if(!sourceWrite.ok) return res.status(sourceWrite.status).json({error:"Supabase source write failed",detail:data});
      source=Array.isArray(data)?data[0]:data;
    }

    const pageLookup=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_pages?select=id,url&url=eq.${encodeURIComponent(url)}&limit=1`,{headers});
    const pageRows=await pageLookup.json();
    if(!pageLookup.ok) return res.status(pageLookup.status).json({error:"Supabase page lookup failed",detail:pageRows});
    let page=Array.isArray(pageRows)&&pageRows.length?pageRows[0]:null;

    if(!text && page?.id){
      const existingPage=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_pages?id=eq.${page.id}&select=content,title,source_id,fetched_at&limit=1`,{headers});
      const pd=await existingPage.json();
      if(existingPage.ok&&pd?.[0]?.content) text=clean(pd[0].content,200000);
    }
    if(!text) return res.status(422).json({error:"No readable text available for ingestion",target:url});

    if(!page){
      const pageWrite=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_pages`,{method:"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({source_id:source.id,url,title:clean(req.body?.title,300)||source.title||url,content:text,metadata:{content_format:"plain_text"}})});
      const data=await pageWrite.json();
      if(!pageWrite.ok) return res.status(pageWrite.status).json({error:"Supabase page write failed",detail:data});
      page=Array.isArray(data)?data[0]:data;
    } else {
      const pagePatch=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_pages?id=eq.${page.id}`,{method:"PATCH",headers,body:JSON.stringify({content:text,fetched_at:new Date().toISOString(),metadata:{content_format:"plain_text"}})});
      if(!pagePatch.ok){const d=await pagePatch.json().catch(()=>null);return res.status(pagePatch.status).json({error:"Supabase page update failed",detail:d});}
    }

    const oldChunksResp=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_chunks?select=id&page_id=eq.${page.id}`,{headers});
    const oldChunks=await oldChunksResp.json();
    if(!oldChunksResp.ok) return res.status(oldChunksResp.status).json({error:"Supabase chunk lookup failed",detail:oldChunks});
    if(Array.isArray(oldChunks)&&oldChunks.length){
      const del=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_chunks?page_id=eq.${page.id}`,{method:"DELETE",headers});
      if(!del.ok){const d=await del.json().catch(()=>null);return res.status(del.status).json({error:"Supabase old chunk cleanup failed",detail:d});}
    }

    const chunkSize=4500;
    let chunks=0;
    for(let i=0;i<text.length;i+=chunkSize){
      const content=text.slice(i,i+chunkSize).trim();
      if(!content) continue;
      const r=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_chunks`,{method:"POST",headers,body:JSON.stringify({page_id:page.id,chunk_index:chunks,content,metadata:{content_format:"plain_text",source_url:url}})});
      if(!r.ok){const d=await r.json().catch(()=>null);return res.status(502).json({error:"Supabase chunk write failed",chunk:chunks,detail:d});}
      chunks++;
    }

    const sourcePatch=await fetch(`${SUPABASE_URL}/rest/v1/haxbro_sources?id=eq.${source.id}`,{method:"PATCH",headers,body:JSON.stringify({status:"indexed",fetched_at:new Date().toISOString()})});
    if(!sourcePatch.ok){const d=await sourcePatch.json().catch(()=>null);return res.status(502).json({error:"Supabase source status update failed",detail:d});}

    return res.json({ok:true,warehouse:"supabase",format:"plain_text",source_id:source.id,page_id:page.id,chunks});
  } catch(e){
    console.error(e);
    return res.status(502).json({error:"Supabase ingestion failed"});
  }
}