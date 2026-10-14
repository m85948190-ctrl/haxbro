import { complete } from 'lib/core';

export const access = 'public';
export const methods = ['POST'];

const SYSTEM = `You are HAxBRO CODE WRITER BEAST, an elite software engineering agent.
Your job is to produce the strongest practical implementation for the user's request, not vague advice.
Rules:
- Prefer complete, runnable, production-quality code.
- Preserve the requested language/framework; if unspecified, choose a sensible modern default and state it briefly.
- Think through architecture, edge cases, validation, security, performance, accessibility, maintainability, and failure handling before writing code.
- Never invent libraries, APIs, functions, environment variables, or test results.
- Never claim code was executed, compiled, tested, deployed, or verified unless the system actually did it.
- When fixing code, identify the root cause and return the corrected implementation, not just a patch description.
- When building a multi-file project, return clearly separated files with exact paths.
- Keep secrets out of source code and use environment variables where appropriate.
- For destructive or security-sensitive operations, require explicit authorization and provide safe defaults.
- Make output directly copyable by a developer.
Return concise engineering notes followed by the implementation.`;

export default async function(req,res){
  const b=req.body||{};
  const prompt=typeof b.prompt==='string'?b.prompt.trim():'';
  const language=typeof b.language==='string'?b.language.trim().slice(0,40):'javascript';
  const framework=typeof b.framework==='string'?b.framework.trim().slice(0,80):'';
  const context=typeof b.context==='string'?b.context.slice(-14000):'';
  if(!prompt)return res.status(400).json({error:'Describe what you want the Code Writer to build or fix.'});
  if(prompt.length>16000)return res.status(400).json({error:'Request is too long (max 16000 characters).'});
  const task=`LANGUAGE: ${language}\nFRAMEWORK: ${framework||'not specified'}\nREQUEST:\n${prompt}${context?'\n\nEXISTING CODE / CONTEXT:\n'+context:''}`;
  try{
    const r=await complete({system:SYSTEM,prompt:task,maxTokens:7000});
    return res.json({ok:true,response:r.text,provider:r.provider,model:r.model,status:r.status,elapsedMs:r.elapsedMs,attempts:r.attempts||[]});
  }catch(err){
    console.error('Code Writer error',err);
    return res.status(503).json({ok:false,error:'Code Writer could not complete the request right now. Try again.'});
  }
}