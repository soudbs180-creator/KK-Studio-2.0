# Review

Status: final production SOURCE PASS at `6f8ff257e8996eaf11ca4446e8781dd10d9aa1d9`; test-only supplements PASS at `59c013ce478d1a4c556da82067b0d69aa625ad4e` and `1cf93cb42ba335e3197d5c282cac33749358c524`. Delivery-document supplement PASS at `b3bdc3d29d0a2912bda4d2d0ac7a85b8bb6100c1`. Baseline: `e0875b3d3f595a5570702a6ff3e45b8b76b5c861`. Earlier CHANGES REQUIRED results below are not retroactively called PASS.

- IR-001 P1: two windows can both report success with mismatched metadata/key/cache. CLOSED: native shared transaction and same-profile cache lock serialize the complete save boundary.
- IR-002 P1: Google recovery can overwrite an existing native account's model/health. CLOSED: recovery inserts only missing metadata; regression passes.
- IR-003 P2: an owned failed empty preparation cannot retry. CLOSED: conditional server retry checks source client, conversation ID/revision and absence of a thread; owned/foreign regressions pass.
- IR-004 P2: cache failure after vault commit misreports credential state and retains secret draft. CLOSED: committed-state errors and lifecycle fences preserve saved/missing truth; regressions pass.
- IR-005 P2: persistence contract lacked an ADR. CLOSED: ADR-016 records identity, ownership, lock, compatibility and failure boundaries.

The second pinned review at `d0fba4af6a5dbf6506c1ad5417a684c1f7dad889` closed IR-001 through IR-005 and found the remaining blockers below. The `6f8ff257` reviewer verified their fixes and the CLI preference-save follow-up, found no remaining task P1/P2 issues, and ran 52 targeted tests with exit 0.

- IR-006 CLOSED: the actual Google preference writer swallowed storage failure and reported complete success although reopen retained CLI mode. The writer reports its result; actual component/hook/writer regressions distinguish saved credentials from incomplete preference persistence, preserve failed uncommitted drafts and clear committed drafts.
- IR-007 P1 CLOSED: filtering invalid native metadata could erase original connections on the next save. The durable reader rejects the entire invalid array; all-invalid, mixed-validity and non-array read/restore/save regressions preserve native/cache/vault without mutating IPC. A valid empty array still clears stale cache.
- IR-008 CLOSED: an owned failed conversation with a thread only read history and could never recover preparation. A single reconnect resumes the same thread when no work or approval is outstanding. Recovery and refusal regressions pass without a new thread or turn.

Associated browser fixtures now implement the real transaction receipt and synthetic vault across reload. Late-request UI tests verify disconnect is disabled during work, wait for authoritative idle, then retain the original reconnection and delayed-response fences. Both related specs: 25/25 PASS, zero retries/flaky. The initial full browser run was interrupted; a later diagnostic run exposed these outdated fixtures and was stopped only through its identity-checked owned process tree. Neither is counted as final complete PASS.

The `59c013ce` supplement changes three test files only; production `src`/`src-tauri` trees remain identical to `6f8ff257`, transaction/busy/cache/draft/fencing assertions are retained, and script syntax/diff checks pass. Source approval does not substitute for the full 514/514 browser and real native evidence in [verification](verification.md).

The `1cf93cb4` reviewer confirmed that the 24-line test guard isolates only unrelated credentials; the owned reference, runtime, health and thread commands stay native, and existing assertions remain intact. Syntax, diff and production-tree comparisons exit 0. The reviewer did not rerun browser/native acceptance. [Independent source/test receipt](evidence/independent-source-review.json).

[Independent delivery review](evidence/independent-delivery-review.json) binds the final evidence package and fixes to `b3bdc3d2`, with no open finding. The reviewer independently checked 712 actual files plus two matching absent-input markers, staged-content preservation and the scoped governance update. The initial 714-file count assertion is retained as a corrected counting error. Hosted CI, signing and human acceptance are separate and are not claimed. Original dirty content and staged index remain preserved; local SOURCE PASS implies no main merge or push.
