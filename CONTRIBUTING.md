# Contributing

KK Studio uses short-lived task branches and reviewable changes. `main` is the intended
stable integration branch. The existing `master` is historical until explicitly reconciled;
do not rename it or promote an unverified source snapshot automatically. Do not develop
directly on either stable branch.

Before editing, read `AGENTS.md`, `docs/governance/PROJECT_STATE.md`,
`docs/governance/SPEC_BASELINE.md`, and the relevant dated change package. Check `git status`
and record any concurrent dirty files. A task that can conflict with shared components,
schemas, storage, provider contracts, routing, or design tokens must be serialized or use a
fresh worktree.

Use a traceable branch name such as `fix/TASK-123-short-description` or
`chore/TASK-GOV-001-engineering-baseline`. Keep one logical goal per branch. Do not reset,
clean, force-push, or broad-stage another task's files.

The pull request description must link the task, scope, acceptance criteria, affected modules,
tests, regression surface, runtime/UI evidence when applicable, known risks, and documentation
updates. Resolve conflicts on the task branch and rerun all affected checks after resolution.

Run the local gates before requesting review:

```powershell
npm ci
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
npm run client:check
```

Before delivery, run the full `npm run verify` gate, which also includes UI standards and
the production browser suite. Use squash merge after required review/checks, then verify
the integrated mainline. Once merged, remove only the corresponding clean task worktree
and branches. Without a configured remote, keep the local review commit and PR text;
remote review, branch protection and merge remain explicitly unverified.

Run `npm run test:ui` and the relevant Web/Tauri runtime checks for UI or desktop changes.
External provider, ComfyUI, billing, deployment, and native-mobile claims require separate
evidence and must remain `Prototype`, `NOT VERIFIED`, or `BLOCKED` until that evidence exists.
