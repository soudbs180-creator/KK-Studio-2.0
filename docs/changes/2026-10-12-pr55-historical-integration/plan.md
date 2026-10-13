# Plan

1. Preserve the original PR #55 head and all existing worktrees.
2. Change the delivery checker to recognize only an explicit historical marker and keep future packages strict.
3. Add a complete package and a ledger record for this repair, with the historical package list marked for audit.
4. Replace Windows `realpath()` spelling comparison with direct link metadata and run targeted policy and desktop tests.
5. Obtain an independent exact-head review, then update the existing PR branch by fast-forward push only.
