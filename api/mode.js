export const access = 'public';
export const methods = ['POST'];
export default async function(req,res){const mode=req.body?.mode==='beast'?'beast':'normal';res.json({mode,description:mode==='beast'?'Concise, blunt cybersecurity expert.':'Friendly, helpful, creative AI assistant.'});}