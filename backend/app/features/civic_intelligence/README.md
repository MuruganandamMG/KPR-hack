# Civic intelligence

`gateway.py` exposes `CivicGateway.analyze(text=..., audio=...) -> Analysis`, implemented by `GeminiGateway`. Inputs are untrusted original text or normalized WAV bytes. Output is the strict Pydantic model in `schemas.py`, including observable reasoning, language, category, departments, urgency, and model confidence. `review_reason` checks category agreement and the configured confidence threshold deterministically.

The adapter uses Gemini REST structured JSON output, bounded HTTP timeouts, and at most two requests for transient or invalid results. Credentials come from central server settings. Failures become safe `InferenceError` messages. No Grok failover, invented inference, or accuracy guarantee.

Dependencies: httpx, Pydantic and server settings. Verify from root: `.venv/Scripts/python -m pytest backend/app/features/civic_intelligence` (Unix: `.venv/bin/python`). Tests replace only Gemini's HTTP transport and exercise the real adapter.

The prompt explicitly preserves reported facts, duration, negation and uncertainty in professional English, distinguishes dominant classification from supporting responsibilities, and explains work required from each secondary department. It forbids added urgency language and unsupported causal claims. Phrase translations come from returned evidence, never frontend keyword guesses. Prompt instructions and JSON validity do not guarantee semantic accuracy; live synthetic findings and limitations are in `docs/test-results/routing-quality.md`.
