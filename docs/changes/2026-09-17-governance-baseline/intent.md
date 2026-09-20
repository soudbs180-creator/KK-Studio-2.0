# Intent

- ID: `TASK-GOV-001`
- Goal: make the current KK Studio checkout recoverable and reviewable for long-term AI-led work while fixing one confirmed scheduler regression.
- Problem: the repository has strong dated feature evidence but no central project state, specification index, task ledger, known-issue register, or handoff. CI and lockfile policy are also not executable, and an expired provider cooldown is never eligible for local scheduling.
- Scope: governance index and validated task ledger, contribution/PR workflow, Windows CI, real ESLint and import-boundary checks, corrections required by the new lint gate, current Figma README pointer, cooldown scheduling contract and regression tests. External Provider response parsing uses checked unknown values instead of any, with malformed-response regression coverage.
- Out of scope: broad UI refactors, provider credentials, production deployment, deleting concurrent files, project package design, or claiming T3b/T4-T12 completion.
