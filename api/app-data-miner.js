import { config } from "hatchable";
import { KAI_NATIVE_ONLY } from "lib/kai-native-test-mode";

export const access="public";
export const methods=["POST"];

const clean=(v,n=9000)=>String(v??"").replace(/\u0000/g,"").slice(0,n).trim();
function extractJson(raw){
  const s=String(raw||"").trim().replace(/^```json\s*/i,"").replace(/\s*```$/,"");
  const a=s.indexOf("{"),b=s.lastIndexOf("}");
  if(a<0||b<=a)throw new Error("No JSON intent result");
  return JSON.parse(s.slice(a,b+1));
}
function fallback(message,history){
  const t=clean(message).toLowerCase(),h=clean(history,7000).toLowerCase(),combined=t+" "+h;
  const open=/^\s*(?:please\s+)?open\s+(?:the\s+)?app\s*maker\s*$/i.test(t);
  const build=/\b(?:make|build|create|develop|design|generate|start|forge|ship|turn)\b/.test(t)&&/\b(?:app|application|website|web\s*app|dashboard|portal|platform|tool|software|assistant|agent|bot|game|product|calculator|editor|tracker|manager|crm|store|shop|marketplace)\b/.test(t);
  const firstPerson=/\b(?:i|we)\s+(?:want|need|would like|am trying)\s+to\s+(?:make|build|create|develop|design|generate)\b/.test(t)||/\b(?:i|we)\s+wanna\s+(?:make|build|create|develop|design|generate)\b/.test(t);
  const contextBuild=/\b(?:i|we)\s+(?:want|need|would like)\b[\s\S]{0,180}\b(?:app|dashboard|website|ai|assistant|agent|product)\b/.test(combined)&&/\b(?:make|build|create|develop|design|generate|start)\b/.test(combined);
  const explicitNo=/\b(?:don\x27t|do not|dont|never|not)\b[\s\S]{0,80}\b(?:implement|build|create|make|generate)\b/.test(t);
  if(open)return{route:"app-maker",action:"open",wantsApp:false,confidence:.99,reason:"explicit workspace-open command"};
  if(explicitNo)return{route:"chat",action:"discuss",wantsApp:false,confidence:.9,reason:"explicitly says not to implement"};
  if(firstPerson)return{route:"app-maker",action:"open",wantsApp:true,confidence:.94,reason:"user is describing an app they want to create"};
  if(build||contextBuild)return{route:"app-maker",action:"build",wantsApp:true,confidence:build?.9:.84,reason:"build intent detected"};
  if(/\b(?:this is|just an example|example only|don\x27t implement this as a rule)\b/.test(t))return{route:"chat",action:"discuss",wantsApp:false,confidence:.9,reason:"example/context statement"};
  return{route:"chat",action:"answer",wantsApp:false,confidence:.25,reason:"no sufficiently clear build intent"};
}
async function apiClassify(message,history){
  const key=await config.get("OPENROUTER_API_KEY_2");
  if(!key)throw new Error("API intent classifier unavailable");
  const system="You are HAxBRO APP DATA MINER, a semantic intent classifier, not the builder. Read CURRENT MESSAGE plus RECENT CONTEXT and determine what the person actually intends. Open app maker means open only. I want to make a HUVT dashboard means build intention. Follow-up details belong to the app being designed. Example or don\x27t implement statements are discussion, not build. Okay make it/build it/start can become build when prior context clearly establishes the app. Do not confuse code/explanation/research with app creation. Return ONLY JSON: {\"route\":\"app-maker\"|\"chat\",\"action\":\"open\"|\"build\"|\"discuss\"|\"answer\",\"wantsApp\":true|false,\"confidence\":0-1,\"reason\":\"short\",\"appIntent\":{\"product\":\"string\",\"goal\":\"string\",\"requirements\":[\"string\"]}}. No chain-of-thought.";
  const prompt="CURRENT MESSAGE:\n"+clean(message,5000)+"\n\nRECENT CONTEXT:\n"+clean(history,7000);
  const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+key,"HTTP-Referer":"https://haxbro.hatchable.site","X-Title":"HAxBRO App Data Miner"},body:JSON.stringify({model:"openai/gpt-oss-20b",messages:[{role:"system",content:system},{role:"user",content:prompt}],temperature:0,max_tokens:900})});
  const raw=await r.text();if(!r.ok)throw new Error("Intent API HTTP "+r.status);
  const j=JSON.parse(raw),out=j?.choices?.[0]?.message?.content||"";return extractJson(out);
}
export default async function(req,res){
  if(req.method!=="POST")return res.status(405).json({ok:false,error:"POST required"});
  const message=clean(req.body?.message,6000),history=clean(req.body?.history,8000);
  if(!message)return res.status(400).json({ok:false,error:"message required"});
  let result,source="kai-fallback";
  if(KAI_NATIVE_ONLY){ result=fallback(message,history); }
  else { try{result=await apiClassify(message,history)}catch(e){source="kai-fallback";result=fallback(message,history)} }
  result=Object.assign({route:"chat",action:"answer",wantsApp:false,confidence:0,reason:""},result);
  /* Explicit non-implementation language on the current message always overrides older build context. */
  if(/\b(?:this is|just an?|example only|do not|don\x27t|dont|never)\b[\s\S]{0,120}\b(?:implement|build|create|make|generate|rule[- ]based)\b/i.test(message) && /\b(?:implement|build|create|make|generate|rule[- ]based)\b/i.test(message)){
    result.route="chat";result.action="discuss";result.wantsApp=false;result.confidence=.96;
  }
  /* A desire to create is an App Maker conversation opener, not permission to build yet. */
  if(/^(?:\s*)(?:i|we)\s+(?:(?:want|need|would like|am trying)\s+to\s+|wanna\s+)(?:make|build|create|develop|design|generate)\b/i.test(message) && result.route==="app-maker"){
    result.action="open";result.wantsApp=true;result.confidence=Math.max(Number(result.confidence)||0,.9);
  }
  return res.json({ok:true,...result,source,engine:"HAxBRO APP DATA MINER",fallback:"KAI semantic/local fallback"});
}