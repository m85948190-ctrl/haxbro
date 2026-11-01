# KAI 360M conversational starter dataset

- Owner/project: HAxBRO KAI
- Purpose: improve natural multi-turn conversation, reference resolution, acknowledgement handling,
  instruction following, correction handling, and honest uncertainty.
- Format: JSONL chat messages with system/user/assistant roles.
- Training examples: 30 original, manually authored starter conversations.
- Held-out evaluation examples: 12 original prompts/conversations; kept separate from training.
- Source: written for this repository; not scraped from private chats or copied from model outputs.
- Intended use: pipeline validation and initial controlled fine-tuning experiments.
- Limitations: far too small to support claims of broad intelligence improvement. Expand with
  diverse, licensed/consented examples and expert review before release.
- Privacy: do not add personal conversation logs, credentials, personal records, or user secrets.
- Evaluation: compare base and adapted outputs on the held-out set and a broader regression suite.
