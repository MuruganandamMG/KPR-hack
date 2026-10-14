# Greater Chennai grievance department classification

## Problem and goal

ACIE currently treats six complaint topics as if they were departments. That sends different service owners to the same synthetic label and maps unclear input to General Administration. The product examples are Tamil and Indian-language complaints, and the user approved Greater Chennai as the working jurisdiction.

The goal is to recommend the real authority responsible for the reported work, using Greater Chennai Corporation (GCC) responsibilities and the named external utilities serving Chennai. The classifier must expose uncertainty and preserve officer approval. No classifier can be described as perfect; accuracy claims require independent human-labeled examples.

The source review is captured in [department-classification-chennai.md](../../research/department-classification-chennai.md). GCC assigns municipal streetlights to Electrical, solid-waste collection to Solid Waste Management, stormwater drains to Storm Water Drain, and public-health work to Health. Household water and sewerage are handled by CMWSSB, while electricity distribution complaints belong to TNPDCL/TANGEDCO. GCC road responsibility also depends on who maintains the road. The design must preserve these distinctions rather than map by keywords alone.

## Design

### Classification model

Keep `category` as the issue being reported and make `primary_department` the responsible municipal department or utility agency. Expand issue categories only for the GCC complaint types included in this prototype, and decouple the category from a fixed one-to-one department map. The initial issue categories are Water Supply, Roads, Solid Waste, Public Health, Electricity, Storm Water, Sewerage, Parks & Trees, Bridges, Buildings & Town Planning, Revenue & Licences, Education, and Other. One issue category can have more than one owner depending on the evidence: an electricity complaint about a GCC streetlight goes to GCC Electrical, while a household outage or distribution-line hazard goes to TNPDCL/TANGEDCO. Storm Water must distinguish rainwater drains from sewage. Waste collection and street sweeping must remain distinct from public-health or vector-control concerns.

Add a small source-backed routing catalog in the civic-intelligence feature. Canonical owners are GCC Roads, GCC Electrical, GCC Solid Waste Management, GCC Health, GCC Storm Water Drain, GCC Parks & Playfields, GCC Bridges, GCC Buildings, GCC Town Planning, GCC Revenue, GCC Education, Chennai Metro Water (CMWSSB), and TNPDCL/TANGEDCO. Each entry names the work it handles, relevant exclusions or boundary cases, and the official source URL. Use the catalog to constrain the Gemini schema and prompt, validate returned recommendations, provide the officer department list from `/api/meta`, and support review explanations. This list covers the current complaint classes plus high-value GCC complaint areas identified in the source note. Do not add dispatch integrations or unrelated future services.

Do not use General Administration as the fallback owner. Represent unknown, ambiguous, out-of-jurisdiction, or asset-ownership-unclear assignments as needing officer review, with no asserted department. Keep category `Other` for an issue that cannot be identified; it does not imply an administrative owner. A secondary owner is included only when the complaint contains another actionable issue or a concrete resolution dependency, and the explanation states the work that owner must perform.

### Interfaces and compatibility

The backend owns the canonical catalog and validation. Update the inference schema and `review_reason` behavior; update `/api/meta` so officer routing choices use the current catalog; regenerate `contracts/openapi.json`; and update frontend types, filters, routing displays, and officer decision controls to use the new canonical owner names and the explicit review state.

Existing complaint and audit rows are immutable historical evidence. Continue to read and display their old labels as legacy values, but do not offer those labels for new AI recommendations or new officer decisions. Do not rewrite stored recommendations, officer assignments, or audit events. The new review state must be explicit in the analysis response and the officer UI; a null department must never be shown as a valid route.

Routing remains a recommendation. Officers must approve every actual assignment. The app records an approved agency/department as a local workflow decision and does not claim to transmit or dispatch to GCC, CMWSSB, or TNPDCL/TANGEDCO.

## Acceptance criteria

1. Every newly recommended owner is in the source-backed canonical catalog; no current recommendation uses `Public Works`, `Sanitation`, `Drainage`, `Electricity`, `Water Supply`, or `General Administration` as an invented catch-all department.
2. Water supply and sewerage complaints identify CMWSSB; rainwater drain and waterlogging complaints identify GCC Storm Water Drain; ambiguous “drain” complaints require review.
3. GCC streetlight faults identify GCC Electrical; household supply, billing, voltage, and distribution-line issues identify TNPDCL/TANGEDCO; uncertain asset ownership requires review.
4. Missed garbage collection/street cleaning identifies GCC Solid Waste Management; disease/vector or food-safety complaints identify GCC Health.
5. Road defects identify GCC Roads only when GCC ownership is supported; uncertain road ownership requires review. Reported multi-issue complaints can include distinct secondary owners, supported by the complaint and explanation.
6. Supported additional categories route to GCC departments for parks/trees, bridges, building or planning matters, revenue/licences, and municipal schools. Out-of-scope or uncertain items require officer review rather than General Administration.
7. Invalid owner/category combinations, duplicate secondary owners, or legacy labels in new AI/decision payloads cannot become an actionable new recommendation or approved assignment.
8. Existing database rows remain byte-for-byte unchanged and continue to load, display, and appear in queues with their historical labels.
9. The frontend clearly distinguishes “needs officer review” from a routed recommendation. No route is implied when no owner is known.
10. A human-labeled evaluation set records per-class primary-owner and review decisions, including Tamil/transliterated, mixed-language, misspelled, ambiguous, and multi-issue cases. Report counts, accuracy, and unresolved errors; do not describe the result as perfect.

## Affected areas

- `backend/app/features/civic_intelligence/`: source-backed catalog, Gemini prompt/schema, validation and review reason.
- `backend/app/features/complaints/`: decision validation and persistence-facing response compatibility, only where needed for the new review state and canonical owner checks.
- `backend/app/main.py`: current owner catalog in `/api/meta`.
- `contracts/openapi.json` and `frontend/src/features/complaints/`: generated contract, types, owner filters, recommendations, and officer decisions.
- `docs/evaluation_cases.json`, `docs/evaluation.md`, and the civic-intelligence feature README: source-backed cases, human-label protocol, and public interface.

No new dependencies or database migration are expected. Stored rows remain untouched. If implementation finds that explicit review state cannot be represented compatibly in the existing stored analysis shape, stop and update this design before changing the persistence contract.

## Verification

- Unit checks for the catalog, topic/owner boundaries, legacy read compatibility, new-payload rejection, review fallback, and secondary-owner uniqueness.
- Backend API tests with temporary SQLite for metadata, recommendation validation, manual approval, queue filtering, and retrieval of historical rows.
- Frontend tests for current versus legacy display, manual review state, current owner choices, and primary/secondary filtering.
- Regenerate and compare OpenAPI, then run the repository's backend and frontend checks.
- Run a live Gemini smoke evaluation only if service credentials are available; keep it separate from controlled tests. Use a human-labeled corpus before making any accuracy statement. Never claim that prompt/schema conformance proves real-world routing accuracy.

## Open boundary

GCC responsibilities vary by asset and road jurisdiction, and utilities are separate public bodies. Where the complaint lacks evidence to determine the owner, officer review is the expected result. This prototype records approved routing locally; it does not send complaints to external agencies.
