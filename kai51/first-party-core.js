import { KAI51_CAPABILITIES, KAI51_NODE_ORDER } from "./capabilities.js";

const KEY="haxbro:kai51:memory:v3";
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]").slice(-12)}catch{return[]}};
const save=x=>{try{localStorage.setItem(KEY,JSON.stringify(x.slice(-12)))}catch{}};

export class KAI51 {
 constructor(){this.name="KAI 51";this.version="51.2-independent-core";this.nodes=KAI51_NODE_ORDER;this.capabilities=KAI51_CAPABILITIES;this.memory=load()}
 identity(){return{name:this.name,version:this.version,owner:"HAxBRO AI",type:"first-party intelligence architecture",provider:null,hostedBrain:false,networkBrain:false,capabilities:Object.keys(this.capabilities)}}
 status(){return{ready:true,provider:null,hostedBrain:false,networkBrain:false,memoryEntries:this.memory.length,capabilityCount:Object.keys(this.capabilities).length}}
 remember(input,output){this.memory.push({time:new Date().toISOString(),input:String(input).slice(0,1200),output:String(output).slice(0,1800)});this.memory=this.memory.slice(-12);save(this.memory)}
 plan(input){
  const q=String(input).trim(),l=q.toLowerCase(),route=[],m=[
   [/\b(app|website|game|build|modify|preview|publish|republish)\b/,"app-maker"],
   [/\b(code|javascript|typescript|python|html|css|json|sql|debug|refactor)\b/,"code-writer"],
   [/\b(project|scaffold|architecture)\b/,"project-maker"],
   [/\b(godengine|god engine|orchestrate)\b/,"god-engine"],
   [/\b(control panel|system status|provider status)\b/,"ai-control-panel"],
   [/\b(decode|encode|cipher|rot13|base64)\b/,"decoding-partner"],
   [/\b(security|secure|vulnerability|cve|threat|incident|scan)\b/,"security"],
   [/\b(research|sources|compare|latest)\b/,"research"],
   [/\b(study|teach|quiz|explain)\b/,"study"],
   [/\b(remember|memory|forget)\b/,"memory"],
   [/\b(search|look up|web)\b/,"web"],
   [/\b(image|upload|media)\b/,"media"],
   [/\b(workspace|xcode)\b/,"workspace"]];
  for(const [rx,n] of m)if(rx.test(l))route.push(n);if(!route.length)route.push("reasoner");
  return{intent:q,route:[...new Set(route)],memoryCount:this.memory.length}
 }
 calc(e){const c=String(e).replace(/[^0-9+\-*/().%\s]/g,"");if(!c.trim())return null;try{const v=Function('"use strict";return ('+c+')')();return Number.isFinite(v)?v:null}catch{return null}}
 local(input,plan){
  const q=String(input).trim(),l=q.toLowerCase();
  if(/what are you|who are you|what is kai/.test(l))return"I am KAI 51 — HAxBRO AI's first-party intelligence architecture. My identity, capabilities, routing, local memory, tools, verification and recovery belong to this system.";
  if(/\b\d+\s*[+*\/-]\s*\d+/.test(l)){const m=q.match(/[0-9().%\s+*/-]+/),v=m&&this.calc(m[0]);if(v!==null)return String(v)}
  if(l==="time"||l.includes("what time is it"))return new Date().toLocaleTimeString();
  if(l==="date"||l.includes("today's date"))return new Date().toLocaleDateString();
  if(l.startsWith("remember ")){this.remember("user memory",q.slice(9).trim());return"Stored locally. KAI 51 keeps up to 12 memory entries for this user."}
  if(l.includes("show memory"))return this.memory.length?this.memory.map((x,i)=>(i+1)+". "+x.output).join("\n"):"No local memories yet.";
  if(l.includes("capabilities")||l.includes("what can you do"))return Object.values(this.capabilities).map(x=>x.name+": "+x.actions.join(", ")).join("\n");
  if(plan.route.includes("app-maker"))return"KAI 51 routed this request to App Maker: Intent → Architect → Build → Test → Preview → Modify/Publish.";
  if(plan.route.includes("code-writer"))return"KAI 51 routed this request to Code Writer.";
  if(plan.route.includes("decoding-partner"))return"KAI 51 routed this request to Decoding Partner.";
  if(plan.route.includes("security"))return"KAI 51 routed this request to Security.";
  if(plan.route.includes("research"))return"KAI 51 routed this request to Research.";
  if(plan.route.includes("study"))return"KAI 51 routed this request to Study Mode.";
  if(plan.route.includes("project-maker"))return"KAI 51 routed this request to Project Maker Helper.";
  if(plan.route.includes("god-engine"))return"KAI 51 routed this request to GodEngine.";
  return"KAI 51 completed its first-party planning pass locally. Additional first-party reasoning and capability modules can be added without changing KAI's identity or memory.";
 }
 async run(input){const q=String(input||"").trim();if(!q)return{ok:false,answer:"Enter a request.",status:this.status()};const plan=this.plan(q),answer=this.local(q,plan),verification={ok:Boolean(answer),source:"KAI 51 FIRST-PARTY CORE",provider:null,hostedBrain:false,networkBrain:false,route:plan.route};if(verification.ok)this.remember(q,answer);return{ok:verification.ok,answer,plan,verification,identity:this.identity(),status:this.status()}}
}
export const kai51=new KAI51();