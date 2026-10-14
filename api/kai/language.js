import {detectLanguage,languageCatalog,speechLocale} from 'lib/kai51-language';
export const access='public';
export const methods=['POST','GET','OPTIONS'];
export default async function(req,res){
 if(req.method==='OPTIONS')return res.status(204).send('');
 if(req.method==='GET')return res.json({ok:true,engine:'KAI 51 LANGUAGE CORE',languages:languageCatalog(),count:languageCatalog().length});
 const text=String(req.body?.text??'').trim();
 if(!text)return res.status(400).json({ok:false,error:'text required'});
 const detected=detectLanguage(text);
 return res.json({ok:true,detected,speechLocale:speechLocale(detected.code),engine:'KAI 51 LANGUAGE CORE',local:true,externalModel:false});
}