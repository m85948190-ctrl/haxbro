export const access = 'public';
export const methods = ['GET','OPTIONS'];

function cors(res){
  res.setHeader('access-control-allow-origin','*');
  res.setHeader('access-control-allow-methods','GET, OPTIONS');
  res.setHeader('access-control-allow-headers','content-type');
}

export default async function(req,res){
  cors(res);
  if(req.method==='OPTIONS')return res.status(204).send('');
  // Truthful native-only status: provider adapters may exist in legacy code,
  // but they are not active inference paths while KAI_NATIVE_ONLY is enabled.
  const configured={openrouter:false,groq:false,mistral:false,cerebras:false,google:false,openai:false};
  const live={auto:false,...configured,kai51:true,kai89:false,kaiLite:true};
  res.setHeader('cache-control','no-store');
  return res.json({live,configured:{...live}});
}