export const KAI51_CAPABILITIES = Object.freeze({
  "app-maker": { name: "App Maker", actions: ["intent","architect","build","test","preview","modify","publish"] },
  "code-writer": { name: "Code Writer", actions: ["write","debug","review","refactor"] },
  "project-maker": { name: "Project Maker Helper", actions: ["scaffold","plan","validate"] },
  "god-engine": { name: "GodEngine", actions: ["orchestrate","validate","recover"] },
  "ai-control-panel": { name: "AI Control Panel", actions: ["inspect","configure","status"] },
  "decoding-partner": { name: "Decoding Partner", actions: ["detect","decode","encode","report"] },
  "security": { name: "Security", actions: ["audit","threat-model","verify","report"] },
  "research": { name: "Research", actions: ["collect","synthesize","cite"] },
  "study": { name: "Study Mode", actions: ["explain","quiz","review"] },
  "memory": { name: "Local Memory", actions: ["store","retrieve","delete"] },
  "web": { name: "Web/Source Layer", actions: ["retrieve","inspect","summarize"] },
  "media": { name: "Image/Media", actions: ["generate","inspect","attach"] },
  "workspace": { name: "Workspace", actions: ["route","open","inspect"] }
});

export const KAI51_NODE_ORDER = Object.freeze([
  "identity","memory","context","planner","reasoner","tools",
  "research","app-maker","code-writer","project-maker","god-engine",
  "ai-control-panel","decoding-partner","security","study","web",
  "media","workspace","verifier","recovery"
]);