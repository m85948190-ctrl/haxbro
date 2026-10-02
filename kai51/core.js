/**
 * KAI 51 — Independent Intelligence Core
 * No provider SDKs, no API keys, no network calls.
 * Owns identity, memory, planning, routing, tools, verification and recovery.
 */
const KEY = "haxbro:kai51:memory:v1";
function loadMemory(){ try{return JSON.parse(localStorage.getItem(KEY)||"[]").slice(-12)}catch{return[]} }
function saveMemory(items){ localStorage.setItem(KEY, JSON.stringify(items.slice(-12))) }

export class KAI51 {
  constructor(){
    this.name="KAI 51"; this.version="51.0-independent";
    this.nodes=["identity","memory","context","planner","reasoner","tools","research","app-maker","code-writer","security","verifier","recovery"];
    this.memory=loadMemory();
  }
  identity(){return {name:this.name,version:this.version,type:"HAxBRO-owned orchestration and local intelligence runtime",network:false,provider:null,capabilities:this.nodes}}
  remember(input,output){this.memory.push({time:new Date().toISOString(),input:String(input).slice(0,1200),output:String(output).slice(0,1800)});this.memory=this.memory.slice(-12);saveMemory(this.memory)}
  plan(input){
    const q=String(input).trim(), lower=q.toLowerCase(), steps=[];
    if(/\b(calculate|math|\d+\s*[+*\/-]\s*\d+)\b/.test(lower))steps.push("calculator");
    if(/\b(time|date|today|tomorrow)\b/.test(lower))steps.push("clock");
    if(/\b(json)\b/.test(lower))steps.push("json");
    if(/\b(code|javascript|python|html|css)\b/.test(lower))steps.push("code-writer");
    if(/\b(app|website|game|build)\b/.test(lower))steps.push("app-maker");
    if(/\b(security|secure|vulnerability|cve|threat)\b/.test(lower))steps.push("security");
    if(/\b(remember|memory|forget)\b/.test(lower))steps.push("memory");
    if(!steps.length)steps.push("reasoner");
    return {intent:q,route:[...new Set(steps)],memoryCount:this.memory.length};
  }
  calculate(expr){
    const clean=String(expr).replace(/[^0-9+\-*/().%\s]/g,"");
    if(!clean.trim())return null;
    try{const value=Function('"use strict";return ('+clean+')')();return Number.isFinite(value)?value:null}catch{return null}
  }
  executeLocal(input){
    const q=String(input).trim(), lower=q.toLowerCase();
    if(/what are you|who are you|what is kai/.test(lower))return "I am KAI 51, the HAxBRO-owned intelligence and orchestration runtime. My identity, routing, memory, tools, verification and recovery layers are independent of any model provider.";
    if(/\b\d+\s*[+*\/-]\s*\d+/.test(lower)){const match=q.match(/[0-9().%\s+*/-]+/),value=match&&this.calculate(match[0]);if(value!==null)return String(value)}
    if(lower==="time"||lower.includes("what time is it"))return new Date().toLocaleTimeString();
    if(lower==="date"||lower.includes("what is today's date"))return new Date().toLocaleDateString();
    if(lower.startsWith("remember ")){const note=q.slice(9).trim();this.remember("user memory",note);return "Stored locally in this browser. KAI 51 keeps up to 12 local memory notes for this user."}
    if(lower.includes("show memory"))return this.memory.length?this.memory.map((m,i)=>(i+1)+". "+m.output).join("\n"):"No local memories yet.";
    return null;
  }
  verify(result){return {ok:typeof result==="string"&&result.trim().length>0,source:"KAI 51 LOCAL",network:false}}
  async run(input){
    const plan=this.plan(input);let answer=this.executeLocal(input),mode="local";
    if(answer===null){answer="KAI 51 completed the local planning pass, but this request needs a language-model runtime that is not bundled into this repository. No external provider was called.";mode="needs-local-model"}
    const verification=this.verify(answer);
    if(!verification.ok)return {ok:false,answer:"KAI 51 recovery: no verified result.",plan,verification};
    this.remember(input,answer);
    return {ok:true,answer,plan,verification,mode,identity:this.identity()};
  }
}
export const kai51=new KAI51();
