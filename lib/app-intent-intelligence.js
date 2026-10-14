const clean=(v,n=8000)=>String(v??'').replace(/\u0000/g,'').replace(/\s+/g,' ').trim().slice(0,n);

const BUILD=/\b(?:make|build|create|develop|design|generate|forge|ship|launch|deploy|publish)\b/i;
const MODIFY=/\b(?:modify|change|update|edit|adjust|fix|improve|redesign|restyle|rename|add|remove|replace)\b/i;
const APP_NOUN=/\b(?:app|application|web\s*app|web\s*application|website|site|dashboard|portal|platform|saas|pwa|mobile\s+app|desktop\s+app|software|tool|game|product|system|assistant|agent|bot|calculator|tracker|timer|notes?|todo|planner|editor|generator|converter|monitor|viewer|reader|form|booking|store|shop|portfolio|chatbot|copilot|crm|marketplace|extension|plugin|widget)\b/i;
const AI_NOUN=/\b(?:ai|artificial\s+intelligence|assistant|agent|bot|copilot|chatbot|ai\s+(?:app|assistant|agent|bot|tool|website|system|product))\b/i;
const UI_NOUN=/\b(?:ui|ux|interface|header|footer|button|layout|theme|color|red|blue|green|spacing|screen|page|title|feature|component|form|menu|sidebar)\b/i;
const OPEN=/^\s*(?:please\s+)?(?:open|launch|enter|show)\s+(?:the\s+)?(?:app\s*maker|appmaker)\s*$/i;
const QUESTION=/^\s*(?:what|why|how|when|where|who|which|can you explain|tell me about|explain|define|is|are|does|do)\b/i;

export function understandAppIntent(message=''){
 const original=clean(message);
 const t=original.toLowerCase();
 if(!original)return {wantsApp:false,autoBuild:false,confidence:0,reason:'empty',destination:null,prompt:original,kind:'empty',signals:[]};
 if(OPEN.test(original))return {wantsApp:true,autoBuild:false,confidence:1,reason:'explicit-app-maker-open',destination:'app-maker',prompt:original,kind:'open',signals:['app-maker']};

 let score=0; const signals=[];
 const build=BUILD.test(original), modify=MODIFY.test(original), appNoun=APP_NOUN.test(original), aiNoun=AI_NOUN.test(original), uiNoun=UI_NOUN.test(original);
 if(build&&appNoun){score+=0.78;signals.push('build+product')}
 if(build&&aiNoun){score+=0.84;signals.push('build+ai')}
 if(modify&&(appNoun||uiNoun)){score+=0.82;signals.push('modify+product-or-ui')}
 if(/\b(?:existing|current|this|my|the)\s+(?:app|application|website|project|tool|dashboard|system)\b/i.test(original)){score+=0.18;signals.push('existing-product')}
 if(/\b(?:make|build|create|develop|design|generate)\s+(?:me\s+)?(?:an?\s+)?ai\b/i.test(original)){score+=0.25;signals.push('direct-ai-build')}
 if(/\b(?:make|build|create|develop|design|generate)\s+(?:me\s+)?(?:an?\s+)?(?:a\s+)?(?:calculator|tracker|timer|todo|notes?|planner|game|website|dashboard|tool)\b/i.test(original)){score+=0.2;signals.push('named-product')}
 if(QUESTION.test(original)&&!/^\s*(?:can|could|would)\s+you\s+(?:build|make|create|generate|design|develop)\b/i.test(original)){
   score-=0.95;signals.push('explanatory-question');
 }
 const confidence=Math.max(0,Math.min(0.99,score));
 const wantsApp=confidence>=0.72;
 const autoBuild=wantsApp&&!OPEN.test(original)&&build;
 return {
  wantsApp,autoBuild,confidence,
  reason:signals.join('+')||'general-chat',
  destination:wantsApp?'app-maker':null,
  prompt:original,
  kind:wantsApp?(modify?'modify':'build'):'chat',
  signals
 };
}

export function appIntentCi(message=''){
 const result=understandAppIntent(message);
 return {
  engine:'KAI 51 · LOCAL APP INTENT INTELLIGENCE',
  version:'1.0.0',
  local:true,
  externalModel:false,
  purpose:'detect App Maker entry/build/modify intent only',
  ...result
 };
}