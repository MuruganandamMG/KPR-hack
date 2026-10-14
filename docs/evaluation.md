# Live inference evaluation

Workflow tests prove validation/persistence/routing, not AI accuracy. Use synthetic `evaluation_cases.json` with your configured Gemini model. POST each case to `/api/complaints` with a unique idempotency key; record recommendation and `analysis_ms` (provider analysis/validation duration, milliseconds).

Routing accuracy = correct primary departments / successfully analyzed cases; report failures separately. Compare dialect/mixed-language accuracy to formal-case accuracy with sample counts. Record median/p95 analysis time and HTTP latency separately; these measure initial system response, not government officer response. Confidence is not measured accuracy.

Record equivalent voice examples, verify audio retrieval, and compare transcript meaning and routing to independent human labels. Include unintelligible speech, misspellings, ambiguous issues and provider failures. Expand the tiny corpus with human-reviewed labels before claiming broad language coverage.

This synthetic corpus is a smoke evaluation, not a benchmark. A single successful live text test is recorded in [the Gemini configuration report](test-results/gemini-configuration.md); it does not establish accuracy across this corpus or live voice coverage.
