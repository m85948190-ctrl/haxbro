export const access='public';
export const methods=['GET','HEAD','OPTIONS'];

const REPO='onnx-community/SmolLM2-135M-Instruct-ONNX-MHA';
const ASSETS=new Set([
  'config.json','generation_config.json','MODEL-MANIFEST.json',
  'model_q4.onnx','model_q4f16.onnx','special_tokens_map.json',
  'tokenizer.json','tokenizer_config.json'
]);

function requestedName(req){
  const raw=String(req.query?.file||'').trim();
  try{return decodeURIComponent(raw).split('/').pop()}catch{return raw.split('/').pop()}
}

export default async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Range, Accept, Content-Type');
  res.setHeader('Access-Control-Expose-Headers','Content-Length, Content-Range, Accept-Ranges, ETag');
  res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS')return res.status(204).send('');
  const name=requestedName(req);
  if(!name)return res.status(400).send('Missing KAI LOCAL model asset name.');
  if(!ASSETS.has(name))return res.status(404).send('KAI LOCAL model asset not found: '+name);

  const path=(name==='model_q4.onnx'||name==='model_q4f16.onnx')?'onnx/'+name:name;
  const url='https://huggingface.co/'+REPO+'/resolve/main/'+path;
  const headers={Accept:'application/octet-stream','User-Agent':'HAxBRO-KAI51-LOCAL'};
  const range=req.headers?.range||req.headers?.Range;
  if(range)headers.Range=range;
  const upstream=await fetch(url,{headers,redirect:'follow'});
  if(!upstream.ok)return res.status(upstream.status).send('KAI LOCAL model asset fetch failed: '+name+' (HTTP '+upstream.status+')');
  res.setHeader('Content-Type',upstream.headers.get('content-type')||'application/octet-stream');
  res.setHeader('Cache-Control','public,max-age=31536000,immutable');
  res.setHeader('Accept-Ranges',upstream.headers.get('accept-ranges')||'bytes');
  for(const h of ['content-length','content-range','etag']){
    const v=upstream.headers.get(h);
    if(v)res.setHeader(h==='content-length'?'Content-Length':h==='content-range'?'Content-Range':'ETag',v);
  }
  if(req.method==='HEAD')return res.status(upstream.status).send('');
  if(upstream.body&&typeof res.write==='function'&&typeof res.end==='function'){
    res.status(upstream.status);
    const reader=upstream.body.getReader();
    try{
      while(true){
        const part=await reader.read();
        if(part.done)break;
        if(part.value?.length)res.write(Buffer.from(part.value));
      }
    }finally{try{reader.releaseLock()}catch{}}
    return res.end();
  }
  return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
}