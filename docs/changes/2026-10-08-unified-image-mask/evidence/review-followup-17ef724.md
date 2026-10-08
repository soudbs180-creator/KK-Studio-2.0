# Independent review: image-edit recovery follow-up

**Conclusion: CHANGES REQUIRED. IM-011 (P1 / merge-blocker and release-blocker) remains OPEN.** Independent complete-PNG recovery reproduces a further role-ambiguity path that publishes an uncomposited raw crop; the initial passing cases do not close the defect. This conclusion binds only to the committed head below; it does not approve pushing, merging, publishing, real-provider quality, physical-Mobile behavior or final user acceptance.

- Reviewer: independent read-only Codex collaboration context `/root/mask_review`; did not implement this repair or edit engineering files, Git state, another checkout or user data; no agents spawned.
- Completed: 2026-10-08 15:08:50 UTC / 2026-10-08 23:08:50 +08:00 Asia/Shanghai.
- Exact service-side model version: **UNKNOWN**; no verifiable model-version identifier was available. Tools used: `functions.exec` / `exec_command`, PowerShell 7.6.5, Git 2.55.0.windows.5, Node v24.20.0 and TypeScript 5.9.3; tests use the installed worktree dependencies.
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001`.
- Total base: `78cea37af9359fd2d9f58f2854525516deee8a06`.
- Focus increment base: `82b7490da6102092fdd240ff2e7dc69cdc1cc9d7`.
- Reviewed head: `17ef724e14a1b2924d6f8f7dbd12fb25f6443e8d`; independently read `git rev-parse HEAD` and empty `git status --porcelain` before and after checks.

## Inputs and rule identity

Independently reread applicable AGENTS/AI_RULES/REVIEW/PROMPTING, current project state and this change's intent/spec/plan/verification/review; read the original Chinese requirement attachment `C:/Users/Administrator/.codex/attachments/53cab66e-6237-458c-bcce-e5a14e6507fa/已粘贴的文本.txt`. The direct unified-Mask request, immutable original, safe composition, reversible history, recovery, bounded context and compatible whole-image editing define this audit. The attached workflow text does not add an approval stage to ordinary authorized local work.

Current Git blob identities:

| Input | Blob SHA |
| --- | --- |
| `AGENTS.md` | `0771bc63c13276fbe12f4deea92a1add7befaa22` |
| `AI_RULES.md` | `a39b009e1efb55531b59bdf39debf9dc42bfc9b0` |
| `docs/engineering/REVIEW.md` | `08ce14fb5033758c38de9125f9f80625cdb87914` |
| change `intent.md` | `2cbb02e641c52163f39d40593a464f6878921f51` |
| change `spec.md` | `6b8a28045626310abc22cc787cffd02a8b94a8a3` |
| change `plan.md` | `3ff4eee6da22e3cd4ce9cafc6a04246c43a42741` |

Read actual Git diff and surrounding code, including total-base comparison, the prior repair increment, `82b7490..17ef724`, `recovery.ts`, the real prompt compiler, snapshot validators/decoder, native receipt validation/reconciliation and its archived-output handling. Rechecked the existing clear/history and per-crop prompt paths and the independent Rust role/fingerprint boundary. The focus increment has 14 files: `recovery.ts`, `imageEditRecovery.test.ts` and 12 documentation files; other product/config/version/test files are unchanged from 82b7490. This repair uses the existing compiler and recovery contract, adds no service, dependency, permission or second state source, and leaves the same unreleased candidate versions unchanged.

## Findings and closure

| Stable ID | Severity | Exact-head state | Evidence and rationale |
| --- | --- | --- | --- |
| IM-001–009 | Original P1/P2 severities retained | CLOSED, previous scope retained | Historical reports are preserved; this repair does not change those implementations. No reopening found in the reviewed recovery increment. |
| IM-010 | P2 | CLOSED, retained | 82b7490 independent closure retained; shared schema allowlist/optional-field/package code is unchanged. Current targeted Node checks include strict shared vectors and package checks. This reviewer did not rerun its prior Rust matrix. |
| IM-011 | P1 / merge-blocker and release-blocker | **OPEN** | The old short-root suffix fixture now passes, but a valid long-root prompt has both local and whole-image compiler interpretations. Role-dependent root truncation hides the local body inside the inferred whole-image prefix. Removing only `imageEdit` from a valid decoded local task still causes `asset_read`, succeeded and publication of the raw 4×4 crop instead of an 8×8 composite. See the independently failing reproduction below. |
| IM-012 | P2 | CLOSED, retained | Existing reversible clear operation is unchanged; static inspection confirms drawing cancellation plus unified history commit preserves the remaining document/context. Its 82b7490 browser/native closure is retained, not rerun here. |
| IM-013 | P2 | CLOSED, retained | Empty-composer preflight placeholder remains separate from the actual input used by per-crop compilation; unchanged path inspected and targeted prompt tests pass. Its 82b7490 browser closure is retained, not rerun here. |

The passing IM-011 baseline cases were checked separately: ordinary generation with no editing context remains compatible; normal legacy whole-image edits recover; known root/current may quote the editing template; recent text with whitespace or actual truncation uses the compiler's exact budget; an ambiguous second body in recent text is quarantined unless the durable receipt explicitly proves whole-image role. Missing `lastInstruction`, an unbound prefix, malformed native markers and missing/invalid required local snapshots remain `unknown`. In those passing quarantine cases, no crop was read, no candidate was added and no replacement request was submitted. The new dual-compilation case bypasses quarantine.

Independent complete-PNG reconciliation probes also preserve an already archived 8×8 composite and its user-owned draft byte-for-byte in the decoded item object. With the local snapshot intact, the task remains succeeded and reads only the archived composite; with only the local snapshot removed and durable required=true, the task becomes unknown while its archived successful output and user draft survive. The original asset/preview and item list are unchanged in both cases.

## Blocking finding: IM-011 remains P1 OPEN

Location: `src/features/image-edit/recovery.ts:32–44` (prefix inference, extracted recent-text check and final whole-prompt equality), reached through `editReceiptReason` at line 66 and native receipt validation before reconciliation.

The legacy compiler does not encode an unambiguous boundary or task role in user-controlled text. The root prefix length depends on the required body size, which differs for local and whole-image compilation. The same legal prompt can therefore equal a whole-image recompilation while having actually been produced by the real local compiler. Checking a second compiler body only in the inferred recent field misses the local header swallowed by the longer inferred root prefix.

Independent reproduction (`mask_review/root-budget-complete-recovery-regression.mjs`, source SHA-256 `9c1e6f0c8edf107e6f477ef121fc8b4ac157c1b5cb35675a219612ed22c6489a`):

1. Use the prior reviewer fixture's actual CRC/SHA-valid 8×8 original, 4×4 crop/provider result, transparent PNG Mask and separate annotation.
2. Independently construct a 4000-character original prompt, 1580-character saved current instruction and a color opinion beginning `教程引用\n`, followed by the whole-image body except its common last role line. Use **actual `compileEditPrompt` and `formatEditPrompt(local:true)`**, total prompt length 3822. Project initial input and saved context use the same original prompt.
3. The full snapshot passes `decodeSnapshot` with its local edit snapshot and mask/crop geometry intact. Clone it and delete **only** `imageEdit`; retain prompt, saved current/root, source/crop/annotation references and consistent task/native identities. The native receipt is a genuine legacy-shape fixture with no composition marker, not a malformed false marker.
4. Run real `reconcileNativeTasks` with all IPC intercepted in memory. Actual commands: `task_host_list`, `task_host_get`, then `asset_read` for the 4×4 provider crop. Actual state is **succeeded**, with a new raw 4×4 result; required state is **unknown**, with no raw read or publication. The original 8×8 asset remains archived, but the delivered result lacks original-sized composition and outside-region protection.
5. The guard assertion requiring unknown fails (exit **1**). This is a reproduced recovery error, not a parser-only concern, arbitrary deletion of several fields, invalid PNG, broken snapshot identity, real external operation or provider-quality judgment.

The additional independent `root-budget-dual-compilation-diagnostic.mjs` asserts that this exact local prompt also equals a whole-image recompilation. It measures local-root length 424 versus whole-root length 1500, inferred prefix length **1526**, local header at position **452**, inferred recent length **598**, and no local header in that inferred recent text. It then reproduces the same raw publication and fails the same protection assertion (exit 1). Both logs and exit files are preserved beside their scripts.

Suggested correction: do not treat equality to one possible whole-image recompilation as proof of a unique whole-image role. Reject this ambiguous dual-compilation class or rely on independent durable role evidence; otherwise retain unknown and preserve existing original/results/drafts. Add the complete-PNG case as a real decoder/reconciliation regression, covering the long-root budget boundary and newline-prefixed quoted body. Retain compatibility for independently marked whole-image tasks and unambiguous supported legacy cases; do not infer role from shared asset tags or automatically resubmit unknown work. No implementation change was made by this reviewer.
## Independently executed checks

All new execution evidence is under `D:/kk-studio/output/unified-image-mask-20261008/review-followup-probes-17ef724/mask_review/`.

| Command / probe | Result |
| --- | --- |
| `node --test tests/unit/imageEdit.test.ts tests/unit/imageEditSnapshot.test.ts tests/unit/imageMaskAnnotation.test.ts tests/unit/imageEditRecovery.test.ts tests/unit/imageEditSchema.test.ts tests/unit/projectPackage.test.ts tests/unit/nativeTaskHost.test.ts` | exit 0; **91/91**, zero failures/skips; `node-targeted.log` and `.exit.txt` in this reviewer's subdirectory |
| `node <own probes>/legacy-whole-suffix-collision-quarantined.mjs` | exit 0; real CRC/SHA PNG source 8×8, crop/raw 4×4, transparent Mask and annotation; real local compiler; intact snapshot decoder first succeeds; only `imageEdit` removed; unknown, no result/raw read/resubmit and original unchanged |
| `node <own probes>/published-composite-intact-checked.mjs` | exit 0; archived composite and user draft unchanged; succeeded, no raw-crop read or resubmit |
| `node <own probes>/published-composite-missing-checked.mjs` | exit 0; archived composite and user draft unchanged; unknown, no raw-crop read or resubmit |
| `node <own probes>/root-budget-complete-recovery-regression.mjs` | **exit 1 / RED**; independently constructed valid local task becomes succeeded and publishes raw 4×4 after removal of only its edit snapshot; expected unknown |
| `node <own probes>/root-budget-dual-compilation-diagnostic.mjs` | **exit 1 / RED**; exact local/whole compiler equality and swallowed local header proven, followed by the same failing recovery assertion |
| `npx tsc --noEmit` | exit 0; `typecheck.log` / `.exit.txt` |
| `npx prettier --check src/features/image-edit/recovery.ts tests/unit/imageEditRecovery.test.ts` | exit 0; `format-targeted.log` / `.exit.txt` |
| `git diff --check 78cea37af9359fd2d9f58f2854525516deee8a06..17ef724e14a1b2924d6f8f7dbd12fb25f6443e8d` | exit 0 |

The complete-PNG probes are new independent copies of the valid 82b7490 reviewer fixtures. Only the collision copy's final assertions were changed to require quarantine and original protection; the two archived-result probes were copied unchanged. Their original file hashes were recorded in `probe-origins.json` and checked again after execution. Each probe intercepts all Tauri commands in memory and rejects unexpected calls; no real IPC, credentials, provider or user data was accessed. These fixtures prove local validation/reconciliation behavior, not model visual quality.

## Byte and evidence binding

Independently recomputed, rather than relying on the author's binding:

- `run-followup-IM011-parser/source-manifest-parser.json` SHA-256: `3d47b88b5267365d88770537f7ffeeb293b8b80c48ea552851516c95c7cb7b1e`.
- **71/71** current source/config/test file hashes match that manifest; **23/23** preserved artifact hashes match.
- Current `dist/assets/index-CufFqG9V.js`: `63ec6afa3c49e7523c90864b2cfa8462e008165ed5e1e92bb0fa2c1c52353295`.
- Current `src-tauri/target/release/kk-studio.exe`: `bd7cb954db4cffd16966e620519839d9c88987acfd2c03240185e9b1b485f066`.
- These actual binary hashes equal the manifest's production Desktop script/executable hashes; original receipts retain their verified dirty-run starting head 82b7490. The separate `commit-binding-parser-17ef724.json` correctly binds the unchanged verified bytes to the clean committed head; it does not rewrite an old receipt's sourceHead.
- Independent full comparison results: `mask_review/independent-byte-binding.json`, including each expected/actual hash, head, clean status and diff-check exit.
- Previous independent `review-followup-82b7490.md` remains unchanged with SHA-256 `a7e19e47fc13e1823e095578507f9671cea61a12c4e69722b7572f5fd5f306f3`; its CHANGES REQUIRED remains historical. `review-1527b48.md`, `review-dbc88bb.md` and `review-final-head.md` were not rewritten.

The author reported full root773/781 (original skip8), Agent172/174 (original skip2), Browser423/423 with zero retries/flaky, Rust102, fresh release/Desktop and 11 native lifecycle groups. I checked their preserved artifact/binary identity; I did **not** rerun those full suites or replace my own result with their counts. Unchanged 82b7490 Web/Rust/UI scope retains that other independent review's stated evidence.

A prior 17ef724 attempt was interrupted by the platform and produced no formal conclusion. Its top-level `review-followup-probes-17ef724/node-targeted.*` files and interruption JSON were not overwritten, counted as this reviewer's work, or treated as PASS/FAIL.

## Limits

Real paid providers, arbitrary semantic/geometric drift detection, physical phone gestures/keyboard and final user visual acceptance were not verified. FEAT-035 remains PARTIAL and TASK-IMAGE-EDIT-VERIFY-002 remains TODO. This audit does not claim to infer a legacy task's role when its independent marker and all relevant browser context have simultaneously disappeared, or to protect arbitrary multi-field forged snapshots. No push, PR, merge, publishing or user-data deletion was performed.

IM-011 remains OPEN and blocks accepting this repair for merge/release. The author may repair within the already authorized local task; a new clean committed head needs independent reproduction and review. The passing suite totals do not override this concrete failing recovery probe.

## Preliminary record superseded before delivery

An initial PASS file was written after the 91 tests and the three passing baseline PNG probes, before the author's new long-root/newline signal arrived. It was not delivered as the final review. Its original bytes were copied to `mask_review/review-followup-17ef724-preliminary-superseded.md` (SHA-256 `21cd84d943eb2f5fe521f80aca67b44b1cbd0432af68d8e9e600ce62ec4af6f9`), and this receipt was immediately marked UNDER REVIEW. After the independently constructed failing full recovery probe, this exact-head final report supersedes that preliminary PASS with CHANGES REQUIRED. The prior platform-interrupted attempt and all historical formal reports remain separate and untouched. The reviewer used the systematic-debugging skill to trace the compiler/recovery boundary before recommending correction.
