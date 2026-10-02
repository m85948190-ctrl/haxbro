import { KAI51_CAPABILITIES, KAI51_NODE_ORDER } from "./capabilities.js";
import { decode, decoderKeys } from "./decoder.js";
import { buildApp } from "./app-maker.js";

const clean = (v, n = 16000) => String(v ?? "").replace(/\0/g, "").trim().slice(0, n);

const route = (q) => {
  const l = clean(q).toLowerCase();
  const tests = [
    [/\b(app|website|calculator|todo|task|note|timer|kanban|build|preview|publish|modify)\b/, "app-maker"],
    [/\b(code|javascript|typescript|python|html|css|json|sql|debug|refactor)\b/, "code-writer"],
    [/\b(project|scaffold|architecture)\b/, "project-maker"],
    [/\b(god ?engine|orchestrat)/, "god-engine"],
    [/\b(control panel|provider status|system status)/, "ai-control-panel"],
    [/\b(decode|encode|cipher|rot13|base64|hex|morse)/, "decoding-partner"],
    [/\b(security|secure|vulnerability|cve|threat|incident|scan)/, "security"],
    [/\b(research|sources|compare|latest)/, "research"],
    [/\b(study|teach|quiz|explain)/, "study"],
    [/\b(remember|memory|forget)/, "memory"],
    [/\b(search|look up|web)/, "web"],
    [/\b(image|upload|media)/, "media"],
    [/\b(workspace|xcode)/, "workspace"]
  ];
  const found = tests.filter(([rx]) => rx.test(l)).map(([, name]) => name);
  return [...new Set(found.length ? found : ["reasoner"])];
};

const math = (q) => {
  const m = clean(q).match(/(?:what is|calculate|compute|solve)?\s*([0-9][0-9+\-*/().%\s]*)$/i);
  if (!m || !/^[0-9+\-*/().%\s]+$/.test(m[1])) return null;
  try {
    const value = Function('"use strict";return (' + m[1] + ")")();
    return Number.isFinite(value) ? String(value) : null;
  } catch { return null; }
};

function localAnswer(q, routes) {
  const m = math(q);
  if (m !== null) return m;
  const l = q.toLowerCase();
  if (/\b(who are you|what are you|what is kai)\b/.test(l)) {
    return "I am KAI 51 — HAxBRO AI's first-party intelligence runtime. My identity, routing, capabilities, decoder, and App Maker compiler run from HAxBRO-owned code without an external model provider.";
  }
  if (/\bwhat can you do|\bcapabilities\b/.test(l)) {
    return Object.values(KAI51_CAPABILITIES).map(x => x.name + ": " + x.actions.join(", ")).join("\n");
  }
  if (/^remember\s+/i.test(q)) return "This server runtime is stateless by design; use HAxBRO's browser-local memory layer for per-user memory.";
  if (/show memory|my memory/.test(l)) return "Memory is maintained by HAxBRO's browser-local memory layer.";
  if (routes.includes("app-maker")) return "KAI 51 routed this request to App Maker: Intent → Architect → Build → Test → Preview → Modify/Publish.";
  if (routes.includes("decoding-partner")) return "KAI 51 routed this request to Decoding Partner, which has 25 local decoding keys.";
  if (routes.includes("security")) return "KAI 51 routed this request to the defensive Security capability.";
  if (routes.includes("research")) return "KAI 51 routed this request to the Research capability.";
  return "KAI 51 understood the request locally and completed its first-party planning and routing pass. For open-ended learned-language generation, this runtime intentionally does not claim a model it does not contain.";
}

export function createServerKAI51() {
  return {
    name: "KAI 51",
    version: "51.4-independent-first-party",
    provider: null,
    externalModel: false,
    networkModel: false,
    nodes: KAI51_NODE_ORDER,
    capabilities: KAI51_CAPABILITIES,
    plan(input) {
      const intent = clean(input);
      return { intent, route: route(intent), nodes: KAI51_NODE_ORDER, provider: null, externalModel: false };
    },
    decode(input) { return decode(input); },
    build(input, options = {}) { return buildApp(input, options); },
    run(input) {
      const q = clean(input);
      if (!q) return { ok: false, error: "Enter a request." };
      const plan = this.plan(q);
      return {
        ok: true,
        answer: localAnswer(q, plan.route),
        plan,
        identity: {
          name: "KAI 51",
          owner: "HAxBRO AI",
          provider: null,
          externalModel: false,
          networkModel: false
        }
      };
    },
    decoderKeys
  };
}
export const kai51Server = createServerKAI51();
