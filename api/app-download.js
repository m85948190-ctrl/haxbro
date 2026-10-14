export const access='public';
export const methods=['POST'];

export default async function(req,res){
  const body=req.body||{};
  const format=body.format==='bundle'?'bundle':'html';
  const raw=typeof body.filename==='string'?body.filename:(format==='bundle'?'haxbro-app.bundle.json':'kai-app.html');
  const filename=raw.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,120)||'kai-app.html';

  if(format==='bundle'&&body.bundle&&typeof body.bundle==='object'){
    const payload=JSON.stringify(body.bundle,null,2);
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="'+filename+'"');
    res.setHeader('Cache-Control','no-store');
    return res.send(payload);
  }

  const html=typeof body.html==='string'?body.html:'';
  if(!html||html.length<30)return res.status(400).json({ok:false,error:'html required'});
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="'+filename+'"');
  res.setHeader('Cache-Control','no-store');
  return res.send(html);
}