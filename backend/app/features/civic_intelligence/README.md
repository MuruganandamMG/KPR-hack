# Civic intelligence

`gateway.py` exposes `CivicGateway.analyze(text=..., audio=...) -> Analysis`, implemented by `GeminiGateway`. Inputs are untrusted original text or normalized WAV bytes. Output is the strict Pydantic model in `schemas.py`, including observable reasoning, language, category, departments, urgency, and model confidence. `review_reason` checks category agreement and the configured confidence threshold deterministically.

The adapter uses Gemini REST structured JSON output, bounded HTTP timeouts, and at most two requests for transient or invalid results. Credentials come from central server settings. Failures become safe `InferenceError` messages. No Grok failover, invented inference, or accuracy guarantee.

Dependencies: httpx, Pydantic and server settings. Verify from root: `.venv/Scripts/python -m pytest backend/app/features/civic_intelligence` (Unix: `.venv/bin/python`). Tests replace only Gemini's HTTP transport and exercise the real adapter.
