/**
 * KAI 51 — Independent Intelligence Core + local model runtime.
 *
 * KAI owns identity, memory, planning, routing, tools, verification and recovery.
 * The language model is executed locally in the browser through Transformers.js/ONNX.
 * No OpenAI/Groq/Gemini/Anthropic provider is used by this core.
 *
 * First model install requires downloading open model weights into the browser cache.
 * After the model is cached, inference can run without a model-provider API.
 */

const KEY = "haxbro:kai51:memory:v2";
const MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";
const MODEL_DTYPE = "q4f16";
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";

function loadMemory() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]").slice(-12); }
  catch { return []; }
}
function saveMemory(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(-12))); } catch {}
}

export class KAI51 {
  constructor() {
    this.name = "KAI 51";
    this.version = "51.1-independent-local";
    this.nodes = [
      "identity","memory","context","planner","reasoner","tools",
      "research","app-maker","code-writer","security","verifier","recovery"
    ];
    this.memory = loadMemory();
    this.model = null;
    this.modelPromise = null;
    this.modelState = "not-installed";
  }

  identity() {
    return {
      name: this.name,
      version: this.version,
      type: "HAxBRO-owned orchestration + browser-local intelligence runtime",
      network: false,
      provider: null,
      model: MODEL_ID,
      modelDtype: MODEL_DTYPE,
      capabilities: this.nodes
    };
  }

  status() {
    return {
      state: this.modelState,
      model: MODEL_ID,
      dtype: MODEL_DTYPE,
      provider: null,
      networkProvider: false,
      memoryEntries: this.memory.length
    };
  }

  remember(input, output) {
    this.memory.push({
      time: new Date().toISOString(),
      input: String(input).slice(0, 1200),
      output: String(output).slice(0, 1800)
    });
    this.memory = this.memory.slice(-12);
    saveMemory(this.memory);
  }

  plan(input) {
    const q = String(input).trim();
    const lower = q.toLowerCase();
    const steps = [];
    if (/\b(calculate|math|\d+\s*[+*\/-]\s*\d+)\b/.test(lower)) steps.push("calculator");
    if (/\b(time|date|today|tomorrow)\b/.test(lower)) steps.push("clock");
    if (/\b(json)\b/.test(lower)) steps.push("json");
    if (/\b(code|javascript|python|html|css)\b/.test(lower)) steps.push("code-writer");
    if (/\b(app|website|game|build)\b/.test(lower)) steps.push("app-maker");
    if (/\b(security|secure|vulnerability|cve|threat)\b/.test(lower)) steps.push("security");
    if (/\b(remember|memory|forget)\b/.test(lower)) steps.push("memory");
    if (!steps.length) steps.push("reasoner");
    return { intent: q, route: [...new Set(steps)], memoryCount: this.memory.length };
  }

  calculate(expr) {
    const clean = String(expr).replace(/[^0-9+\-*/().%\s]/g, "");
    if (!clean.trim()) return null;
    try {
      const value = Function('"use strict";return (' + clean + ')')();
      return Number.isFinite(value) ? value : null;
    } catch { return null; }
  }

  executeLocal(input) {
    const q = String(input).trim();
    const lower = q.toLowerCase();

    if (/what are you|who are you|what is kai/.test(lower)) {
      return "I am KAI 51, the HAxBRO-owned intelligence and orchestration runtime. My identity, routing, memory, tools, verification and recovery layers are independent of model providers.";
    }
    if (/\b\d+\s*[+*\/-]\s*\d+/.test(lower)) {
      const match = q.match(/[0-9().%\s+*/-]+/);
      const value = match && this.calculate(match[0]);
      if (value !== null) return String(value);
    }
    if (lower === "time" || lower.includes("what time is it")) return new Date().toLocaleTimeString();
    if (lower === "date" || lower.includes("what is today's date")) return new Date().toLocaleDateString();
    if (lower.startsWith("remember ")) {
      const note = q.slice(9).trim();
      this.remember("user memory", note);
      return "Stored locally in this browser. KAI 51 keeps up to 12 local memory notes for this user.";
    }
    if (lower.includes("show memory")) {
      return this.memory.length
        ? this.memory.map((m, i) => (i + 1) + ". " + m.output).join("\n")
        : "No local memories yet.";
    }
    return null;
  }

  async loadLocalModel(onProgress = () => {}) {
    if (this.model) return this.model;
    if (this.modelPromise) return this.modelPromise;

    this.modelState = "installing";
    onProgress({ status: "installing", model: MODEL_ID });

    this.modelPromise = (async () => {
      const { pipeline, env } = await import(TRANSFORMERS_URL);

      // Browser cache keeps downloaded model assets available locally.
      env.useBrowserCache = true;
      env.allowRemoteModels = true;
      env.allowLocalModels = true;

      const hasWebGPU = typeof navigator !== "undefined" && !!navigator.gpu;
      const device = hasWebGPU ? "webgpu" : "wasm";

      onProgress({
        status: "loading",
        model: MODEL_ID,
        device,
        message: hasWebGPU ? "Using browser GPU" : "Using local WASM runtime"
      });

      this.model = await pipeline("text-generation", MODEL_ID, {
        device,
        dtype: MODEL_DTYPE
      });

      this.modelState = "ready";
      onProgress({ status: "ready", model: MODEL_ID, device });
      return this.model;
    })().catch(error => {
      this.modelState = "error";
      this.modelPromise = null;
      throw error;
    });

    return this.modelPromise;
  }

  buildSystemPrompt(plan) {
    const memory = this.memory.slice(-6)
      .map(m => "- " + m.output)
      .join("\n");

    return [
      "You are KAI 51, the independent intelligence runtime of HAxBRO AI.",
      "You are not OpenAI, Groq, Gemini, Anthropic, or any hosted provider.",
      "KAI owns its identity, planning, memory, routing, tools, verification and recovery.",
      "Be useful, direct and technically precise. Do not claim tools or facts you did not actually use.",
      "When a task belongs to App Maker, Code Writer, Security, Research, or another KAI node, explain the intended route and produce the useful result when possible.",
      "Never reveal hidden chain-of-thought. Give concise conclusions and useful reasoning summaries instead.",
      "Current KAI route: " + plan.route.join(" -> "),
      memory ? "Relevant local memory:\n" + memory : "No relevant local memory."
    ].join("\n");
  }

  extractGenerated(output) {
    const generated = output?.[0]?.generated_text;
    if (Array.isArray(generated)) {
      const last = generated[generated.length - 1];
      return typeof last === "string" ? last : (last?.content || "");
    }
    if (typeof generated === "string") return generated;
    return "";
  }

  async generateLocally(input, plan, onProgress) {
    const generator = await this.loadLocalModel(onProgress);
    const messages = [
      { role: "system", content: this.buildSystemPrompt(plan) },
      { role: "user", content: String(input) }
    ];

    const output = await generator(messages, {
      max_new_tokens: 512,
      do_sample: false
    });

    const answer = this.extractGenerated(output).trim();
    if (!answer) throw new Error("Local model returned an empty response.");
    return answer;
  }

  verify(result, mode) {
    return {
      ok: typeof result === "string" && result.trim().length > 0,
      source: "KAI 51 LOCAL",
      provider: null,
      networkProvider: false,
      mode
    };
  }

  async run(input, options = {}) {
    const q = String(input || "").trim();
    if (!q) return { ok: false, answer: "Enter a request.", status: this.status() };

    const plan = this.plan(q);
    let answer = this.executeLocal(q);
    let mode = "local-tools";

    if (answer === null) {
      mode = "local-model";
      answer = await this.generateLocally(q, plan, options.onProgress || (() => {}));
    }

    const verification = this.verify(answer, mode);
    if (!verification.ok) {
      return {
        ok: false,
        answer: "KAI 51 recovery: no verified result.",
        plan,
        verification,
        status: this.status()
      };
    }

    this.remember(q, answer);
    return {
      ok: true,
      answer,
      plan,
      verification,
      mode,
      identity: this.identity(),
      status: this.status()
    };
  }
}

export const kai51 = new KAI51();
