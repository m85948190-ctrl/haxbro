export const access='public';
export const methods=['GET','HEAD','OPTIONS'];

const OWNER='m85948190-ctrl';
const REPO='haxbro';
const TAG='kai51-model-latest';
const ASSETS=Object.freeze({
  'config.json':609319996,
  'generation_config.json':609319997,
  'MODEL-MANIFEST.json':609319995,
  'model_q4.onnx':609320000,
  'model_q4f16.onnx':609319994,
  'special_tokens_map.json':609320010,
  'tokenizer.json':609320008,
  'tokenizer_config.json':609320011
});

function requestedName(req){
  const raw=String(req.query?.file||Object.entries(req.query||{}).find(([k,v])=>String(k).includes('file')||String(v).includes('.json')||String(v).includes('.onnx'))?.[1]||'').trim();
  try{return decodeURIComponent(raw).split('/').pop()}catch{return raw.split('/').pop()}
}

export default async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Range,Accept,Content-Type');
  res.setHeader('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges,ETag');
  res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS')return res.status(204).send('');
  const name=requestedName(req);
  if(!name)return res.status(400).send('Missing model asset name.');

  const assetId=ASSETS[name];
  if(!assetId)return res.status(404).send('KAI 51 model asset not found: '+name);

  const headers={
    Accept:'application/octet-stream',
    'User-Agent':'HAxBRO-KAI51-Proxy'
  };
  const range=req.headers?.range||req.headers?.Range;
  if(range)headers.Range=range;

  const assetUrl='https://github.com/'+OWNER+'/'+REPO+'/releases/download/'+TAG+'/'+encodeURIComponent(name);
  /* GitHub's asset API can return a gateway failure when a browser asks the proxy
     for the entire 386 MB ONNX object in one upstream fetch. Range requests work,
     so for an un-ranged model request we assemble the same bytes in server-side
     chunks and stream them to the browser. */
  const isLargeModel=name==='model_q4.onnx'||name==='model_q4f16.onnx';
  const knownSize=name==='model_q4.onnx'?386495938:name==='model_q4f16.onnx'?272000000:null;
  if(isLargeModel && !range){
    /* Never make the Hatchable function buffer/assemble hundreds of MB.
       The browser engine now requests the release in resumable Range chunks. */
    res.setHeader('Accept-Ranges','bytes');
    res.setHeader('Content-Length',String(knownSize));
    res.setHeader('Cache-Control','public,max-age=31536000,immutable');
    return res.status(416).send('KAI 51 large model requires a Range request; the browser loader will resume it in chunks.');
  }

  const upstream=await fetch(assetUrl,{headers,redirect:'follow'});
  if(!upstream.ok)return res.status(upstream.status).send('KAI 51 model asset fetch failed: '+name);

  res.setHeader('Content-Type',upstream.headers.get('content-type')||'application/octet-stream');
  res.setHeader('Cache-Control','public,max-age=31536000,immutable');
  res.setHeader('Accept-Ranges',upstream.headers.get('accept-ranges')||'bytes');
  for(const h of ['content-length','content-range','etag']){
    const v=upstream.headers.get(h);
    if(v)res.setHeader(h==='content-length'?'Content-Length':h==='content-range'?'Content-Range':'ETag',v);
  }
  if(req.method==='HEAD')return res.status(upstream.status).send('');
  // Stream large ONNX assets instead of buffering hundreds of MB in one isolate.
  // The browser needs the GitHub release bytes intact and supports ranged requests.
  if(upstream.body && typeof res.write==='function' && typeof res.end==='function'){
    res.status(upstream.status);
    const reader=upstream.body.getReader();
    try{
      while(true){
        const part=await reader.read();
        if(part.done)break;
        if(part.value?.length)res.write(Buffer.from(part.value));
      }
    }finally{
      try{reader.releaseLock()}catch{}
    }
    return res.end();
  }
  return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
}