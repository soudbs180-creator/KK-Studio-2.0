# Plan

1. Recover and record current branch, dirty state, architecture, feature evidence, and launch blockers.
2. Add the governance index and contribution/PR templates, reusing existing docs as sources.
3. Add executable CI, ESLint, ledger validation and import boundaries; resolve baseline lint failures without disabling rules. Add `.worktrees/` to the repository ignore contract.
4. Update the stale README Figma pointer.
5. Fix expired cooldown scheduling and add focused regression coverage.
6. Run focused regressions and the full verify command, plus Rust tests/format and Tauri compile. Review the diff, commit only scoped files, verify a clean checkout, and update the ledger/handoff.

Dependency graph:

```text
Audit -> governance docs -> executable gates
                         \-> cooldown fix -> focused regression
All changes -> full verification -> self-review -> task commit
```
