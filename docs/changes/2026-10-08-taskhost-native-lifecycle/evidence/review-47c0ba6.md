# T5 native-environment repair independent review

- Recorded: 2026-10-08 08:40:10 UTC
- Independent reviewer: `/root/continuation_review`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/T5-native-lifecycle`
- Branch: `codex/T5-native-lifecycle`
- Exact base: `3d415abe04604e0753d31323f07d89c3c34e7fd6`
- Exact reviewed source head: `47c0ba6d277a691b0fbb8797b44c10c69eb41a82`
- Full PR base remains `5dd6e6dddaf00cf2d5c14ae02ef5974c72238232`.
- Scope: five committed files in the exact increment: WebView2 helper, workflow, diagnostic native harness, saved native report and verification update.
- Applicable AGENTS/AI_RULES/REVIEW and T5 intent/spec/plan are unchanged from the preceding reviewed head. Core inspection and branch simulation use exact `git show` content rather than later dirty files.
- Reviewer did not modify tracked files, index, HEAD, branch, other worktrees, software, registry, credentials or application data. This new external receipt is explicitly authorized. After findings were delivered, implementer-owned helper/test changes became dirty; they are not included in this 47c0ba6 verdict.

## Boundaries declined to certify

No actual installer download or installation was performed. Registry, download, signature and process operations were mocked for the installer-branch tests; only the read-only detection prefix was additionally executed against the local registry.

The full native suite, complete verify, Rust and production rebuild were not rerun by this reviewer. The saved native report is executor evidence, independently source-bound and inspected. Current-head Hosted completion, merge/release, human approval and real paid Provider behavior are not certified.

The original Hosted CDP failure is supported by the saved PR log and valid matching archive. Its cause remains UNKNOWN; absent Runtime is INFERENCE, not proven by that original receipt. Direct GitHub run metadata lookup was attempted but `gh` is unavailable in the reviewer shell, so no fresh Hosted result is claimed.

## Formal verdict

**CHANGES REQUIRED for `3d415abe04604e0753d31323f07d89c3c34e7fd6 → 47c0ba6d277a691b0fbb8797b44c10c69eb41a82`.**

Two bounded, reproducible P2 safety-acceptance findings remain open. They block approving this automatic-installation scope until repaired and independently reviewed. This verdict does not reopen the previously closed T5-REVIEW-001/002 lifecycle findings or rename their historical review SHAs. Hosted native verification must also pass at the repaired current head before merge.

## Findings

### T5-ENV-REVIEW-001 — P2 — Non-CI execution can enter automatic installation

- Pass: safety/authorization.
- File/line: `.github/scripts/ensure-webview2.ps1:26`.
- Status: OPEN; merge acceptance blocker for this repair; owner: implementer/root.
- Requirement: automatic installation occurs only when Runtime is missing on an isolated CI runner.
- Reproduction: execute the exact committed script with all I/O mocked; missing Runtime, nonempty `RUNNER_TEMP`, and no `GITHUB_ACTIONS`. The script accepts the environment and reaches download and Start-Process. Observed: Rejected=false, DownloadCalls=1, StartCalls=1.
- Root cause: presence of a temporary directory is the entire CI eligibility check. It does not establish GitHub Actions or the hosted runner condition.
- Impact: running this helper outside the authorized CI context with that environment variable set can install software automatically. No actual unintended installation occurred during review.
- Actionable fix: explicitly require the authorized hosted-CI context, e.g. `GITHUB_ACTIONS=true` and `RUNNER_ENVIRONMENT=github-hosted`, plus a valid runner temp directory before any download. Add missing-runtime negative cases for non-CI and self-hosted contexts and retain the installed-runtime no-install case.

### T5-ENV-REVIEW-002 — P2 — Publisher check accepts another organization with Microsoft prefix

- Pass: downloaded executable trust.
- File/line: `.github/scripts/ensure-webview2.ps1:30`.
- Status: OPEN; merge acceptance blocker for this repair; owner: implementer/root.
- Requirement: the bootstrapper has a valid Microsoft signature before execution.
- Reproduction: exact committed script with synthetic signature metadata Status=Valid and Subject=`CN=Synthetic Publisher, O=Microsoft Corporation Example, C=US`. Observed: Rejected=false, DownloadCalls=1, StartCalls=1. The same test with an unrelated organization correctly rejects.
- Root cause: `-match 'O=Microsoft Corporation'` checks an unbounded substring rather than the complete organization field.
- Impact: Valid establishes signature validity, while this additional test fails to distinguish the intended Microsoft organization from a different prefixed organization. The official HTTPS download source limits exposure, but does not make the asserted publisher identity check correct. This is a deterministic validation finding using synthetic metadata, not evidence of a compromised Microsoft download or a real malicious certificate.
- Actionable fix: validate the complete signer identity/organization field with proper DN boundaries, or another exact trusted signer identity approach. Add a Valid-but-prefixed-other-organization negative case, alongside Valid Microsoft and invalid-signature cases.

## Independent branch checks

Exact source was obtained with `git show 47c0ba6d277a691b0fbb8797b44c10c69eb41a82:.github/scripts/ensure-webview2.ps1` and evaluated in PowerShell 7.6.5 child scopes. Get-ItemProperty, Invoke-WebRequest, Get-AuthenticodeSignature and Start-Process were replaced by in-memory functions. GITHUB_ENV was unset; no file, network, installer or registry write was possible.

| Case                                                             | Rejected | Download calls | Start calls | Assessment                     |
| ---------------------------------------------------------------- | -------- | -------------- | ----------- | ------------------------------ |
| Already installed Runtime                                        | false    | 0              | 0           | Correct no-install path        |
| Missing Runtime, no RUNNER_TEMP                                  | true     | 0              | 0           | Correct fail-closed            |
| Missing Runtime, hosted-like environment, valid Microsoft signer | false    | 1              | 1           | Expected permitted path        |
| Missing Runtime, non-CI with RUNNER_TEMP                         | false    | 1              | 1           | T5-ENV-REVIEW-001              |
| Valid signature, prefixed other organization                     | false    | 1              | 1           | T5-ENV-REVIEW-002              |
| NotSigned                                                        | true     | 1              | 0           | Correct fail-closed            |
| Valid signature, ordinary other publisher                        | true     | 1              | 0           | Correct fail-closed            |
| Installer exit 0 but Runtime still absent                        | true     | 1              | 1           | Correct post-detection failure |
| Installer nonzero exit                                           | true     | 1              | 1           | Correct failure                |
| Installer timeout                                                | true     | 1              | 1           | Correct failure                |

Additional reviewer-run checks:

- Exact helper PowerShell parse: 0 errors.
- Read-only registry detection prefix: Runtime `154.0.4258.62`; installer code was excluded.
- Exact committed diagnostic harness ESLint: 0 messages; Prettier PASS; Node syntax PASS.
- Verification document relative links: 0 issues.
- Governance: 99 tasks/0 violations; features: 34/0; active Markdown: 99/0.
- Exact increment diff check: PASS.
- Full-base→47c0ba6 delivery: 52 files/0 violations. This is structural validation, not proof of safety acceptance or Hosted success.

## Official behavior and workflow

Registry ID/locations, positive version test and `/silent /install` align with [Microsoft Evergreen distribution documentation](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution). Microsoft documents that elevation determines per-machine versus per-user installation; therefore limiting the installation context matters. The fwlink download address is also documented by [Microsoft's MSAL WebView2NotInstalled reference](https://learn.microsoft.com/en-us/dotnet/api/microsoft.identity.client.msalerror.webview2notinstalled).

The workflow continues to run real native acceptance after the actual Windows release build on push/pull_request/merge_group. The installer helper precedes acceptance and fails rather than skipping native checks. The native CDP timeout remains 30 seconds, native assertions and fixture IPC are retained, and artifact upload remains `always()`. No continue-on-error, lowered assertions, reduced native cases or fake success was introduced.

Diagnostic harness inspection confirms immediately recorded owned PID, process exit/signal, CDP readiness, bounded stderr with synthetic-secret redaction and spawn error observation. Existing cleanup still targets the owned PID tree, retains isolated data/profile and cleans only owned fixture credentials. Forced-crash exit codes in the passing local report are intentional test terminations; CDP-ready records are not falsely described as every process exiting successfully.

## Saved evidence inspected

- The saved PR native receipt sourceHead is GitHub test-merge `57337109418379234eaf73c77c5eef98605b690a`, not the source branch SHA.
- Saved log records 30-second CDP timeout, native checks=0 and exit code 1. Failure was retained.
- Valid retry archive `hosted-native-failure-3d415ab-retry.zip` SHA-256 is `00fa34c585af9eafcdf0a97665dd50bad344eb174eb9d56399513d2bc1efea2a`, matching the saved upload log. Its native receipt has passed=false, no checks/launches/requests, and credentialCleanupComplete=true.
- The earlier `hosted-native-failure-3d415ab.zip` is 2,800,615 bytes and cannot be opened as a complete ZIP (central directory absent). It remains preserved but was not treated as validated evidence. The retry archive is 14,568,118 bytes and readable. No logs or archives were rewritten.
- `native-startup-diagnostics.json` is local executor evidence: eleven checks pass, five startups are CDP ready, errors=[], cleanup=true. All nine source hashes match exact 47c0ba6 Git content, accounting for checkout line endings.
- That report retains sourceHead=3d415ab for its precommit execution and the changed harness hash. EXE/bundle match the previous implementation; no claim of a fresh rebuilt business implementation is needed for this diagnostic-only change.
- `runtimeVersion=not-recorded` in that local report is correctly disclosed. The independently detected registry value was not retroactively inserted into it.

## Remaining actions

Repair and add regression coverage for both safety checks, commit the repair, and request an exact-head supplemental review. Run the required Hosted native acceptance on that repaired head; successful local fixture evidence cannot replace the previously failing Hosted gate. TASK-PROV-005/006 and real Provider acceptance remain separate open work.
