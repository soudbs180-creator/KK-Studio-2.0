# Specification baseline

Updated: 2026-09-17

These are pointers to the project's existing specifications. The governance index avoids
creating a second copy of UI or storage rules.

## Authority and conflict resolution

Current code/runtime/test output proves what the implementation does; it does not override an approved specification. Compare source date, scope, user intent and acceptance evidence before deciding whether implementation or specification drifted. An unresolved conflict remains CONFLICT rather than a fabricated behavior decision.

1. Current user intent and `AGENTS.md` for applicable operating constraints; nested rules apply within their declared module.
2. Figma file `0nU0A7pq6eyjwfwm1TtWkO`, using current nodes `404:28667`, `410:67357`, and `410:59708` where applicable; historical `1:2` is not a replacement baseline.
3. Current source, tests and actual runtime evidence for implemented reality; historical verification covers only its recorded source and scope.
4. `docs/architecture/ARCHITECTURE.md`, `DATA-STORAGE.md`, and `GENERATION-PLATFORM.md` for module and data boundaries.
5. `docs/UI-ALIGNMENT.md`, `docs/UI-STANDARDS.md`, `docs/UI_SPEC.md`, and `docs/FRONTEND-SPEC.md` for UI and interaction behavior.
6. A dated `docs/changes/<date>-<task>/spec.md` for task-specific acceptance criteria, with its `verification.md` as the evidence record.

## Non-negotiable contracts

- Secrets remain in the OS credential vault or request memory; metadata and snapshots contain only opaque references.
- A failed read, validation, write, or asset lookup cannot silently become an empty project or a successful generation.
- `Prototype`, `Mock`, `UI Only`, and `NOT VERIFIED` remain visible whenever the backing service or evidence is absent.
- Desktop, Web, and Mobile capabilities are explicit; a browser test of a shared 390px layout does not prove a native mobile application.
- UI controls must have real behavior or a visible disabled reason and must preserve loading, error, cancellation, offline, focus, Escape, and stale-async protections where applicable.
- Production claims require the relevant source build, runtime mode/entry, route/import chain, and same-state browser or desktop evidence.

## Executable enforcement

- TypeScript strict checking: `npm run typecheck`.
- ESLint recommended JS/TypeScript rules and ledger/import-boundary checks: `npm run lint`.
- Unit and browser regression: `npm run test` and `npm run test:ui`.
- UI token/component guard: `npm run ui:check`.
- Formatting: `npm run format:check`.
- Build: `npm run build`.
- Desktop compile: `npm run client:check`.
- CI runs the checks that do not require provider credentials or a live ComfyUI installation; those external capabilities remain separate acceptance gates.
