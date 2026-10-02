# KAI 51 — Independent Intelligence Core

This repository contains the independent KAI 51 core that HAxBRO can embed through a normal HTML/JavaScript surface.

## Independence
- No OpenAI, Gemini, Groq or Anthropic API calls.
- No provider SDKs.
- Identity, routing, local memory, planning, local tools, verification and recovery are implemented here.
- Memory is browser-local and capped at 12 entries.
- The HTML UI talks directly to the KAI 51 core.

## Important boundary
A software architecture does not magically become a foundation model. This repository deliberately separates the KAI 51 intelligence/orchestration layer from optional language-model compute. The included runtime operates without a network for its local capabilities. Open-ended language generation requires a model runtime and weights to be bundled locally.

That lets HAxBRO own the intelligence architecture and remain provider-independent. A future local model bundle can plug into run() without changing KAI's identity, memory, planner or tool system.

## Run
Open index.html in a modern browser or serve the repository with any static server.

Try: What are you? — 25 * 4 — remember my project is HAxBRO — show memory
