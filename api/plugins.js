export const access = "public";

const plugins = [
  {id:"web-research",name:"Web Research",category:"Research",icon:"🌐",type:"external",provider:"Wikipedia public search",free:true,description:"Real public web search using a free public endpoint."},
  {id:"web-page-reader",name:"Web Page Reader",category:"Research",icon:"📖",type:"external",provider:"Direct HTTP",free:true,description:"Fetch and extract text from public web pages."},
  {id:"wikipedia",name:"Wikipedia",category:"Research",icon:"W",type:"external",provider:"Wikipedia REST API",free:true,description:"Read live Wikipedia article summaries."},
  {id:"arxiv",name:"arXiv Research",category:"Research",icon:"∑",type:"external",provider:"arXiv API",free:true,description:"Search public research papers on arXiv."},
  {id:"github",name:"GitHub",category:"Developer",icon:"◉",type:"external",provider:"GitHub REST API",free:true,description:"Search public GitHub repositories without requiring a user token."},
  {id:"weather",name:"Open-Meteo Weather",category:"Utilities",icon:"☁",type:"external",provider:"Open-Meteo",free:true,description:"Get current weather and forecasts from a free public API."},
  {id:"huggingface",name:"Hugging Face",category:"AI",icon:"🤗",type:"external",provider:"Hugging Face Inference",free:true,description:"Run supported Hugging Face models using the configured HAxBRO token/free allowance."},
  {id:"document-tools",name:"Document Studio",category:"Files",icon:"📄",type:"ai",free:false,description:"AI-assisted document workflows."},
  {id:"pdf-tools",name:"PDF Studio",category:"Files",icon:"📕",type:"ai",free:false,description:"AI-assisted PDF workflows."},
  {id:"data-analyzer",name:"Data Analyzer",category:"Data",icon:"📊",type:"ai",free:false,description:"Analyze CSV, JSON, tables, and structured data."},
  {id:"code-builder",name:"Code Builder",category:"Developer",icon:"💻",type:"ai",free:false,description:"Generate, debug, refactor, and explain software."},
  {id:"app-maker",name:"App Maker",category:"Create",icon:"▣",type:"ai",free:false,description:"Turn natural-language ideas into previewable web apps."},
  {id:"website-builder",name:"Website Builder",category:"Create",icon:"🖥️",type:"ai",free:false,description:"Create websites and landing pages."},
  {id:"game-builder",name:"Game Builder",category:"Create",icon:"🎮",type:"ai",free:false,description:"Prototype browser games."},
  {id:"image-studio",name:"Image Studio",category:"Media",icon:"🎨",type:"ai",free:false,description:"AI-assisted image workflows."},
  {id:"video-studio",name:"Video Studio",category:"Media",icon:"🎬",type:"ai",free:false,description:"AI-assisted video workflows."},
  {id:"voice-studio",name:"Voice Studio",category:"Media",icon:"🎙️",type:"ai",free:false,description:"AI-assisted voice workflows."},
  {id:"music-studio",name:"Music Studio",category:"Media",icon:"🎵",type:"ai",free:false,description:"AI-assisted music workflows."},
  {id:"presentation-studio",name:"Presentation Studio",category:"Create",icon:"📽️",type:"ai",free:false,description:"Create presentation content."},
  {id:"brand-studio",name:"Brand Studio",category:"Create",icon:"✦",type:"ai",free:false,description:"Build names, identity systems, copy, and brand assets."},
  {id:"automation-builder",name:"Automation Builder",category:"Automate",icon:"⚙️",type:"ai",free:false,description:"Design API-driven automations."},
  {id:"agent-builder",name:"Agent Builder",category:"Agents",icon:"🤖",type:"ai",free:false,description:"Design AI agents and tool workflows."},
  {id:"cyber-lab",name:"Cyber Lab",category:"Security",icon:"🔐",type:"ai",free:false,description:"Defensive security and authorized labs."},
  {id:"json-tools",name:"JSON Tools",category:"Developer",icon:"{}",type:"ai",free:false,description:"Format, validate, transform, and inspect JSON."},
  {id:"text-tools",name:"Text Tools",category:"Productivity",icon:"✎",type:"ai",free:false,description:"Rewrite, summarize, compare, extract, and transform text."},
  {id:"calculator",name:"Calculator",category:"Utilities",icon:"∑",type:"ai",free:false,description:"Math and structured calculations."},
  {id:"project-helper",name:"Project Maker Helper",category:"Developer",icon:"◈",type:"ai",free:false,description:"Plan architecture, debugging, and shipping."},
  {id:"knowledge-bridge",name:"Knowledge Bridge",category:"Knowledge",icon:"🧠",type:"ai",free:false,description:"Connect HAxBRO reasoning to its internal knowledge warehouse."}
];

export default async function(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  res.json({ok:true,plugins:plugins.map(p=>({...p,execution:p.type==='external'?'live-api':'live-ai-tool'})),generatedAt:new Date().toISOString()});
}