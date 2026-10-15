# Website localization verification

Verified locally on 2026-10-15 in the main checkout.

The implemented feature is website interface localization. A single header language selector changes navigation, headings, forms, placeholders, buttons, statuses, department labels, feedback and analysis-card labels across submission, tracking and officer screens. It supports English, Tamil, Hindi, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati and Punjabi. The first visit honors a supported browser language; explicit choices persist across reloads.

The earlier complaint-output translation implementation has been removed, including its UI, HTTP endpoint and associated tests. API enum values, tracking IDs, original citizen evidence, draft text and recorded AI content are preserved. Provider-produced prose remains in its recorded language. Website localization needs no runtime Gemini request; language catalogs are static assets loaded on demand.

## Automated verification

- Frontend: `npm test` — 64 passed.
- Frontend: `npm run build` and `npm run format:check` — passed. Each language is a separate chunk; the main JavaScript bundle remains approximately 378 kB before gzip.
- Backend after removing the earlier translation API: `.venv/bin/python -m pytest` — 50 passed. One existing Starlette/httpx deprecation warning remains.
- Backend lint/format and `git diff --check` — passed.
- All nine non-English catalogs contain all 479 source messages and preserve interpolation placeholders.
- UI regressions verify all supported language imports, translated navigation and forms, draft preservation, persistence, browser-language initialization, English fallback, correct API department values behind translated labels, and original evidence that coincides with a UI message.

## Browser verification

Inspected Tamil and Hindi in the local Chrome website. Navigation, instructions, inputs and buttons change with the header selector. Tamil remained selected after reloading the page. Inspected the Tamil header and form at 390 × 844; document content width was 390 px, with no horizontal overflow. Restored the normal viewport and left the website open in Tamil.

## Translation limits

Catalogs were generated with Gemini during development, then checked structurally. Frequently used Tamil/Hindi controls were refined manually. The full catalogs have not undergone native-speaker linguistic review, and passing tests does not establish translation accuracy. Unknown provider-generated messages use English fallback. Stored complaint text and AI prose are not translated by the website language selector.
