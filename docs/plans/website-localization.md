# Website language selection

The requested behavior is a multilingual website interface, replacing the earlier complaint-output translation interpretation.

Implement a persistent, accessible language selector in the application header for English, Tamil, Hindi, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati and Punjabi. Use React context and static UI catalogs under `frontend/src/features/localization/`; no runtime translation service or new dependency is needed. The browser's supported preferred language initializes the first visit, and an explicit choice is remembered in localStorage. Update the document language and title.

Localize application navigation, intake, voice controls, tracking, officer controls, statuses, department labels, feedback and analysis card labels through the public localization interface. Preserve API enum values, editable drafts, IDs, original evidence and AI-produced complaint content. Use English fallback for unknown provider messages. Remove the previous output-translation UI, API and associated tests introduced during this conversation; preserve pre-existing follow-up edits.

Acceptance: switching languages updates the current screen without remounting it, preserves drafts, survives reload, works in all three workspaces, and translates labels and placeholders as well as visible headings. English remains backward compatible. Test persisted and unsupported preferences, translated navigation/forms/errors, API values and unchanged complaint evidence; run frontend tests/build/format, affected backend checks after removing the earlier API, and inspect the real browser.
