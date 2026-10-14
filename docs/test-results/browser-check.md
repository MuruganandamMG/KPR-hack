# ACIE browser verification

Date: 2026-10-14. Browser: user's connected Microsoft Edge. App: `http://localhost:5173`. All actions used browser UI controls and synthetic test data.

## Passed

- Blank text keeps Submit disabled.
- Text submission receives a tracking ID and preserves original wording.
- Missing tracking ID displays the expected not-found error; a valid ID clears that error and displays the saved record.
- Officer queue search finds the submitted complaint and shows original evidence.
- Routing approval remains disabled without a decision note.
- Explicit Public Works routing, Start work, and Mark resolved each succeed and add their respective notes to the audit timeline.
- Citizen tracking displays Resolved and Public Works after officer updates.
- Found and fixed stale future-review copy on manually resolved complaints; current pending notices stop after routing, while the historical inference failure remains in the audit timeline. A regression test reproduced the issue before the fix.
- At a 390 × 844 viewport, voice controls and citizen tracking render in a single column. DOM width checks found no horizontal overflow on the voice view. The normal viewport was restored after testing.

Synthetic test record: `GRV-2026-401ce8f5824f442d902d28bc289b6ae7` (resolved). No existing citizen complaints were edited or deleted.

## Evidence

- [Desktop resolved complaint](resolved-complaint.jpg)
- [Mobile tracking](mobile-tracking.jpg)

## Unverified

- Gemini interpretation: the running server reports Gemini is not configured. The saved-for-manual-review behavior was verified instead.
- Browser audio upload: the extension rejected the file chooser upload because Allow access to file URLs is disabled. No permission setting was changed or workaround attempted. The generated input was a one-second synthetic tone, not microphone audio.
- Actual microphone recording/hardware was not tested. Automated audio processing and microphone lifecycle regression tests remain the existing evidence for those paths.

Automated checks: 30 backend tests, 8 frontend tests including the browser-discovered display regression, production build, lint/format checks, and npm audit with zero vulnerabilities.
