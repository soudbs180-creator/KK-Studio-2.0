# T5 ASN.1 signer repair — independent supplemental review

- Recorded: 2026-10-08 08:57:19 UTC
- Independent reviewer: `/root/continuation_review`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/T5-native-lifecycle`
- Branch: `codex/T5-native-lifecycle`
- Exact base: `3229489bf61fe04734beea3dd7353817ee65d4b8`
- Exact head: `8399c1de04acb54c876f5a049db8d5ce93721b06`
- Complete PR baseline: `5dd6e6dddaf00cf2d5c14ae02ef5974c72238232`
- Scope: six committed files; ASN.1 helper repair, fixture expansion, preserved historical reviews, green log and verification update.
- Applicable AGENTS.md, AI_RULES.md, REVIEW and T5 intent/spec/plan are unchanged from the preceding review and remain applicable.
- Reviewer read fixed Git source/diff and executed finite checks. No tracked file, index, HEAD, branch, other worktree, credential, registry, software or application data was modified. This new external receipt is authorized.

## Boundaries not certified

The installer regression uses external-effect substitutes; it does not certify a real Runtime installation, an actual bootstrapper download or current Hosted success. The only actual signer/runtime operations were read-only inspection of an existing Windows system-file signature and installed Runtime registry version.

The complete verify, Rust suite, new native build and eleven-group native suite were not rerun in this supplement. Their earlier executor records retain their original sourceHead/hash attribution. No paid Provider, human GitHub approval, merge, publication or user final product acceptance is certified.

The original 3d415ab Hosted CDP startup failure remains retained. Runtime absence remains INFERENCE; this review does not retrospectively prove its cause. Current-head Hosted verify/delivery/native execution must still pass before merge.

## Formal verdict

**PASS for `3229489bf61fe04734beea3dd7353817ee65d4b8 → 8399c1de04acb54c876f5a049db8d5ce93721b06`.**

No new P1/P2 or unresolved review blocker was found in this exact supplement. Both environment-repair findings are now CLOSED:

| Finding | Final state | Independent closure |
| --- | --- | --- |
| T5-ENV-REVIEW-001 — installation outside authorized CI | CLOSED in 3229489; retained | Missing Runtime requires GITHUB_ACTIONS=true, RUNNER_ENVIRONMENT=github-hosted and RUNNER_TEMP before download. Independent local/self-hosted/missing identity fixture cases reject without download/start. |
| T5-ENV-REVIEW-002 — incorrect Microsoft organization recognition | CLOSED in 8399c1d | Actual DER organization OID is read and exactly one organization must equal Microsoft Corporation with Ordinal comparison. Quoted-CN, conflicting and identical duplicate organizations, missing organization, case/prefix variants and invalid DER reject. Existing valid Microsoft system-file certificate accepts. |

The 47c0ba6 and 3229489 reviews remain historical CHANGES REQUIRED for their original SHAs. Their blocker closure is established by this new exact-head review, not by editing their old verdict or head. Previous lifecycle T5-REVIEW-001/002 remain closed.

The complete PR source review coverage extends to final head 8399c1d through the preceding exact-range reviews plus this repair supplement. This is an independent review PASS for the covered change scope; pending Hosted/integration gates remain independent requirements.

## Implementation assessment

The helper reads SubjectName.RawData through .NET AsnReader configured for DER. It traverses Name/RDN/attribute sequences and recognizes organization only by OID `2.5.4.10`. Each attribute must be fully consumed; trailing root data and parser exceptions reject. O values must use a Universal character-string tag. Success requires exactly one decoded O value and exact Ordinal equality to Microsoft Corporation.

CN text, including quotes and comma-delimited organization-looking words, is no longer considered. Duplicate organizations reject even when both equal Microsoft Corporation. Missing/null/malformed data rejects. Authenticode Status=Valid remains a separate required condition before invocation. This combines signature validity with the corrected signer attribute check; it does not claim that arbitrary synthetic fixture certificates are trusted.

Hosted context restrictions, official HTTPS bootstrapper source, signature-before-execution ordering, bounded installer wait, nonzero/timeout failure and mandatory post-install Runtime detection remain intact. Failed setup cannot advertise a readiness environment receipt.

The workflow still requires the regression script and actual helper before real native lifecycle acceptance; its triggers, timeout, assertions, production release/native IPC and failure artifact upload are unchanged in this supplement. No failing gate was skipped or weakened.

## Reviewer-executed checks

| Check | Result |
| --- | --- |
| Current HEAD/status | Exact 8399c1de04acb54c876f5a049db8d5ce93721b06; clean |
| Committed side-effect-free prerequisite regression | 15/15 PASS; exit 0 |
| Existing kernel32.dll Authenticode | Status=Valid; Test-MicrosoftSigner=true; read-only |
| Registry-only Runtime detection | 154.0.4258.62; no installation |
| Additional DER signer cases | Valid Microsoft accepted; quoted-CN, no O, identical duplicate O, conflicting duplicate O, ordinal case and prefix rejected |
| Malformed/trailing/wrong-root-tag DER and null certificate | Rejected; no uncaught failure |
| Exact native startup stderr handler | 37 split-secret boundaries redacted; oversized data capped at 8192 characters; no complete synthetic secret retained |
| Changed Markdown relative links | 3 files; 0 issues |
| Governance | 99 tasks; 0 violations |
| Features | 34 features; 0 violations |
| Active Markdown | 99 files; 0 violations |
| Exact supplement diff check | PASS |
| Full-base→8399c1d delivery | 57 files; 0 violations; structure only |

Full delivery command:

`node scripts/check-delivery.mjs --base 5dd6e6dddaf00cf2d5c14ae02ef5974c72238232 --head 8399c1de04acb54c876f5a049db8d5ce93721b06 --branch codex/T5-native-lifecycle`

## Saved evidence and history integrity

- The preserved quoted-CN RED log shows the old actual helper reached download/start for the spoofed DN. The new saved ASN.1 GREEN log has fifteen passes. The independently executed current regression agrees.
- The archived review-47c0ba6.md differs from its engineering-external original only in formatter output: canonical Prettier content is identical. Its table alignment is changed, not facts, SHA, verdict or failure history.
- Archived review-3229489.md is identical to its original after line-ending normalization; canonical formatted content also matches.
- The initial strict raw-copy comparison failed for the formatter table spacing. It was followed by canonical comparison, which proved formatting-only difference; it is not counted as a product regression or ignored evidence alteration.
- Saved native startup report and diagnostic harness are unchanged from the prior source-bound review. No new native/full verify run is claimed in this supplement.
- Startup diagnostics still record owned PID/exit/signal/CDP state and bounded synthetic-secret-redacted stderr; spawn failures and test failures retain false outcomes. Existing owned PID-tree and fixture credential cleanup rules remain in place.
- Historical installer test setup failures and original Hosted startup failure were retained; new passing tests do not rewrite them.
- Documentation leaves current exact-head review and Hosted results pending rather than prewriting success. This external receipt supplies the independent review conclusion without another tracked commit.

## Remaining gates

No repair is requested by this source/evidence review. Read the actual current-head Hosted verification and native results before merge; failures must remain visible and be resolved. TASK-PROV-005/006 remain separate TODO work, and real paid Provider acceptance remains external.
