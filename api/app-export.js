import crypto from 'node:crypto';

export const access='public';
export const methods=['POST'];

const clean=(v,n)=>String(v??'').slice(0,n);

function normalizeFiles(files){
  return files.filter(f=>f&&typeof f.path==='string'&&typeof f.content==='string').map(f=>({
    path:f.path.replace(/^\/+/,''),content:f.content
  })).filter(f=>f.path&&f.content.length<=12000000).slice(0,100);
}

function checksum(files){
  return crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');
}

export default async function(req,res){
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST required'});
  const files=normalizeFiles(Array.isArray(req.body?.files)?req.body.files:[]);
  if(!files.length)return res.status(400).json({ok:false,error:'Build an app before exporting.'});
  const name=clean(req.body?.name||'HAxBRO App',120).replace(/[<>]/g,'').trim()||'HAxBRO App';
  const manifest={
    schema:'haxbro.app-export.v1',
    name,
    generatedAt:new Date().toISOString(),
    files:files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.content,'utf8')})),
    checksum:checksum(files)
  };
  const html=files.find(f=>/^index\.html$/i.test(f.path));
  if(!html)return res.status(400).json({ok:false,error:'index.html is required for export.'});
  const inline=html.content
    .replace(/<link[^>]+href=["'][^"']+\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<script[^>]+src=["'][^"']+\.js["'][^>]*><\/script>/gi,'');
  const css=files.filter(f=>/\.css$/i.test(f.path)).map(f=>f.content).join('\n');
  const js=files.filter(f=>/\.js$/i.test(f.path)).map(f=>f.content).join('\n');
  const selfContained=inline
    .replace(/<\/head>/i,css?'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style></head>':'</head>')
    .replace(/<\/body>/i,js?'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>':'</body>');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.json({ok:true,manifest,files,artifacts:{
    html:{filename:(name.replace(/[^a-z0-9_-]+/gi,'-').toLowerCase().slice(0,80)||'haxbro-app')+'.html',content:selfContained},
    bundle:{format:'json',filename:'haxbro-app.bundle.json',content:JSON.stringify({manifest,files},null,2)}
  }});
}