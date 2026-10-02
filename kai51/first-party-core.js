import {KAI51_CAPABILITIES,KAI51_NODE_ORDER} from "./capabilities.js";
import {decode,decoderKeys} from "./decoder.js";
import {buildApp} from "./app-maker.js";
const KEY="haxbro:kai51:memory:v4",MAX=12;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]").slice(-MAX)}catch{return[]}};
const write=x=>{try{localStorage.setItem(KEY,JSON.stringify(x.slice(-MAX)))}catch{}};
const clean=s=>String(s??"").replace(/\0/g,"").trim().slice(0,16000);
const route=q=>{const l=q.toLowerCase(),r=[];const rules=[
[/\b(app|website|calculator|todo|task|note|timer|kanban|build|preview|publish|modify)\b/,"app-maker"],
[/\b(code|javascript|typescript|python|html|css|json|sql|debug|refactor)\b/,"code-writer"],
[/\b(project|scaffold|architecture)\b/,"project-maker"],
[/\b(god ?engine|orchestrat)/,"god-engine"],
[/\b(control panel|provider status|system status)/,"ai-control-panel"],
[/\b(decode|encode|cipher|rot13|base64|hex|morse)/,"decoding-partner"],
[/\b(security|secure|vulnerability|cve|threat|incident|scan)/,"security"],
[/\b(research|sources|compare|latest)/,"research"],
[/\b(study|teach|quiz|explain)/,"study"],
[/\b(remember|memory|forget)/,"memory"],
[/\b(search|look up|web)/,"web"],
[/\b(image|upload|media)/,"media"],
[/\b(workspace|xcode)/,"workspace"]];
for(const [rx,n] of rules)if(rx.test(l))r.push(n);return[...new Set(r.length?r:["reasoner"])]};
const math=q=>{const m=q.match(/(?:what is|calculate|compute|solve)?\s*([0-9][0-9+\-*/().%\s]*)$/i);if(!m)return null;try{if(!/^[0-9+\-*/().%\s]+$/.test(m[1]))return null;const v=Function('"use strict";return ('+m[1]+')')();return Number.isFinite(v)?String(v):null}catch{return null}};
const answer=(q,r,self)=>{const l=q.toLowerCase(),m=math(q);if(m!==null)return m;if(/who are you|what are you|what is kai/.test(l))return"I am KAI 51 — HAxBRO AI's first-party intelligence architecture. My identity, routing, memory, tools, verification and capability engines are owned by this runtime.";if(/^remember\s+/i.test(q)){const x=read();x.push({at:new Date().toISOString(),input:"memory",output:q.replace(/^remember\s+/i,"")});write(x);return"Stored locally. KAI 51 keeps the latest 12 memory entries for this browser."; }if(/show memory|my memory/.test(l)){const x=read();return x.length?x.map((v,i)=>i+1+". "+v.output).join("\n"):"No local memory yet."}if(/what can you do|capabilities/.test(l))return Object.values(KAI51_CAPABILITIES).map(x=>x.name+": "+x.actions.join(", ")).join("\n");if(r.includes("decoding-partner"))return"KAI 51 is ready to run its 25-key local decoder. Use the Decoding Partner workspace.";if(r.includes("app-maker"))return"KAI 51 routed this to App Maker: Intent → Architect → Build → Test → Preview → Modify/Publish.";if(r.includes("security"))return"KAI 51 routed this to the defensive Security capability.";if(r.includes("research"))return"KAI 51 routed this to the Research capability.";return"Request understood locally. KAI 51 completed its planning and routing pass without a model provider."};
export class KAI51{
 constructor(){this.name="KAI 51";this.version="51.3-independent-first-party";this.nodes=KAI51_NODE_ORDER;this.capabilities=KAI51_CAPABILITIES;this.memory=read()}
 identity(){return{name:this.name,version:this.version,owner:"HAxBRO AI",provider:null,externalModel:false,networkModel:false,type:"first-party runtime"}}
 status(){return{ready:true,provider:null,externalModel:false,networkModel:false,memoryEntries:this.memory.length,capabilityCount:Object.keys(this.capabilities).length}}
 remember(input,output){this.memory=read();this.memory.push({at:new Date().toISOString(),input:clean(input).slice(0,1200),output:clean(output).slice(0,1800)});this.memory=this.memory.slice(-MAX);write(this.memory)}
 plan(input){return{intent:clean(input),route:route(input),nodes:this.nodes,memoryCount:read().length,externalModel:false,provider:null}}
 decode(input){return decode(input)}
 build(input,opts={}){return buildApp(input,opts)}
 async run(input){const q=clean(input);if(!q)return{ok:false,error:"Enter a request.",status:this.status()};const plan=this.plan(q);let out=answer(q,plan.route,this);if(plan.route.includes("decoding-partner")&&/decode|cipher|encoded/i.test(q))out=JSON.stringify(decode(q.replace(/^.*?(decode|encoded)\s*/i,"")),null,2);this.remember(q,out);return{ok:true,answer:out,plan,verification:{ok:true,source:"KAI 51 FIRST-PARTY CORE",provider:null,externalModel:false},identity:this.identity(),status:this.status()}}
}
export const kai51=new KAI51();
export {decoderKeys};