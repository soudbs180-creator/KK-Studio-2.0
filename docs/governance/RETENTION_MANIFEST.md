# Retention manifest

Updated 2026-10-10. This manifest records retention intent; it does not authorize deletion or move operations.

| Class | Examples | Retention rule |
| --- | --- | --- |
| Current authority | `AGENTS.md`, `AI_RULES.md`, `docs/governance/PROJECT_STATE.md`, `task-ledger.json`, feature registry, architecture contracts | Keep versioned and review changes through the normal PR flow. |
| Generated views | `docs/governance/TASK_LEDGER.md`, `docs/features/README.md` | Keep synchronized by the named generator; do not hand edit. |
| Dated evidence | `docs/changes/`, `docs/evidence/`, verification logs and screenshots | Keep source/date/commit scope; append corrections rather than rewriting history. |
| Historical archive | `docs/archive/`, historical UI records, old change packages | Read-only reference; do not use as current state. Duplicate files remain addressable through the archive index until a separate deletion task is accepted. |
| Competitor snapshots | `docs/reference/competitor/`, external `D:/kk-studio/output/` evidence | Retain as read-only research with limitations and provenance. |
| Runtime user data | `%APPDATA%\kk-studio`, `%USERPROFILE%\.kk-memory`, provider credential vault | Outside repository retention; preserve user ownership and privacy. |
| Recovery material | `D:/KK-Studio-recovery-20260921` | Keep external and read-only; restore only to a new verified directory. |
| Loose parent Markdown | `D:/kk-studio/*.md` such as `KK-豆包集成设计方案.md` | Review provenance and references before moving into `KK-Studio-2.0/docs/reference/` or `docs/archive/`; no automatic move. |
| Excluded from commits | API keys, OAuth tokens, credential stores, complete memory files, node_modules, build caches, `dist/`, `target/`, transient logs | Never add to source or evidence packages. |
| Package-manager artifact quarantined 2026-10-10 | `D:/kk-studio/.verification/governance/pnpm-lock.yaml.20261010` | Generated ignored lockfile moved out of the primary checkout; SHA-256 `EC2CDDC668DA3E825D96FF51AD25CD79D2365DE327D816BA13955CBAAE6A085C`; restore only if an owner explicitly selects pnpm. |
| Package-manager artifact re-quarantined 2026-10-10 | `D:/kk-studio/.verification/governance/pnpm-lock.yaml.regenerated-20261010-99A1B6275799.yaml` | A second ignored lockfile generated after the earlier quarantine was moved out of the primary checkout with SHA-256 `99A1B62757992ABD34B586A1FAFD1289AC77EB2AD5D63BB3B2B9FF7F965E2903`; restore only if an owner explicitly selects pnpm. |
| Worktree generated evidence backup 2026-10-10 | `D:/kk-studio/.verification/governance/TASK-VERIFY-CONCURRENCY-002-tmp-4a990be8c98c54bd` | 27 files / 4.05 MB copied with per-file SHA-256 manifest before pruning the generated `.tmp` directory from the clean, inactive worktree; restore only through the matching immutable plan and apply result. |

Large file-level recovery inventories may be kept in `D:/kk-studio/.verification/governance/` rather than committed to the source repository; the committed apply result and immutable plan pointer remain the audit entry points.

Completed-worktree checkout removal is recorded in `worktree-reclamation-plan-*.json`; branch refs and commits remain. No source, user data, or dirty worktree is removed by this governance change; generated evidence is only pruned after a recoverable copy and SHA manifest. Retention decisions must preserve rollback and user data.
