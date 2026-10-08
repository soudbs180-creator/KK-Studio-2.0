# Independent Review: Unified Mask main integration and current runtime supplement

- Task: TASK-IMAGE-EDIT-001.
- Review time: 2026-10-09 01:46–01:50 Asia/Shanghai (2026-10-08 17:46–17:50 UTC).
- Reviewer/context: /root/continuation_review, independent subagent context; read-only review with Git, Node.js in-memory probes, installed static checkers, JSON/hash inspection and local image viewing. Model identifier was not separately established.
- Formal base: 1d6f640ac6f3a1e7af32c38d85596527704dc54a.
- Formal head: eaa0886e99965d00a5a514b301adb665b150373d.
- Product integration head: 27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a, parents e7cfd285366fdb12902dd9bfe809069f29393281 and the formal base.
- Supplement diff: 27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a → eaa0886e99965d00a5a514b301adb665b150373d; four files, two documentation files and two model-capability test drivers. No product source/configuration/package/lock/permission delta.
- Branch/worktree: codex/TASK-IMAGE-EDIT-001-unified-mask; D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001. Exact HEAD and clean status checked before and after limited checks.
- Prior original receipt: D:/kk-studio/.verification/TASK-IMAGE-EDIT-001-integration/review-source-27bdb8b.md. Its source-preflight PASS and runtime NOT VERIFIED remain historical; this is a new original supplement, not a relabelled prior review.
- Applicable rules: AGENTS.md blob 0771bc63c13276fbe12f4deea92a1add7befaa22; AI_RULES.md blob a39b009e1efb55531b59bdf39debf9dc42bfc9b0; docs/engineering/REVIEW.md blob 08ce14fb5033758c38de9125f9f80625cdb87914. Also read applicable DEVELOPMENT/SDLC/branch/version/UI guidance, the review template, original Mask intent/spec/plan/reviews, ADR-010 and the new integration five-part change package. Rule and implementation preservation was checked at the fixed revisions.
- Intent/spec/plan/verification/review: docs/changes/2026-10-09-unified-mask-main-integration/; original algorithm and recovery requirements remain docs/changes/2026-10-08-unified-image-mask/ and docs/architecture/adr/ADR-010-unified-image-mask.md.
- Evidence directory: D:/kk-studio/.verification/TASK-IMAGE-EDIT-001-integration/.

## Scope and method

The review reads actual fixed Git diffs and surrounding implementation, original source-review reports at their original revisions, current raw receipts/logs/PNG files, and artifact identities. Source preflight checked the complete Mask integration against current main and ran meaningful pure tests/component VM probes. This supplement separately checks the actual four-file delta, the model-capability failure and repair, fresh product identity, current runtime evidence, remaining development failure, ledger/feature preservation, and applicable limited gates.

No product service, browser, native application, build or full suite was started by this reviewer. No tracked file, index, branch, HEAD, other owner's working tree, credentials or user data was changed. The only new file is this external original receipt, created without overwrite. Executor-run full suites and native/Web acceptance remain executor evidence inspected independently; they are not described as suites executed by the reviewer.

The implementation context's own draft finalization script was not treated as executed evidence. The current tracked integration review still has conservative pending status; it must not be read as already recording this supplement. A later documentation commit requires its own exact-SHA review.

## Behaviors declined to judge and reasons

- Paid or live Provider output quality, supplier-specific mask semantics, arbitrary semantic/geometry/lighting drift, physical mobile gestures/keyboard/safe areas and human visual acceptance: current evidence uses deterministic local HTTP/image fixtures and desktop/Web environments. TASK-IMAGE-EDIT-VERIFY-002 remains TODO / NOT_VERIFIED; FEAT-035 remains PARTIAL.
- Development Mask end-to-end availability, working development plugins, or a zero-error fresh development launch: the original fresh 1421 run actually failed with the public-import overlay. The follow-up run explicitly dismissed that known overlay only to inspect home/settings/style order/widths.
- Current main@1d6 runtime reproduction or success: both primary-main baseline attempts timed out before page initialization. They are NOT VERIFIED; source identity plus the existing ledger failure supports an inherited-failure inference, not a successful current-main runtime observation.
- Latest Hosted CI, exact final-document delivery, actual PR approvals, final merge or post-merge main CI: these were not supplied as completed exact-head evidence in this review. AC4's remote/integration tail remains pending.
- High-integrity Windows policy installation, installer/uninstall behavior, release publication, different operating systems or devices: these are outside this scoped runtime evidence. Local native fixture success is not proof of those behaviors.

## Findings and disposition

| ID | Priority | Merge blocker | Evidence / location | Reproduction and effect | Disposition |
| --- | --- | --- | --- | --- | --- |
| MASK-INTEGRATION-001 | P2 | Closed for the reviewed head | tests/desktop/model-capabilities.mjs:156; tests/browser/model-capabilities.spec.ts:208 and :486; native-model-27bdb8b.txt; native-model-eaa0886.txt and runtime-eaa0886/native-model/desktop-acceptance.json | The original redraw dialog legitimately contained both the original-image loading status and the model capability status. A broad getByRole("status") locator therefore threw strict-mode error. The actual GenerationStatus component has class local-generation-status and role=status. | CLOSED at eaa0886: all three changed assertions select that component, require exactly one element and role=status, then retain the original capability text. Disabled controls, reference limits, archived original, zero requests/zero tasks and error checks remain. No .first(), skip, test configuration or product workaround was added. Current native log and full browser reporter pass. |
| TASK-PLUGIN-DEV-001 | Existing tracked follow-up; no new grading | No new Mask merge blocker established | Existing main ledger task TODO / FAIL; development-eaa0886-1791480035787/receipt.json; runtime-eaa0886/web-development/receipt.json and known-plugin-error PNGs | Fresh development failed because Vite rejects public /plugins/*.js imports; the overlay intercepts the settings click. | Remains OPEN / FAIL. Loader, Vite configuration, public plugins and dependency entries are unchanged from main1d6; the task object is preserved exactly and historical main failure is already recorded. This supports treating it as an inherited scoped follow-up. It does not establish current-main runtime success or close development plugin acceptance. |

No new P0/P1/P2 source or scoped acceptance blocker was found in the reviewed integration and supplement. This is not a whole-project bug-free assertion.

Non-blocking documentation formatting observation: an extra Prettier check over all four supplement files warned only for integration plan.md. The repository's defined format:check covers source/tests/scripts/configuration rather than docs. Changed drivers pass Prettier, Markdown and diff-check pass; this optional docs formatting warning is recorded separately and is suitable for the pending documentation closeout.

## Independent checks actually executed

### Earlier source preflight, retained at unchanged product bytes

The original review-source-27bdb8b.md contains the commands and original results. Current fixed-revision comparison proves eaa has no product delta from 27b; the relevant pure test/VM inputs also remain unchanged.

- 102/102 focused Node tests passed, zero failures/skips: imageEdit, imageEditSnapshot, imageMaskAnnotation, imageEditRecovery, imageEditSchema, projectPackage, nativeTaskHost, imageEditFixtureCredential and windowControls.
- Seven actual-component in-memory VM scenarios and one App placement assertion passed: archived reference/result double-click and upper-toolbar previews reach App; unarchived/missing-command fallback is preserved; video preview remains local; source deletion keeps captured lightbox state and candidate selection; editing/exit survive deletion; App lightbox stays outside Canvas and project reset is explicit.
- All 27 original core Mask App patch hunks were preserved in main integration. Original Mask core module/Rust/CSS blobs and main titlebar/upper-toolbar/lazy workspace/task recovery/CI modules were verified at fixed SHAs.
- noEmit typecheck with incremental writing disabled and applicable source-preflight static gates passed.

These checks were not silently rerun or retitled as eaa full-suite executions.

### Current eaa supplement

- Exact four-file diff and surrounding GenerationAction/ImageEditor/model driver assertions inspected. All product src/src-tauri/config/package/lock blobs are unchanged 27b→eaa.
- In-memory exact-SHA preservation probe: all 104 main task objects deep-equal; 33 main feature objects deep-equal; the only existing feature changed is the already-reviewed FEAT-003 summary. The two additional Mask tasks remain IN_PROGRESS / NOT_VERIFIED and TODO / NOT_VERIFIED. FEAT-035 remains PARTIAL.
- 425/425 current identity source/test/config hashes match; all 37/37 declared copied raw evidence files match both hash and length, and their originals match; native UI 418/418 source hashes and native TaskHost 9/9 hashes match current source; development-originals 10/10 original/copy hashes match.
- Raw Playwright JSON independently traversed and recomputed: 445 tests, 445 attempts, all passed with retry=0; 12 actual workers, configured workers=12; configured retries=1 from reporter config.projects[].retries; expected=445, unexpected=0, flaky=0, skipped=0. StartTime 2026-10-08T17:17:37.465Z, duration 115434.637ms.
- Native model driver node --check and changed-driver ESLint passed.
- Changed-driver Prettier passed. Extra four-file docs-inclusive Prettier warning described above was retained rather than called green.
- Governance 106 tasks / 0 violations; features 35 / 0; Markdown 102 active files / 0; project goals valid; platform versions consistent; UI 214 files / 0; formal base→head delivery 98 files / 0 violations; complete diff-check passed. Delivery is a structural gate, not proof of runtime or review quality.
- Current main plugin source/config/dependency preservation and exact TASK-PLUGIN-DEV-001 task preservation verified.
- Visual inspection: current copied native Mask editor and lightbox, selected-reference upper-toolbar PNG, production Web home at 390px and the original development plugin overlay PNG. These are reviewer observations of saved images, not a fresh application launch.

Reviewer setup failures are not hidden: initial supplemental command used a wrong feature-registry path and unavailable npx; a later rule-identity probe guessed root REVIEW.md rather than docs/engineering/REVIEW.md. These failed before their intended checks. The corrected canonical paths and direct installed checker invocations produced the independent results above. No project file or valid assertion was changed to correct reviewer command setup.

## Current product identity

Product was freshly built at 27b; eaa changes only two drivers and two documents. Identity and fetched runtime bundle hashes bind that product to the unchanged eaa product inputs.

| Artifact | Current verified identity |
| --- | --- |
| Native EXE | SHA256 ad5e3428497bc69fbabc40d52ac3269fd5df5b06019407a7b9b99e121944d4c9 |
| JS assets/index-DcEEaxES.js | SHA256 5837a30790051576bc0af9ae4dcd1c4a13e47c462103cdf6953401e95c3a4ea4; 884798 bytes |
| CSS assets/index-D4acWk3o.css | SHA256 06252c7cbc8773dd750901ff0b71820449fa4d0d7850d5eb6c6c1ac9a0e01b21; 286041 bytes |
| Raw browser-results-eaa0886.json | SHA256 33f40cc629867140de3c5010e372024bd50f039f5acef19ef0a4cf1f0fec3dae |

Some unchanged-product native receipts accurately retain sourceHead=27b; they were not rewritten to say eaa. Current hash matching establishes their unchanged-product applicability. Fresh eaa TaskHost, model and startup receipts retain their actual own execution identities.

## Executor-run checks and raw runtime evidence inspected

- verify-eaa0886.txt: complete local npm verify pipeline results inspected; root 793 total / 785 passed / 8 existing Windows skips / 0 failed; Agent 174 / 172 / 2 existing skips / 0 failed; browser 445/445. The executor reports exit 0; the reviewer independently read the completed pipeline/raw reporter but did not execute the full suite.
- rust-test-preparation.txt: 102 Rust tests passed; rust-fmt-preparation.txt and client-check-27bdb8b.txt retained, client check finishes successfully with existing warnings. Agent-build-27bdb8b.txt explicitly shows npm client:build:agent --no-bundle, Agent runtime packaging of 4277 win32/x64 files, Vite build and successful release EXE build. Product inputs unchanged at eaa.
- Native Mask raw acceptance: actual tauri production entry/current fetched bundles and same EXE; two local fixture requests; protected pixels changed inside Mask and outsideChanged=0; package asset count 4; clear/undo/redo PASS; source deletion keeps lightbox and enables a separate new generation with a new idempotency key; restart retains deletion and succeeds without a third POST; imageEditRequired marker survives; original fixture credential conflict is preserved; errors=[] and credential cleanup complete. Relevant actual driver assertions around source deletion/package/restart/finally cleanup were inspected.
- Native selected-image acceptance: 13 checks, actual upper CanvasImageActions, preview/redraw/compare/double-click/focus and page checks; same EXE and fetched bundles; no card-inner actions restored; errors=[] and cleanup=true.
- Fresh eaa native TaskHost: 11 checks and five starts, all CDP-ready; cancellation during headers/body/download remains fenced unknown and verified prior assets preserved; image/idempotent submit, restart/crash replay, text capacity/cancel/draft handling, App durable intent/no ordinary unknown retry and credential isolation. All recorded fixture POSTs have durable journal evidence. errors=[] and credential cleanup true. ExitCode=1 on deliberately killed starts follows cleanupRequestedAt and is not represented as spontaneous application crash. Host elevation and runtime version were not recorded.
- Native model-eaa: actual corrected driver PASS with original eight checks, archived original and no generated task; raw previous strict-role FAIL kept. This closes MASK-INTEGRATION-001 for current inputs.
- Native titlebar: actual 40px header, same center=20 for brand/menu/window controls; recorded movement from (0,0) to (80,60). Actual raw driver PASS retains window button/double-click/minimize/restore/close assertions. No expectation change in this integration.
- Fresh native startup: exact eaa source and current product, isolated data/profile; zero Canvas/Conversation on home, deferred settings only one chunk, settings focus/Escape return focus, current JS/CSS fetched hash matching, errors=[] and owned process stopped. The recorded home-ready time is one observation, not a performance guarantee.
- Standalone production Web: current worktree strict preview 1423, widths 390/1099/1920, current JS/CSS hashes fetched, lazy home/deferred settings/focus/once-load, no overflow/errors and owned process stopped.
- Development strict-original run: FAIL preserved. Settings click times out because Vite error overlay intercepts pointer events; zero accepted pages; own process cleanup true.
- Explicit known-baseline development run: actual pre-dismissal overlay text and PNG retained per width; allowed public-plugin error checked, then Escape only in the acceptance driver. Only home/settings/deferred loading/focus/overflow and all actual 41 development style modules are accepted afterward. Last three style modules are image-edit.css → image-selection.css → desktop-titlebar.css at all widths. No product source workaround or disabled HMR/CSP.
- Two main1d runtime attempts: first waitUntil=load timeout, second domcontentloaded timeout before page initialization; zero accepted pages. Both preserved as NOT VERIFIED with own cleanup. They are not main PASS or a directly observed current-main overlay reproduction.

Historical verify-27b port conflict before browser execution, original native model strict-role failure and the actual development failures remain visible. They were not replaced by successful receipts or reconstructed from console output.

The first derived browser summary incorrectly emitted configuredRetries=[null] from absent per-test retry configuration. The original summary and raw reporter are retained. browser-summary-eaa0886-corrected.json explicitly derives configuredRetries=[1] from config.projects[].retries and leaves the 445 actual attempts / zero retries unchanged. The reviewer independently recomputed both the actual result counts and the corrected configuration provenance.

## Acceptance criteria

| AC | Scoped current assessment | Evidence / remaining limit |
| --- | --- | --- |
| AC1 | PASS for local integration | Source/component VM probes, current actual upper-toolbar selection checks and native Mask source-delete/lightbox/re-generation/restart assertions. App owns previews outside lazy Canvas; project-switch/reset is explicit. |
| AC2 | PASS for local deterministic contract | Unchanged original Mask/ADR implementation, focused 102 tests, current browser Mask cases in full 445 reporter, native outsideChanged=0, package/restart/durable marker/clear-history/opinion isolation evidence. Live model quality and physical mobile remain VERIFY-002. |
| AC3 | PASS for production Web and native preservation; limited development acceptance with follow-up | Native lazy home/deferred settings, actual 40px/window titlebar, production Web three widths. Development home/settings/style-order/three widths only after explicitly captured known overlay dismissal; fresh strict development remains FAIL, development Mask end-to-end not claimed. |
| AC4 | Local verification and independent source/runtime review satisfied; remote/finalization tail pending | Current raw full verify, retained unchanged-input Rust/client/fresh release, two runtime modes and independent bounded checks support local acceptance. Final documentation SHA review, exact current Hosted gates, actual merge and post-merge main CI must still be completed and cannot be replaced by this receipt. |

## Applicable gates

| Gate | Actual status and boundary |
| --- | --- |
| Self-review | Implementer's own source/runtime inspection and drafts are distinct from this independent context; not presented as independent review. |
| Independent AI review | This original exact base/head supplement, PASS WITH FOLLOW-UPS within the source/local runtime scope below. |
| Local regression | Executor completed full verify / fresh native and Web; reviewer inspected raw evidence and separately ran bounded static/hash/pure checks described above. |
| Hosted CI | Current exact-head completion not established here; must pass before final merge. Old Hosted results are not promoted. |
| GitHub human approval | Reviewer did not inspect/issue approvals or verify a current required-approval count; no approval is fabricated. |
| User UI / product acceptance | Saved-image inspection by reviewer is recorded. Paid Provider, physical mobile and final user acceptance remain NOT VERIFIED. |
| Push / merge / publication | Parent states the user authorized merging completed branches. This reviewer performed no push/merge/publication; authorization does not substitute for pending checks. |
| Recovery / cleanup | Native deterministic restart/intent/journal/package/source-delete/credential cleanup evidence passed for current unchanged product; broader installer/release rollback not in scope. |

## Formal conclusion

PASS WITH FOLLOW-UPS for the independently reviewed exact source range 1d6f640ac6f3a1e7af32c38d85596527704dc54a → eaa0886e99965d00a5a514b301adb665b150373d and the local runtime evidence stated above.

MASK-INTEGRATION-001 is CLOSED at this exact head. No new scoped merge-blocking source or runtime finding remains. TASK-PLUGIN-DEV-001 stays TODO / FAIL and requires a separate fix; only explicitly limited post-dismissal development acceptance is credited. TASK-IMAGE-EDIT-VERIFY-002 stays TODO / NOT_VERIFIED and FEAT-035 PARTIAL.

This verdict does not mean all AC4 external stages are complete or that the branch is already merged/released. Exact final-document review, current Hosted required gates, actual authorized merge and post-merge main CI remain necessary before claiming complete delivery. A new head requires an exact incremental review; this receipt does not automatically cover future documentation or source changes.
