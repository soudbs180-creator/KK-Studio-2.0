# Independent review: whole-prefix recovery repair

**Conclusion: PASS for the reviewed local image-edit recovery repair. IM-011 (P1) CLOSED at this exact head.** No new actionable P1/P2 finding was reproduced. This review does not imply a push, PR, merge, publication, paid-provider quality, physical-Mobile verification or user visual acceptance.

- Reviewer: independent read-only Codex collaboration context `/root/mask_review`; did not implement the repair or change tracked files, Git state, other checkouts or user data; no agents spawned.
- Completed: 2026-10-08 15:38:25 UTC / 2026-10-08 23:38:25 +08:00 Asia/Shanghai.
- Review mode: actual-source/diff audit plus independently executed targeted Node tests and full valid-PNG reconciliation fixtures; not static-only.
- Exact service-side model version: **UNKNOWN**; no verifiable exact identifier was exposed. Tools: `functions.exec` / `exec_command`, PowerShell 7.6.5, Git 2.55.0.windows.5, Node v24.20.0 and TypeScript 5.9.3, with installed worktree dependencies.
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001`.
- Total base: `78cea37af9359fd2d9f58f2854525516deee8a06`.
- Focus increment base: `17ef724e14a1b2924d6f8f7dbd12fb25f6443e8d`.
- Reviewed head: `64c8b9d168308ff1aefff39daf7126c56e354eef`; independent `git rev-parse HEAD` and empty `git status --porcelain` confirmed before and after checks.

## Inputs, rules and scope

Reread applicable AGENTS/AI_RULES/REVIEW, current intent/spec/plan/verification/review and ADR-010. Revisited the original unified-Mask intent and the Chinese requirement attachment `C:/Users/Administrator/.codex/attachments/53cab66e-6237-458c-bcce-e5a14e6507fa/已粘贴的文本.txt`, including original-pixel coordinates, immutable layers, ordinary whole-image continuity, recovery and outside-region protection. The direct authorized local task controls scope; no new approval stage was inferred from the pasted workflow.

| Current input | Git blob SHA |
| --- | --- |
| `AGENTS.md` | `0771bc63c13276fbe12f4deea92a1add7befaa22` |
| `AI_RULES.md` | `a39b009e1efb55531b59bdf39debf9dc42bfc9b0` |
| `docs/engineering/REVIEW.md` | `08ce14fb5033758c38de9125f9f80625cdb87914` |
| change `intent.md` | `2cbb02e641c52163f39d40593a464f6878921f51` |
| change `spec.md` | `59cbb950ff5c42f8a598466c358e3d38a9fc5cc8` |
| change `plan.md` | `f284234aac5f187fafd55cb37edccf7ba049264d` |
| `ADR-010-unified-image-mask.md` | `2e31cf8c6b83a127180a7493d8fef5aa0005d7ad` |

Read actual `17ef724..64c8b9d` Git diff and surrounding implementation rather than relying on the author's summary. The increment is 14 files: only `src/features/image-edit/recovery.ts`, `tests/unit/imageEditRecovery.test.ts` and 12 documentation files. The total-base scope retains the previously reviewed Mask/request/composition/schema/task-host/package implementations; no other product, config, version or test file changed in this increment. Rechecked the real prompt compiler, decoder, native receipt validation/reconciliation, original/archive preservation and clear/history path. The focused repair uses the existing formatter and native role marker, introduces no new dependency, permission, service or state source, and remains in the same unreleased candidate version.

## Stable findings

| ID | Severity | Exact-head state | Basis |
| --- | --- | --- | --- |
| IM-001–009 | Original P1/P2 severities retained | CLOSED, prior scope retained | Historical exact-head reviews remain preserved; this recovery increment does not change those implementations. |
| IM-010 | P2 | CLOSED, retained | Shared Web/Rust allowlists and package handling are unchanged; current Node schema-vector/package checks pass. Prior independent 82b7490 Rust evidence is retained, not rerun by this reviewer. |
| IM-011 | P1 / previous merge and release blocker | **CLOSED** | Both the old region-opinion suffix collision and the independently reproduced long-root dual-compilation case now quarantine before raw reads/publication; normal supported whole-image recovery remains compatible. |
| IM-012 | P2 | CLOSED, retained | Clear uses the same undo/redo commit, preserves original and remaining context/counters, and is unchanged in this increment. Existing browser/native evidence remains bound; archive/user-draft preservation was independently rerun. |
| IM-013 | P2 | CLOSED, retained | Empty-composer preflight placeholder remains separate from real per-crop input; prompt path unchanged and targeted checks pass. Prior browser closure is retained, not rerun here. |

The new guard derives canonical local/whole body heads from the same formatter and scans the **entire prefix before the last bound whole-image body**, before any exact recompilation acceptance. The check includes the budget-truncated root as well as recent text; the local head at position 452 can no longer hide inside the inferred 1526-character whole prefix. Known current-instruction text is inside the bound body, so its template quote remains compatible. Root/recent with a complete canonical head at a line boundary is now treated as ambiguous legacy data and becomes unknown; an independently persisted `imageEditRequired=false` remains sufficient to accept actual whole-image tasks with quoted templates. True, conflicting, missing and malformed roles retain the existing conservative checks.

The change from the earlier root/current quote success test to an explicit false marker is justified by the independently proved ambiguity and is documented in plan/spec/ADR. The original template input and strict succeeded assertion remain; new tests separately require legacy root/recent ambiguity to be unknown, preserve ordinary root wording/current quotation compatibility, and verify the dual-compiler failure input. No data-protection assertion, skip or retry threshold was relaxed to make the repair pass.

## Independent executions

All new logs, exit files and fixture copies are in `D:/kk-studio/output/unified-image-mask-20261008/review-followup-probes-64c8b9d/`.

| Command / fixture | Independent result |
| --- | --- |
| `node --test tests/unit/imageEdit.test.ts tests/unit/imageEditSnapshot.test.ts tests/unit/imageMaskAnnotation.test.ts tests/unit/imageEditRecovery.test.ts tests/unit/imageEditSchema.test.ts tests/unit/projectPackage.test.ts tests/unit/nativeTaskHost.test.ts` | exit 0; **93/93**, zero failures/skips; `node-targeted.log` and `.exit.txt` |
| `node <new probes>/root-budget-complete-recovery-protected-fields.mjs` | exit 0; same 4000-character root/1580-character current/3822-character real local prompt as the failed 17ef724 case; decoder succeeds before removal of only imageEdit; unknown, no raw read/publication/resubmit, original and all protected source fields retained |
| `node <new probes>/legacy-whole-suffix-collision-quarantined.mjs` | exit 0; the valid 8×8 source, 4×4 crop/raw, transparent Mask and annotation fixture from 82b7490 remains unknown, with no raw read/publication/resubmit and unchanged original |
| `node <new probes>/published-composite-intact-checked.mjs` | exit 0; archived 8×8 composite and its user-owned draft unchanged; succeeded, no raw-crop read or resubmit |
| `node <new probes>/published-composite-missing-checked.mjs` | exit 0; missing required local snapshot yields unknown while the archived successful composite and user-owned draft remain unchanged; no raw-crop read or resubmit |
| `npx tsc --noEmit` | exit 0; `typecheck.log` / `.exit.txt` |
| `npx prettier --check src/features/image-edit/recovery.ts tests/unit/imageEditRecovery.test.ts` | exit 0; `format-targeted.log` / `.exit.txt` |
| `git diff --check 78cea37af9359fd2d9f58f2854525516deee8a06..64c8b9d168308ff1aefff39daf7126c56e354eef` | exit 0 |

The root-budget probe retains the old independently built substantive input. Its candidate selection was fixed to the original 1580-character case because selecting only prompts accepted by the guard would otherwise fail before exercising a corrected guard. Exact current, root, prompt and local/whole root lengths are asserted equal to the preserved 17ef724 seed. The PNG bytes, source/crop/mask/annotation roles, real compile/formatter, intact decoder and removal of only imageEdit remain intact. New explicit assertions require unknown submission state, absent raw asset/result, no submit, identical asset/preview and identical remaining source fields. All Tauri IPC is intercepted in memory and unexpected commands are rejected; no real credentials, provider, user profile or data root are used.

93 tests separately cover normal legacy/marked whole-image editing, inherited asset tags and literal local-protection wording; quoted templates in confirmed root/current; canonical bodies in legacy root/recent with unknown versus explicit-false outcomes; ordinary root wording and a bound current quote; both trim budgets, whitespace recent, actual truncation, unbound prefixes/missing instruction; malformed roles and required snapshots. The archived-composite fixtures test valid complete PNG snapshots and preserve the result's mask draft and user prompt without overwriting them. Static clear/history inspection confirms the clear operation updates only the unified Mask document, retaining counters and using undo/redo; the decoded original is separate and not mutated. This reviewer did not rerun browser clear interaction.

### Preserved probe-assertion correction

The first new root-budget execution (`root-budget-complete-recovery-quarantined.mjs` and its log/exit 1) already showed correct unknown/no-raw behavior but failed an **extra assertion added by this reviewer** demanding the entire source item be equal. Its only difference was `generationStatus: pending → error`, the expected task-status presentation in unchanged `nativeTaskHost.ts:732–758`. That UI status field is not original pixel/draft data. The first script/log were preserved. A separate corrected script explicitly requires error presentation and deep-compares every other source-item field, in addition to all unknown/no-raw/no-resubmit assertions; it passes. No tracked test or implementation was changed, and this correction does not hide a product failure.

## Source and artifact identity

Independently hashed every declared file rather than substituting the author's own binding:

- `run-followup-IM011-prefix/source-manifest-prefix.json`: `526219d931b360dd7a3264e4c0fa019b1f8b79d0e5cd584f2fa9a4d084d6923a`.
- **71/71** current source/config/test file hashes match; **22/22** preserved artifact hashes match.
- Current `dist/assets/index-BC59cAkv.js`: `bb763f27d3ea8cfd4d26e3fbb2f7429b08eecf82946736ca0a69975207f3a829`.
- Current `src-tauri/target/release/kk-studio.exe`: `b4cbcaaf7fe7614977960275aecdfae440cb31e95ecb870e1d2e0131e5a80d7d`.
- Both equal the manifest's observed production Desktop script/executable hashes. The original verified dirty-run receipt/manifest starting head remains **17ef724**; `commit-binding-prefix-64c8b9d.json` separately binds the unchanged verified bytes to this clean commit. No sourceHead was rewritten.
- `independent-byte-binding.json` records each expected/actual hash, exact head, clean status and diff-check exit. `probe-origins.json` records the previous independent fixture hashes, rechecked after execution.

The author reported full verify root775/783 (original skip8), Agent172/174 (original skip2), Browser423/423 without retries/flaky, Rust102, fresh release/Desktop and eleven native lifecycle groups. The manifest contains matching production entry `src/main.tsx`, loaded script, two PNG Mask requests, four package assets, clear/undo/redo, source deletion/regeneration/restart, durable true roles, outside-mask changed=0 and credential conflict/cleanup evidence. I checked artifact and actual binary identity but did **not** rerun these full browser/Rust/native pipelines or count the author's results as my own independent executions.

## History and remaining boundaries

The formal `review-followup-17ef724.md` remains CHANGES REQUIRED with SHA-256 `72616f75bf7b0fcdd8bf869f58ab84f4fcf06b8776a91b1d5b152ae16a575d6f`. Its tracked copy is equal after documented line-ending/EOF normalization. The preliminary superseded PASS remains unchanged with SHA-256 `21cd84d943eb2f5fe521f80aca67b44b1cbd0432af68d8e9e600ce62ec4af6f9`. Prior formal reports, failed PNG scripts/logs and the platform-interrupted attempt were not overwritten or treated as current PASS evidence.

Real paid Provider quality, arbitrary semantic/geometric drift detection, physical phone gesture/keyboard behavior and user visual acceptance were not verified. FEAT-035 remains PARTIAL and TASK-IMAGE-EDIT-VERIFY-002 remains TODO. Inferring a legacy role after its independent marker and all relevant browser context have disappeared, or arbitrary multi-field forgery, remains outside the proven contract. Unknown recovery does not automatically resubmit. No push, merge, release or user-data deletion was performed by this reviewer.

IM-011 is closed for the reviewed committed local repair. Documentation may now record this exact-head result; a subsequent head requires an appropriate new review.
