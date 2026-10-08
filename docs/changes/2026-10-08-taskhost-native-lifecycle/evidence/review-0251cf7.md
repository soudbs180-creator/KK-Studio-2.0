# T5 independent read-only supplemental review

- Recorded: 2026-10-08 07:24:24 UTC
- Reviewer role: independent review subagent `/root/continuation_review`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/T5-native-lifecycle`
- Branch: `codex/T5-native-lifecycle`
- Exact base: `5dd6e6dddaf00cf2d5c14ae02ef5974c72238232`
- Exact head: `0251cf797a60ead936849c185999dc3fe6a005c0`
- Review range: committed `base..head`; 49 changed files. HEAD and clean working tree were independently confirmed.
- Authorization: create this one new receipt outside the engineering worktree. No tracked file, index, HEAD, branch, other worktree, credential, or application data was modified by this reviewer.

## Scope and boundaries

Read the applicable AGENTS.md, AI_RULES.md, REVIEW guidance, relevant UI/development/version guidance, and the committed T5 intent/spec/plan, verification, review and evidence. Reviewed the fixed Git diff and surrounding lifecycle, recovery, retry-selector, UI, test-isolation and CI code. The inherited PR #35 changes are included in the comparison to the requested base; this does not rename the previous review.

The following behaviors were not independently executed or certified:

- Paid or external Provider interoperability, vendor billing/health, and provider configuration crash durability. The native and browser providers in this package are controlled fixtures. TASK-PROV-005 and TASK-PROV-006 remain TODO/NOT_VERIFIED.
- The full native suite, Rust suite, production rebuild, complete Node/Agent suite and complete browser suite were not rerun by this reviewer. Their saved reports, selected assertions, source/binary binding and relevant screenshots were inspected as executor evidence.
- Current-head Hosted CI completion, publishing, release acceptance, merging and human GitHub approval. Historical main CI receipts are historical evidence; current-head Hosted gates were still pending at review time.
- Unrelated project-wide behavior and the newly requested floating card toolbar redesign. That UI work is a separate scope.

## Formal verdict

**PASS for the independent source/evidence review of `5dd6e6dddaf00cf2d5c14ae02ef5974c72238232 → 0251cf797a60ead936849c185999dc3fe6a005c0`.**

No new blocking P1/P2 finding was identified in this committed scope. T5-REVIEW-001 and T5-REVIEW-002 are closed. This review PASS is not a claim that pending Hosted CI or real external Provider acceptance has completed.

The original review remains **CHANGES REQUIRED** for `5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3 → b58854c0f004206900c4e6dc929e5b1306da8463`. Its findings are closed by the current changes and new evidence, not by substituting the new SHA into that review.

## Findings closed

| Finding | Original severity | Independent closure basis |
| --- | --- | --- |
| T5-REVIEW-001: preexisting credential values could enter assertion errors and JSON | P2; safety acceptance blocker | Both preexistence guards now assert booleans. Reproduced the old and repaired exact helper with synthetic in-memory credential values: both reject before any set; old errors and their JSON contain the synthetic marker, repaired errors and JSON do not. The new actual OS synthetic collision test asserts rejection, preservation and absence of secret in errors; its saved native report passes. |
| T5-REVIEW-002: unknown task matrix advertised ordinary retry | P2; AC4 acceptance blocker | Caption and per-output buttons now share `retryableOutputIndices`. Independently rendered the exact component and selector: unknown task with 1 succeeded + 3 unknown has no retry caption/buttons; unknown with 1 succeeded + 1 unknown + 2 failed also has none; a legal partial task with failed/cancelled outputs retains two buttons and the caption. Native and Web saved screenshots agree. New browser regression covers the mixed unknown/failed case and preserves the legal partial retry regression. |
| Original change-package formatting note | P3; nonblocking | The six current T5 package documents pass independent Prettier checks. |

## Independently executed checks

These are reviewer-run checks, rather than executor claims:

| Check | Result |
| --- | --- |
| Exact HEAD, clean working tree and fixed range diff check | PASS |
| `node --test tests/unit/nativeTaskHost.test.ts tests/unit/taskRecovery.test.ts` | 53 tests; 53 pass; 0 fail; 0 skip |
| Old/new credential helper synthetic reproduction | Old leak reproduced; new helper rejects safely; zero credential-set calls |
| Exact-head BatchMatrix/selector server rendering | Unknown, mixed unknown/failed, legal partial, running/submitted and succeeded cases pass |
| `node scripts/platform-versions.mjs check` | PASS; Desktop 2.1.6 / Web 2.1.7 / planned Mobile 2.1.1 consistent |
| `node scripts/check-governance.mjs` | 99 tasks; 0 violations |
| `node scripts/check-features.mjs` | 34 features; 0 violations |
| `node scripts/check-markdown.mjs` | 99 active files; 0 violations |
| Six T5 package documents: link and Prettier checks | 0 link issues; formatting PASS |
| Changed App, BatchMatrix, browser regression and native harness: Prettier | PASS |
| `node scripts/check-delivery.mjs --base 5dd6e6dddaf00cf2d5c14ae02ef5974c72238232 --head 0251cf797a60ead936849c185999dc3fe6a005c0 --branch codex/T5-native-lifecycle` | 49 files; 0 violations |
| Native report's nine source hashes against exact-head Git content, accounting for checkout line endings | 9/9 match |
| Actual local EXE / JS / CSS against saved final native hashes | All match |
| Committed native/Web final PNGs and their displayed matrix states | Worktree PNG bytes match Git; both show no forbidden retry caption/buttons |

The direct Node entry points were used where this reviewer shell could not resolve `npm`. No project scripts, lockfiles or checks were changed to accommodate the shell environment.

## Executor evidence inspected

- `evidence/native-final-retry-gate.json`: eleven checks pass, no errors, cleanup successful, five owned launches. Cancellation measurements are approximately 117 ms for headers, 116 ms for response body and 119 ms for image download; the latter retains the previously archived successful slot. Replay/restart records and fixture POST counts support single submission.
- Its `sourceHead` remains `fa9da16202a41cff9a1dbc993cf9410b65d21d88`, correctly identifying a precommit dirty build. It is not presented as a clean build executed after commit 0251cf7. All nine recorded source hashes independently match the final reviewed source.
- Final native executable SHA-256: `0036cd63cb2c83bab4743de044908a552f33dd3516e704c8bcb7a66472d47648`.
- Final JS `index-DZ6J1_oD.js` SHA-256: `237b8b7d611f8a4741cb3ffb14a7b42a9e1b628b6a48aba85a47809740a3dec8`.
- Final CSS `index-C6I0Rp3I.css` SHA-256: `7fa7ac181e2b8bb3a70d690a6f308e354c3984e2fed70c5e382d5e7eb8cc8d0d`.
- `verify-final.txt`: saved complete verification reports Node 716 total / 708 pass / 8 existing skips; Agent 174 total / 172 pass / 2 existing skips; browser 401 passed. Rust 97/fmt/check and fresh production build are executor evidence, not independently rerun results.
- Actual browser machine report: start time `2026-10-08T07:08:04.284Z`, expected 401, unexpected 0, flaky 0, skipped 0; 401 attempts, maximum retry 0 and zero retried attempts. Configuration permits 1 retry. This is not described as a `--retries=0` run.
- Retained RED browser/native records substantiate the original retry caption failure. Earlier scheduling failure evidence remains recorded; the final serial run does not erase it.
- `native-final-unknown.png` shows 1 succeeded + 3 unknown. `web-final-unknown-failed.png` shows 1 succeeded + 1 unknown + 2 failed. Both retain the successful asset and omit ordinary retry offers.
- The ledger keeps T5 in REVIEW, the open provider work TODO/NOT_VERIFIED, and the relevant feature areas PARTIAL. The documentation does not use old main CI or fixture success to declare the remaining external work complete.

## Acceptance assessment

AC1–AC5 are supported for the stated native lifecycle scope by the implementation, inspected fixtures/native receipts and independent relevant unit/UI checks:

- Project intent/native journal precede fixture-observed POST; identity replay and restart do not add POSTs.
- Notify registration checks avoid the cancellation wakeup race; cancellation during unconfirmed request/response/download retains unknown fencing and any already archived asset.
- Optional metadata is omitted when absent rather than persisted as invalid null.
- Unknown tasks do not expose ordinary retry, including mixed unknown/failed outputs; legitimate partial retry remains available.
- Text capacity remains held across reload, is rejected before new journal/POST when full, and is released by cancellation. Interrupted text drafts remain unknown and completed text requires valid content.
- Native acceptance uses isolated profile/data, only owned process cleanup and synthetic unique credentials. The repaired conflict guard no longer prints a preexisting value.

AC6 local validation and this independent review are supported. The current-head Hosted verification/delivery gates remain outstanding and must pass before representing the complete integration workflow as finished.

## Synthetic credential reproduction appendix

Run this from the reviewed worktree with Node as an ES module. It extracts only the exact committed helper and substitutes an in-memory `invoke`; it never accesses the OS credential vault. The output contains booleans and counts only.

```javascript
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

for (const head of [
  "b58854c0f004206900c4e6dc929e5b1306da8463",
  "0251cf797a60ead936849c185999dc3fe6a005c0",
]) {
  const source = execFileSync(
    "git",
    ["show", head + ":tests/desktop/taskhost-lifecycle.mjs"],
    { encoding: "utf8" },
  );
  const start = source.indexOf("async function ownCredential(id)");
  const end = source.indexOf("async function cancelCase(", start);
  assert.ok(start >= 0 && end > start);
  const marker = "existing-vault-marker-for-read-only-review";
  let sets = 0;
  let error;

  try {
    const run = new AsyncFunction(
      "assert",
      "invoke",
      "ownedCredentials",
      "secret",
      source.slice(start, end) + '\nreturn ownCredential("review-id");',
    );
    await run(
      assert,
      async (command) => {
        if (command === "credential_get") return marker;
        sets++;
      },
      new Set(),
      "new-synthetic",
    );
  } catch (cause) {
    error = cause;
  }

  console.log(
    JSON.stringify({
      head,
      rejected: Boolean(error),
      credentialSetCalls: sets,
      errorContainsValue: String(error).includes(marker),
      errorJSONContainsValue: JSON.stringify(error).includes(marker),
    }),
  );
}
```

Expected: old helper rejects with both marker flags true; final helper rejects with both flags false; credentialSetCalls is 0 in both cases.
