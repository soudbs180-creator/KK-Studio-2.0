# Spec

- ID: `TASK-GOV-001`
- Source of truth: current source, tests, `AGENTS.md`, architecture docs, and dated change packages; this package indexes them without duplicating their full contents.
- Acceptance:
  1. A new session can recover current reality, specification pointers, task status, known issues, and the next safe step from `docs/governance/`.
  2. The branch and PR workflow is explicit, including dirty-worktree isolation and the required local gates.
  3. CI rejects alternate package-manager lockfiles and runs Node 24 ESLint, ledger validation, import boundaries, type, unit, UI guard, format, build, browser, Rust and Tauri checks. Active tasks require isolation; DONE requires verification evidence; missing dependencies and dependency cycles fail the local gate. CI configuration is distinct from remote execution and protected-branch settings.
  4. An expired provider cooldown is selectable; an active cooldown remains unavailable; concurrency, capability, OAuth exclusion, and active connection behavior remain unchanged.
  5. README points at the current Figma baselines and keeps Prototype/unverified boundaries visible.
  6. Correct lint errors while preserving existing behavior; malformed external Provider success responses remain uncertain and must not trigger automatic duplicate submission.
- Status language: unsupported external provider, ComfyUI, VPS, billing, and native-mobile claims remain `BLOCKED`, `PARTIAL`, or `NOT VERIFIED`.
