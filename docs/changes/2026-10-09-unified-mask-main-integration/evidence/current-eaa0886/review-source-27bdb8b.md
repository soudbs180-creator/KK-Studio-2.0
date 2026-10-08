# Independent source review: unified Mask / latest-main integration

- Task: TASK-IMAGE-EDIT-001.
- Reviewer: independent read-only Codex collaboration context /root/continuation_review; did not implement this Mask integration or spawn agents. Exact service-side model identifier UNKNOWN.
- Time: 2026-10-09 01:00 +08:00 / 2026-10-08 17:00 UTC.
- Worktree: D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001.
- Branch: codex/TASK-IMAGE-EDIT-001-unified-mask.
- Exact review base: 1d6f640ac6f3a1e7af32c38d85596527704dc54a.
- Exact review head: 27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a.
- Parents independently confirmed: e7cfd285366fdb12902dd9bfe809069f29393281 and 1d6f640ac6f3a1e7af32c38d85596527704dc54a.
- HEAD and empty tracked status confirmed before and after reviewer checks. Only this new external receipt is written; no project/source/Git/user-data change.
- Tools: functions.exec / exec_command, Git, PowerShell, Node v24.19.0, installed TypeScript and isolated vm contexts.

## Inputs and rule binding

Read current AGENTS.md, AI_RULES.md, PROMPTING, REVIEW, VERSIONING, UI_INDEX and UI_RULES; reviewed original Mask intent/spec/plan, ADR-010, original 64c8b9d source review and external e7cfd28 final-document review, latest-main integration intent/spec/plan/verification/review, current project facts, actual fixed-SHA diffs and surrounding implementation. Previously read DEVELOPMENT/SDLC/BRANCH-POLICY are unchanged from the prior reviewed 2cb73d base. Historical reviews were read as evidence of their own exact scopes and not renamed for this merge.

| Rule/input | Current Git blob |
| --- | --- |
| AGENTS.md | 0771bc63c13276fbe12f4deea92a1add7befaa22 |
| AI_RULES.md | a39b009e1efb55531b59bdf39debf9dc42bfc9b0 |
| REVIEW.md | 08ce14fb5033758c38de9125f9f80625cdb87914 |
| integration spec | d95222ad2f21fabdfdce89a97101d60e66740f4e |
| ADR-010 | f8402453f161a682329221fe0bfb9e5aed60e5f6 |

## Reviewed source behavior and preservation

Independent comparison used git show/diff at the fixed SHAs rather than accepting the executor's provenance assertion:

- All 27 non-UI Mask App hunks have byte-identical added/removed line sequences in current main..27b. Original and integrated App patches each contain 30 hunks; three UI hunks were relocated into the preserved workspace/provider and CSS structure.
- Mask domain/editor/compositor/recovery/schema/project-package/native TaskHost core paths retain exact e7 blobs. Previously closed IM-001–013 are not reopened by a changed implementation in those paths. The focused recovery/schema/native/package tests below independently exercise their important protection boundaries.
- TopBar, WindowControls, CanvasImageActions, ResultPreview, canvas interaction modules, StartPage, DeferredPanelBoundary, taskRecovery, image-selection.css, desktop-titlebar.css, .github and scripts are unchanged from current main.
- Provider and App-owned lightbox remain inside the preserved conditional workspace. Removing a node does not remove the App-owned lightbox. Switching active project clears the preview. Archived reference/result preview entry points route to App; fallback and non-image media behavior remain.
- Image cards retain the existing upper portal toolbar, without restored internal image action buttons. Updated browser/native drivers operate that toolbar; browser drivers additionally assert no internal matching button and preview toolbar geometry above the card.
- CSS suffix is image-edit.css -> image-selection.css -> desktop-titlebar.css; actual computed/style-module order awaits current runtime receipts.
- All 104 upstream task objects are deep-equal. Only TASK-IMAGE-EDIT-001 (IN_PROGRESS / NOT_VERIFIED) and TASK-IMAGE-EDIT-VERIFY-002 (TODO / NOT_VERIFIED) are added.
- 33 upstream feature objects are deep-equal. FEAT-003 changes only summary, equal to the previously reviewed Mask summary. FEAT-035 remains PARTIAL.
- Desktop/Web 2.1.10 -> 2.1.11; Mobile planning remains 2.1.1. Actual package/lock/Cargo/Tauri deltas change own version fields only. No dependency upgrade or capability expansion.

## Independently executed checks

| Check | Result |
| --- | --- |
| node --test tests/unit/imageEdit.test.ts tests/unit/imageEditSnapshot.test.ts tests/unit/imageMaskAnnotation.test.ts tests/unit/imageEditRecovery.test.ts tests/unit/imageEditSchema.test.ts tests/unit/projectPackage.test.ts tests/unit/nativeTaskHost.test.ts tests/unit/imageEditFixtureCredential.test.ts tests/unit/windowControls.test.ts | exit 0; 102/102 PASS, no failures/skips |
| Seven actual-component vm behavior probes + one App ownership/project-reset static assertion | exit 0; all pass |
| Exact-SHA hunk/blob/task/feature preservation assertions | exit 0; counts and paths as above |
| node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false | exit 0; no build-cache write |
| Governance / features / Markdown | exit 0; 106/0, 35/0, 102 active files/0 |
| Project goals / version check | exit 0; valid / consistent |
| UI static standards | exit 0; 214 files, 0 violations |
| Delivery exact base..head | exit 0; 97 files / 0 violations; structural gate only |
| git diff --check exact base..head | exit 0 |
| Final HEAD/status | exact 27bdb8b; clean |

The actual component probes transpile fixed Git blobs in memory and replace React hook/render and native/browser dependencies; they do not launch a browser or native process. Seven dynamic cases: archived reference double-click/toolbar routing without local dialog; unarchived reference fallback; missing command fallback; archived result routes both previews to App and has no inner action buttons; video retains local media preview; deleting source selects remaining candidate while keeping the lightbox open and captured original intact; entering/exiting candidate edit after deletion retains the candidate/lightbox. App ownership outside Canvas and project-change reset were separately inspected/asserted statically.

Two initial independent preservation-probe invocations failed during setup because this reviewer incorrectly assumed wrapped .tasks/.features JSON instead of the repository's actual top-level arrays. No product assertion failure was inferred from them. The raw array format and executor resolution source were then read; a separately corrected strict-array probe passed without changing any project file or weakening preservation comparisons. These are reviewer setup failures, not hidden code failures.

## Current evidence and declined judgments

The actual verify-27bdb8b.txt was read: root 793 total / 785 pass / 8 existing skips / 0 failures; Agent 174 total / 172 pass / 2 existing skips / 0 failures; UI214/0 and formatting/build stages complete. It terminates with the strict-port 1423 already-used error and contains no browser execution start. It is not a successful full verify or any browser PASS.

Fresh current-code Web and Tauri production artifacts, native Mask/UI/TaskHost/model/titlebar/startup receipts, screenshots/DOM, cleanup and source/artifact hash bindings have not yet been supplied for this source receipt. Old 64c8/e7 dist/EXE/runtime evidence was explicitly excluded from current-head acceptance. Executor-reported Rust102/client check are not reviewer executions. No full verify/build/browser/native/service was launched by this reviewer; no port was occupied or process stopped.

Current-head Hosted gates, actual PR/merge/landing/main CI, user visual/product acceptance, real paid-provider image quality, arbitrary semantic/geometric drift, physical-Mobile behavior and publication were declined: no current direct evidence in this source-preflight scope. Fixture/VM/Node evidence is not any of those external acceptances. No GitHub human approval was created.

## Findings, gates and scoped conclusion

No new actionable P1/P2 source finding was reproduced in the reviewed integration. Historical IM findings retain their original SHA-bound CLOSED records; this is not a renamed old review.

**Source preflight: PASS for exact 1d6f640..27bdb8b. Final integrated acceptance/merge readiness: NOT VERIFIED at this checkpoint.**

AC1/AC2 source and focused protection checks pass within the stated fixture/VM scope; actual current DOM/native operations remain to be bound. AC3 source preservation passes; actual current launch/titlebar/Web receipts remain. AC4 awaits completed same-code full browser/runtime verification, fresh artifact/source identity, final documentation supplement and required current Hosted/main gates. Those pending conditions are explicit acceptance gates, not speculative new defects. Owner: root/integration executor.

Current integration documents accurately retain NOT_VERIFIED and original reviews' historical scope. Final independent conclusion must inspect the forthcoming fresh same-code evidence and bind any subsequent exact head separately. This source receipt does not authorize publication or replace merge/CI/user acceptance.
