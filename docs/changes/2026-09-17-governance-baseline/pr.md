# chore(TASK-GOV-001): make project governance executable and recoverable

KK Studio has dated feature records but no unified current state, task ownership or executable governance gate. This change adds a canonical task ledger and generated view, links existing specifications, formalizes isolated task worktrees, and runs ESLint, ledger and dependency-boundary checks before the existing verification suite.

- Task: TASK-GOV-001. Source candidate: 29d0d9b; this PR describes the governance delta, not approval of the entire source snapshot.
- Scope: AGENTS/CONTRIBUTING, state/spec/task/handoff index, ADR, CI/PR workflow, scripts and tests, minimal source corrections required by ESLint, expired cooldown eligibility, checked Provider response shapes.
- Acceptance: inspect spec.md; 57-section governance audit mapping is audit.md.
- Validation: inspect verification.md for commands, counts, clean-checkout result and runtime limits.
- Regression: preserved UI whitespace/interaction during lint corrections; covered deadline timing, connection state/capacity/capability, malformed accepted Provider responses, and invalid governance state/imports.
- Risks: App fallback/pinned submission still needs TASK-PROV-001; native final acceptance and external services remain separate gates. No current Figma parity assertion.
- Documentation: current state, generated task ledger, handoff, progress and existing storage boundaries synchronized.
- Integration: no configured remote; this is locally prepared PR text. Hosted PR, required checks, CODEOWNERS identities and protected-main settings have not been fabricated.

Remote reviewers should compare against the explicitly reviewed source candidate. Stable-main promotion requires the separate T0 integration acceptance, including the pre-existing source changes captured in that candidate.
