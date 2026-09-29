# Specification baseline

Updated: 2026-09-23 (Design System 1.3 and TASK-RULES-004 rule audit).
Current policy reconciliation: 2026-09-20, TASK-GOV-002. Read root AI_RULES.md and engineering/SDLC, PROMPTING, BRANCH-POLICY, REVIEW, AI-EVALS alongside AGENTS. Tool-specific entrypoints route to these sources.

These are pointers to the project's existing specifications. The governance index avoids
creating a second copy of UI or storage rules.

## Authority and conflict resolution

Current code/runtime/test output proves what the implementation does; it does not override an approved specification. Compare source date, scope, user intent and acceptance evidence before deciding whether implementation or specification drifted. An unresolved conflict remains CONFLICT rather than a fabricated behavior decision.

1. Current user intent and `AGENTS.md` for applicable operating constraints; nested rules apply within their declared module.
2. `docs/DESIGN-SYSTEM.md` owns colors, type tiers and basic components (user Ardot `728457371665311 / 0:1`, 2026-09-22 PDF, audited corrections). Existing Figma `0nU0A7pq6eyjwfwm1TtWkO` nodes `404:28667`, `410:67357`, `410:59708` retain page-layout/asset authority; historical palettes and `1:2` cannot override newer sources.
3. Current source, tests and actual runtime evidence for implemented reality; historical verification covers only its recorded source and scope.
4. `docs/architecture/ARCHITECTURE.md`, `DATA-STORAGE.md`, and `GENERATION-PLATFORM.md` for module and data boundaries.
5. `docs/UI_INDEX.md` is the single UI entry: `UI_RULES.md` (parts/interaction rules), `UI_ARCHETYPES.md` (page types), `DESIGN_TOKENS.md` (values), `DESIGN-SYSTEM.md` (color and basic components), `UI_SPEC.md` (runtime and verification), `FRONTEND-SPEC.md` (engineering constraints). Historical UI records live in `docs/archive/ui-history/` and are read-only.
6. A dated `docs/changes/<date>-<task>/spec.md` for task-specific acceptance criteria, with its `verification.md` as the evidence record.
7. `docs/features/features.registry.json` is the machine-readable authority for how real each product feature is (REAL/PARTIAL/PROTOTYPE/PLANNED); `docs/features/feat-*.md` cards are the human entry, `docs/features/README.md` is a generated board, and `docs/features/BACKEND-ROADMAP.md` orders demo-to-backend work. Feature status is orthogonal to task status and never overrides items 1-6.

## Non-negotiable contracts

- Secrets remain in the OS credential vault or request memory; metadata and snapshots contain only opaque references.
- A failed read, validation, write, or asset lookup cannot silently become an empty project or a successful generation.
- `Prototype`, `Mock`, `UI Only`, and `NOT VERIFIED` remain visible whenever the backing service or evidence is absent.
- Desktop, Web, and Mobile capabilities are explicit; a browser test of a shared 390px layout does not prove a native mobile application.
- UI controls must have real behavior or a visible disabled reason and must preserve loading, error, cancellation, offline, focus, Escape, and stale-async protections where applicable.
- Production claims require the relevant source build, runtime mode/entry, route/import chain, and same-state browser or desktop evidence.
- A feature card marked REAL requires that same-form runtime evidence and at least one DONE/PASS ledger task and explicit platforms/runtimeEvidence records; PARTIAL/PROTOTYPE/PLANNED features must link an open ledger task, and every card must reference code/test paths that actually exist. Turning a local-demo seam into a real backend follows the waves in `docs/features/BACKEND-ROADMAP.md`; demo and real results must never be presented as the same state.

## Executable enforcement

- TypeScript strict checking: `npm run typecheck`.
- ESLint recommended JS/TypeScript rules and ledger/import-boundary checks: `npm run lint`.
- Feature registry/card/board consistency: `npm run features:check` (regenerate with `npm run features:write`); already chained into `npm run lint`.
- Ledger consistency: `npm run governance:check` (regenerate `TASK_LEDGER.md` with `npm run governance:write`).
- Current Markdown relative file links: `npm run markdown:check` (included in `npm run lint`; historical snapshots and external URLs require separate review).
- Unit and browser regression: `npm run test` and `npm run test:ui`.
- UI token/component guard: `npm run ui:check`.
- Formatting: `npm run format:check`.
- Build: `npm run build`.
- Desktop compile: `npm run client:check`.
- CI runs the checks that do not require provider credentials or a live ComfyUI installation; those external capabilities remain separate acceptance gates.
