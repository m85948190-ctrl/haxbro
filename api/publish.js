import { db } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

function cleanName(v){
  return String(v||'haxbro-app').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'haxbro-app';
}
function bytesFor(text){return new TextEncoder().encode(text);}
async function sha1Hex(bytes){
  const digest=await crypto.subtle.digest('SHA-1',bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

export default async function(req,res){
  const sessionId=req.cookies?.haxbro_netlify_session;
  if(!sessionId) return res.status(401).json({error:'Connect your own Netlify account first.'});
  const tokenRow=await db.query('SELECT access_token FROM netlify_oauth_sessions WHERE session_id=$1',[sessionId]);
  const token=tokenRow.rows[0]?.access_token;
  if(!token) return res.status(401).json({error:'Connect your own Netlify account first.'});
  const rawFiles=req.body?.files||[];
  if(!Array.isArray(rawFiles)||!rawFiles.length) return res.status(400).json({error:'Build an app before publishing it.'});
  const files=[];
  for(const f of rawFiles){
    const path=String(f.path||f.file||'').replace(/^\/+/, '');
    const data=typeof f.content==='string'?f.content:(f.data==null?'':String(f.data));
    if(path) files.push({path,data,bytes:bytesFor(data)});
  }
  if(!files.length) return res.status(400).json({error:'No valid generated files were provided.'});
  try{
    const manifest={files:{}};
    for(const f of files) manifest.files['/'+f.path]=await sha1Hex(f.bytes);
    const headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','User-Agent':'HAxBRO App Maker'};
    let siteName=cleanName(req.body?.name);
    let create=await fetch('https://api.netlify.com/api/v1/sites',{method:'POST',headers,body:JSON.stringify({name:siteName})});
    if(!create.ok && create.status===422){siteName=siteName+'-'+Math.random().toString(36).slice(2,7);create=await fetch('https://api.netlify.com/api/v1/sites',{method:'POST',headers,body:JSON.stringify({name:siteName})});}
    if(!create.ok){const err=await create.text();return res.status(create.status).json({error:'Could not create the Netlify site.',details:err});}
    const site=await create.json();
    const deployReq=await fetch('https://api.netlify.com/api/v1/sites/'+encodeURIComponent(site.id)+'/deploys',{method:'POST',headers,body:JSON.stringify(manifest)});
    const deploy=await deployReq.json();
    if(!deployReq.ok) return res.status(deployReq.status).json({error:'Netlify deploy could not be created.',details:deploy});
    const required=deploy.required||[];
    for(const remotePath of required){
      const local=files.find(f=>('/'+f.path)===remotePath);
      if(!local) continue;
      const upload=await fetch('https://api.netlify.com/api/v1/deploys/'+encodeURIComponent(deploy.id)+'/files/'+remotePath.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/octet-stream','User-Agent':'HAxBRO App Maker'},body:local.bytes});
      if(!upload.ok){const err=await upload.text();return res.status(upload.status).json({error:'Netlify file upload failed.',details:err});}
    }
    return res.json({success:true,url:site.ssl_url||site.url||('https://'+siteName+'.netlify.app'),deployUrl:deploy.deploy_url||null,siteId:site.id,state:deploy.state||'processing',target:'production'});
  }catch(e){return res.status(502).json({error:'Could not reach Netlify.',details:String(e&&e.message||e)});}
}