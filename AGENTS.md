# Project agent instructions

## Purpose and current scope

Maintain a clear, modular frontend and backend that can grow through isolated features. Keep operations focused, interfaces explicit, and changes easy to review and verify.

The project helps municipal grievance systems understand citizen complaints submitted as text or voice in regional dialects, informal vocabulary, and misspelled language. It should normalize complaints, decompose explicit and evidence-backed implicit civic issues, identify civic intent, department, and urgency per issue, preserve original context, expose routing explanations, confidence, and linked parent/child tracking IDs, and evaluate routing accuracy, dialect robustness, and initial response time.

The hackathon prototype follows PRD.md and plan.md. Its feature map and setup/check commands are in README.md. Keep work within that scope; do not scaffold future features.

## Required technology stack

- Frontend: React + Vite + Tailwind CSS.
- Backend: Python + FastAPI.
- AI: Gemini, accessed through the backend. Keep credentials in server-side configuration and AI integration behind a dedicated interface.
- Database: SQLite through SQLAlchemy in backend data-access modules; versioned SQL migrations live in backend/app/shared/migrations.
- Use this stack for new features. Do not replace or add alternative frameworks, AI providers, or databases unless the user requests a stack change.

## Working rules

- Read the problem statement, applicable instructions, existing code, and Git status before changing files.
- At the start of each task, read the current root `AGENTS.md`, applicable local instructions, the root feature map, and the owning feature README. Re-read instructions changed during the session instead of relying on a previous summary.
- Follow the user's latest explicit direction within platform instructions. Apply this file repository-wide; read any directory-specific `AGENTS.md` before editing that directory.
- Use judgment for routine decisions and state material assumptions briefly. Ask only when missing information prevents correct work or an action requires authorization.
- Complete authorized work through implementation and verification. Preserve unrelated work and avoid opportunistic refactoring.
- Prefer existing conventions, native platform capabilities, and standard libraries. Add dependencies only when they solve a concrete requirement.
- Keep these instructions consistent. Update existing rules rather than adding conflicting or repeated rules.

## Planning and implementation

- When the user requests planning, produce a plan and keep product code unchanged until implementation is requested.
- For a new feature or a change spanning multiple modules, identify the intended behavior, acceptance criteria, affected folders, interface changes, dependencies, and verification steps before coding.
- Scale planning to the work: small changes need a short plan; significant changes may use `docs/plans/<feature-name>.md`.
- Identify shared files and integration points before starting. Define the frontend/backend contract before implementing its consumers.
- Implement only the requested scope. Do not build speculative extension points, infrastructure, or future features.
- If a requirement materially changes, update the plan and affected contracts before continuing.

## Folder structure and feature boundaries

For a new application, use this default shape unless the chosen framework needs a different layout. Preserve equivalent existing structure instead of moving working code for cosmetic consistency.

```text
frontend/
  src/
    features/<feature-name>/   # Feature UI, state, API operations, and tests
    shared/                   # UI and utilities used by multiple features
backend/
  app/
    features/<feature-name>/   # Handlers, business logic, data access, and tests
    shared/                   # Common server infrastructure and utilities
contracts/                    # Cross-boundary schemas or API specifications
docs/
  plans/                      # Substantial feature plans, when needed
```

- Before implementing each new feature, create its own descriptive folder within each application it affects. Use matching feature names when it spans frontend and backend. Extend an existing feature in its existing folder rather than creating a duplicate.
- Keep feature-specific code and tests inside that feature. Create files and subfolders as responsibilities appear; avoid empty scaffolding.
- Keep a short `README.md` in each implemented feature folder describing its purpose, public entry points, inputs and outputs, dependencies, and how to verify it. Document the files that actually exist.
- Maintain a concise feature-to-folder map in the root README as features are added, so people and agents can locate the relevant code without searching unrelated modules.
- Keep each module focused on one clear responsibility. Split unrelated operations rather than growing a catch-all file.
- Give every API operation a named function or handler with explicit inputs, outputs, and errors. Separate substantial operations into their own files; do not require a new file for every trivial function call.
- Share common transport, authentication, validation, and utilities rather than duplicating them in every operation.
- Import another feature through its public interface, not its private implementation. Avoid circular dependencies.
- Move code into `shared` only when multiple features actually need it. Keep framework-specific frontend and backend code separate.
- Keep shared contracts compatible with both applications. If their languages differ, use an API specification or schema rather than importing incompatible source files.

## Protecting completed features

- Once a feature is implemented and verified, leave its files unchanged during unrelated work. Do not restyle, rename, move, rewrite, or refactor it merely because another feature is being added.
- Change an existing feature only when required by the requested behavior, a relevant bug or security fix, or a necessary integration or compatibility update. Explain the dependency before making a change outside the owning feature folder.
- Keep unavoidable integration edits small: update the needed route registration, contract, configuration, or public interface rather than rewriting the surrounding feature.
- When changing a completed feature, verify its affected behavior and consumers and update its documentation if its interface or responsibilities change.
- Folder separation supports navigation and ownership; it does not guarantee independence. Keep dependencies explicit and check integration behavior as well as individual features.

## Frontend maintenance

- Keep rendering, feature state, API operations, and business calculations separate where they have distinct responsibilities.
- Put feature API operations in the feature folder and reuse the common request client. Keep URLs, headers, credentials handling, and response parsing out of UI components.
- Keep state close to its consumers; introduce global state only for data that must be shared across features.
- Reuse common UI components, styling conventions, and design tokens. Scope feature styles to prevent unintended changes elsewhere.
- Support loading, empty, success, and error states. Prevent stale requests or duplicate submissions from corrupting state.
- Use semantic controls, accessible labels, keyboard navigation, and layouts suited to the supported screen sizes.
- Treat browser validation as user assistance; enforce trusted validation and authorization on the backend. Keep secrets out of client code.

## Backend maintenance

- Keep request handlers focused on transport concerns. Place business rules in feature functions or services and persistence operations in data-access modules when those boundaries are useful.
- Validate untrusted inputs at entry points and enforce authorization for protected operations.
- Define request schemas, response schemas, status codes, and error behavior consistently. Return useful errors without exposing secrets or internal details.
- Keep configuration centralized and environment-dependent values outside source code. Document required environment variables with safe examples.
- Use transactions when multiple writes must succeed together. Add concurrency controls and idempotency where retries or simultaneous requests could corrupt data.
- Keep database changes in versioned migrations. Document compatibility and recovery considerations for significant schema changes.
- Log enough context to diagnose failures while excluding credentials and sensitive payloads.

## Pure calculations and business rules

- Prefer pure functions for calculations and business transformations: explicit inputs, deterministic outputs, and no hidden mutation or I/O.
- Keep UI, network, filesystem, clock, randomness, and database effects at application boundaries. Pass required values into calculation code.
- For mathematical behavior, document the valid input domain, units, precision, rounding, and edge cases. Verify known results and relevant mathematical properties.
- Use the numeric representation required by the domain; do not silently accept precision loss where exact results matter.
- These rules apply to deterministic calculations and transformations. Speech recognition and AI dialect interpretation are external inference operations; isolate them behind explicit interfaces rather than assuming their outputs are deterministic.

## Preventing conflicts and regressions

- Check the working tree before editing and review the diff before finishing. Never discard or overwrite unrelated changes.
- When multiple contributors or agents are working, agree on feature and file ownership. Coordinate shared contracts, configuration, entry points, migrations, manifests, and lockfiles before changing them.
- Use separate branches or worktrees for simultaneous work when available. Isolation reduces edit collisions; it does not replace integration checks.
- Keep changes focused and avoid broad formatting or renaming unrelated to the task.
- Maintain compatibility for existing callers. When a breaking change is requested, update affected consumers and document the transition together.
- Use unique migration names and ordering that fits the selected migration tool; reconcile competing migrations before integration.
- Resolve merge conflicts by preserving intended behavior from both changes, then rerun affected checks. Do not select an entire side blindly.
- Check for unresolved conflict markers, circular dependencies, mismatched contracts, duplicate route registrations, and unintended global style effects when relevant.
- Reduce conflicts through these practices and report remaining risks honestly. Never claim a guarantee of zero conflicts.

## Verification and completion

- Discover and use the repository's actual setup, lint, type-check, test, and build commands. Do not invent commands or claim checks ran when they did not.
- For every implemented feature, define observable acceptance criteria and verify them before calling it complete. Creating files or passing a build alone does not prove the feature works.
- Verify changed behavior, important error cases, and affected integration points. Add meaningful regression coverage for bugs and tests for nontrivial new behavior.
- For frontend changes, inspect the affected interface in a browser when available. For API changes, check contract agreement and relevant request/response behavior.
- For a feature spanning frontend and backend, verify the user flow across the real API and persistence boundary as well as isolated tests. When relevant, check tracking IDs, retrieval, original evidence, routing decisions, and audit records using synthetic data and temporary storage.
- Check relevant loading, validation, error, retry, and unavailable-provider behavior. Confirm that the new feature does not break affected completed features.
- Separate checks with controlled AI responses from live Gemini verification. A configured key or passing mocked test is not proof of successful inference, dialect coverage, or routing accuracy; use human-labeled examples for accuracy claims.
- When a required environment, credential, device, or service prevents a check, report the feature as partially verified and name the missing check. Never silently substitute fabricated success or mark an unverified path as working.
- Run checks proportionate to the change. Documentation-only changes need a content and diff review rather than unrelated product tests.
- Investigate failures before fixing them. Distinguish pre-existing failures from failures introduced by the change.
- Run fresh checks after the final relevant change and report actual command results. Do not claim a failing required check passed; fix failures within scope or explicitly report why completion is blocked.
- Finish with a concise report of what changed, verification results, and any unresolved limitations.

## Keeping the project maintainable

- Update setup instructions when commands, dependencies, or environment requirements change. Document public interfaces and significant decisions near their owning module.
- Remove obsolete code as part of the relevant change. Keep comments focused on intent, constraints, and non-obvious decisions.
- As project planning and implementation establish the stack, feature map, domain rules, commands, and acceptance criteria, update this file. Preserve useful rules and remove assumptions that no longer apply.
- Add frontend or backend `AGENTS.md` files only when concrete local rules are needed. Keep root rules here and local differences in those files.
- Keep `SYSTEM_INSTRUCTIONS.md` aligned with this file; repository-specific rules belong here so there is one maintained source.
