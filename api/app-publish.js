// External static publisher — generated apps never use Hatchable as their public host.
export const access='public';
export const methods=['POST'];

const clean=s=>String(s||'').replace(/[<>]/g,'').slice(0,120);
function inline(files){
  const html=files.find(f=>/^index\.html$/i.test(f.path))||files.find(f=>/\.html?$/i.test(f.path));
  if(!html)return null;
  let x=String(html.content||'');
  const css=files.filter(f=>/\.css$/i.test(f.path)).map(f=>String(f.content||'')).join('\n');
  const js=files.filter(f=>/\.js$/i.test(f.path)).map(f=>String(f.content||'')).join('\n');
  x=x.replace(/<link[^>]+href=["'][^"']+\.css[^"']*["'][^>]*>/gi,'');
  x=x.replace(/<script[^>]+src=["'][^"']+\.js[^"']*["'][^>]*><\/script>/gi,'');
  if(css)x=x.replace(/<\/head>/i,'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style></head>');
  if(js)x=x.replace(/<\/body>/i,'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>');
  return x;
}
export default async function(req,res){
  const name=clean(req.body?.name)||'HAxBRO App';
  const files=Array.isArray(req.body?.files)?req.body.files.filter(f=>f&&typeof f.path==='string'&&typeof f.content==='string').slice(0,100):[];
  if(!files.length)return res.status(400).json({ok:false,error:'Build an app first.'});
  if(!files.some(f=>f.path.toLowerCase()==='index.html'))return res.status(400).json({ok:false,error:'Generated app must contain index.html.'});
  const html=inline(files);
  if(!html)return res.status(400).json({ok:false,error:'Could not package the generated app for external hosting.'});
  if(html.length>9000000)return res.status(413).json({ok:false,error:'Generated app is too large for the free static publisher.'});
  try{
    const r=await fetch('https://ship.page/deploy',{method:'POST',headers:{'Content-Type':'text/html; charset=utf-8','X-Ship-Name':name},body:html});
    const text=await r.text();
    if(!r.ok)throw new Error(text||('External host HTTP '+r.status));
    let url='';try{const d=JSON.parse(text);url=d.url||d.liveUrl||d.siteUrl||d.location||''}catch{}
    if(!url){const m=text.match(/https?:\/\/[^\s"'<>]+/);url=m?.[0]||''}
    if(!url)throw new Error('External host returned no public URL.');
    return res.json({ok:true,agent:'HAxBRO App Engine',hosting:'ship.page',provider:'ship.page free static hosting',free:true,public:true,accountRequired:false,expires:'anonymous free deployments are temporary (up to 30 days)',url,appUrl:url,publicUrl:url});
  }catch(error){
    return res.status(502).json({ok:false,error:'External free hosting failed: '+String(error?.message||error)});
  }
}