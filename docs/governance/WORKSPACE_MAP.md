# Workspace map

Updated 2026-10-09. Paths are local audit locations; they are not portable runtime identifiers.

| Area | Audited path | Status and handling |
| --- | --- | --- |
| Repository source | `D:/kk-studio/KK-Studio-2.0` | Canonical repository named by project rules. |
| Parent container | `D:/kk-studio` | Container only; do not treat it as a second repository. |
| Governance worktree | `D:/kk-studio/.worktrees/TASK-GOV-20261009-reorg` | Removed after the governance commits were merged into the primary checkout; branch and commits remain in Git. |
| Product source | `src/`, `src-tauri/`, `vendor/`, `config/` | Current implementation inputs. |
| Tests | `tests/` | Current verification inputs; test output remains scoped to its command/source. |
| Governance | `docs/governance/` | Current maps, state, ledger, and handoff. |
| Change evidence | `docs/changes/<date>-<task>/` | Dated, scoped evidence; historical unless linked by current state. |
| Reference evidence | `docs/reference/` | Read-only research/reference index; competitor catalog is under `docs/reference/competitor/`. |
| External audit output | `D:/kk-studio/output/` | Evidence staging outside the repository; retain provenance, never treat it as source code. |
| User data | `%APPDATA%\kk-studio`, `%USERPROFILE%\.kk-memory` | Runtime data; never copy into the repository or worktree. |
| Recovery archive | `D:/KK-Studio-recovery-20260921` | External read-only recovery source per project rules. |

The only approved location for new KK Studio worktrees is `D:/kk-studio/.worktrees`. Worktrees nested under `KK-Studio-2.0/.worktrees` and worktrees under `%USERPROFILE%\.codex` are inventoried and protected; they are not moved automatically because their owners and dirty state must be reconciled first.

The root checkout may contain user dirty files and is outside this task's write scope. Do not reset, clean, move, delete, or overwrite it. Worktree paths recorded in the ledger are historical task ownership records and may no longer exist.
