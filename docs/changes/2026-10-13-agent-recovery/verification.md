# Verification

Status: daily-profile follow-up PARTIAL; 2.1.17 fixes and final repeat acceptance in progress. Completed 2.1.16 evidence below remains historical and unchanged. Mobile remains 2.1.1. This package covers TASK-AGENT-RECOVERY-20261013, not the overall Agent/provider/release programme.

## Actual daily-profile follow-up

The user explicitly requested further normal close/reopen against the daily APP and original data/profile. Computer Use selected the canonical APP window; no isolated data argument, profile, CODEX_HOME or synthetic key was used. The existing selected project has a thread but no messages; identity is compared using project/thread digests, without recording IDs or conversation content.

At 2.1.16, process 83652 closed normally with exit 0; the GUI launcher reopened process 87180 using default data. Without clicking connect, settings showed connected, disabled connected primary and enabled disconnect. Project/thread, all 10 project identities, three canvas items and provider metadata were unchanged. Explicit disconnect remained paused; normal close of 87180 exited 0; GUI reopen 75784 remained disconnected, with reconnect enabled/disconnect disabled and the same project/thread and provider metadata.

Daily API evidence is configuration continuity only: the single existing record and address/model remain unchanged byte-for-byte. Before any close, the original effective credential read showed missing (empty input with the normal entry placeholder and no loading/error); that state remained after reopen. No key was revealed, entered, saved, deleted or tested against a provider. Existing user-key retention is NOT VERIFIED by this baseline; missing before restart cannot be reported as restart-induced loss or saved-key recovery PASS. No substitute key is inserted into daily data.

Two real UI inconsistencies were observed: the connected chat banner appeared red because a generic `p[role="status"]` danger-color selector overrode normal styling, and chat exposed enabled reconnect plus ordinary new-conversation controls while settings used a disabled connected primary and advanced new conversation. Focused RED/GREEN regressions and 2.1.17 repair are in progress. Saved/missing credential state also receives explicit platform-correct text; metadata is not used as a credential-presence claim.

Raw daily receipts stay local at canonical `.tmp/daily-app-reopen-20261013/`; the versioned record contains only non-secret identity hashes, counts, state flags and metadata equality. An attempted offscreen connection-row click closed settings; reselection is NOT VERIFIED and not counted as acceptance. The GUI launcher itself has no targetable window, so its main APP window and newly created process are independently selected and checked.

## Source and preservation

- Baseline `e0875b3d3f595a5570702a6ff3e45b8b76b5c861` preserves the original dirty UI candidate, parent canonical HEAD `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c`.
- Final production source is `6f8ff257e8996eaf11ca4446e8781dd10d9aa1d9`. Full verification ran at `59c013ce478d1a4c556da82067b0d69aa625ad4e`; its production tree is unchanged. `1cf93cb42ba335e3197d5c282cac33749358c524` adds only a native-test credential isolation guard.
- Only owned changes were integrated into `D:/kk-studio/KK-Studio-2.0` after comparing current content with the preserved baseline. Original files and SHA manifests are in `D:/kk-studio/.tmp/agent-recovery-integration-8953b2e8-31e0-4a80-8624-a8a2ba1e973c/`. That integration preserved original index bytes `5f55ebe547973db9f57cbca5b1775e4319a3dd6d1112e2ef3f8dcc923406cf53`. Later canonical status inspection changed index bytes to `b5e238b1f1b5ca850d4137a6a89fb1f4be96759459091f633dee63b376420bf4`; staged entries still match original HEAD tree `868c52bc5d96b2b9e829e7b1263f1752cb776a35` (`git diff --cached --quiet`, exit 0). No canonical staging, commit, reset or index restore was performed; preservation is semantic, not a claim that all later Git index bytes are identical.
- All declared official release source inputs, excluding generated `dist`, match the verified candidate: 712 actual files by exact bytes or CRLF/LF text equivalence, plus two matching absent-input markers (`tsconfig.app.json`, `tsconfig.node.json`), for 714 entries. [No mismatches](evidence/integrated-source-comparison.json). Canonical remains a dirty integration at its original HEAD, not a committed candidate or published main.

## Complete local checks

`npm run verify` at `59c013ce` completed with exit 0, 2026-10-13 11:26:49 UTC. Lint, typecheck, unit/deploy, Agent, UI, format, production build, full browser and development-plugin stages all passed. `KK_CONTAINER_ROOT=D:/kk-studio` supplies the actual repository container to the snapshot check; no rule was bypassed.

| Check | Result | Evidence |
| --- | --- | --- |
| Node unit/deploy | 1,076 pass; 0 fail; 14 existing skips | [Summary](evidence/verification-summary.json) |
| Agent suite | 172 pass; 0 fail; 2 existing skips | [Summary](evidence/verification-summary.json) |
| Full production browser, Edge / 1423 | 514/514 pass; zero skipped, unexpected or flaky | [Summary](evidence/verification-summary.json) |
| Development plugins / 1421 | Four plugins discover/render/edit; disable/reload/enable; unsafe remote request rejected | [Receipt](evidence/development-plugins-receipt.json) |
| Rust release tests | 126/126 pass; format check exit 0 | Task `.tmp/rust-final.log`, `.tmp/rust-format-final.log` |
| Durable full-run process | COMPLETE, exit 0 | [Exit receipt](evidence/full-verify-exit.json) |

Browser fixtures invoke real frontend and loopback logic with synthetic IPC/provider state. Startup observation begins before page navigation and checks attempted `/turn` requests, including rejected attempts. These fixtures are not native execution or real paid-provider evidence. Agent style evidence additionally covers 1920/1099/390 widths and one primary reconnect action. Unit/Rust fault regressions cover failed preparation, late events, project switching, invalid durable records, committed-cache/preference failures, CAS conflicts and independent-process serialization.

## Real candidate desktop

The official task `start-kk-studio.bat` freshness path rebuilt the release and executed the actual Tauri/WebView2 application. Agent recovery acceptance passed 38/38 checks with separate data, profile and CODEX_HOME. Its receipt binds production source `6f8ff257`, input fingerprint `98891f7a23bd217d67f1e83750a14402579b57195576f57c9e8f2d01bbdc6b92`, EXE SHA256 `aaa46e22b9ef95308f33e1d89d0678160d5c2ac202aecad1e2b2bfa26a092848`, and loaded JS `index-C4eyZL54.js` / CSS `index-DeEjVB-7.css`.

Verified native behavior: home starts the owned service without creating a conversation; project initialization saves the thread; reload and normal close/reopen restore that same thread; explicit disconnect persists across reopen; manual restore and stop/restart retain ownership; unknown ownership refuses replacement; exported/native/browser metadata contains no synthetic secret; a unique real Windows credential survives reopen and is removed during owned cleanup. See [Agent receipt](evidence/candidate-agent-native.json) and [reopened UI](evidence-manifest.json).

Provider acceptance passed six checks against that same candidate EXE: committed key status without plaintext refill, WebView reload, actual UI normal close with process exit 0, process reopen retaining endpoint/model/reference/saved status, secret-free native/browser metadata, and normal cleanup close. Only a unique synthetic reference accesses the real vault; unrelated credential probes are isolated. [Provider receipt](evidence/candidate-provider-native.json), [reopened settings](evidence-manifest.json).

Native `/turn` observation starts after CDP attachment and records zero observed requests; the pre-attachment interval is NOT VERIFIED by native instrumentation. Fixed Google native vault access is NOT VERIFIED: Google uses the tested shared transaction boundary, real component/preference fault tests and source review, while these native runs protect existing fixed references. No real account or paid model call is used as acceptance evidence.

## Canonical delivery

The official canonical bat rebuilt the stale release and passed all 38 native Agent checks. The actual EXE at `D:/kk-studio/KK-Studio-2.0/src-tauri/target/release/kk-studio.exe` is SHA256 `b3715cc0eb8ddd03cc2ff329ff23422824946e4ae0f5f4e83ad09bd8f3ed9155`; input `e5faac471d9c30d582147c9c25381404fa98c8a3e2528307bbcd1ff52ec1e28f`; build receipt `9a2835f8abc5bcff093367ccfb09f0f9d55c86f0745ec546f3c43a18d002de80`. Its three starts load the same JS/CSS as the candidate and finish with `reason: current`. [Agent acceptance](evidence/canonical-agent-native.json), [build receipt](evidence/canonical-build-receipt.json), [reopened UI](evidence/canonical-reopen-connected.png).

The fresh canonical EXE then passed all six provider checks, including two normal UI closes with actual exit 0 and reopening the same isolated profile/data. Unique credentials are removed; owned processes and debugger listeners are absent after cleanup. [Provider acceptance](evidence/canonical-provider-native.json), [source/build binding](evidence/canonical-provider-binding.json), [reopened saved state](evidence-manifest.json).

`npm run client:shortcut` exited 0 and regenerated the canonical GUI launcher plus the repository and Desktop “启动 KK Studio” links. Both links point to the canonical launcher, use the canonical working directory, and have no isolated-data arguments. Previous shortcut metadata is preserved in `.tmp/launcher/`. [Shortcut receipt](evidence/canonical-shortcut.json). No user-data or credential directory was moved or cleared.

Final delivery lint, affected format and diff checks exited 0; canonical lint also exited 0 after the approved evidence package was copied. [Document checks](evidence/delivery-document-checks.json). Independent delivery review at `b3bdc3d29d0a2912bda4d2d0ac7a85b8bb6100c1` is PASS, with no open finding; source-file counting and Git index byte/semantic distinctions are explicitly corrected. [Delivery review](evidence/independent-delivery-review.json).

The actual daily Desktop shortcut was then opened successfully: canonical APP process 83652, file version 2.1.16, matching EXE hash, normal startup with no isolated `--data-dir` argument. It remained responsive. This is an entry/process proof, not inspection of default credentials or a real-provider response. [Daily app entry](evidence/daily-app-open.json).

## Earlier failures and limits

Earlier diagnostic native runs found project-package rejection of `agentThreadId`; schema and Rust round-trip were fixed before the successful native run. An initial full-check session lost its process result; a later old-fixture run was stopped through its owned process identity; another run had 511/514 browser passes with three outdated transaction/idle fixture failures. These are not counted as complete PASS. The final 514/514 run uses the repaired fixtures and unchanged assertions about CAS, busy state, credential state and late results.

An earlier forced-kill provider run retained vault/native metadata but did not recover the selected profile/endpoint; it remains failed evidence. Final acceptance uses normal user close and actual process exit. This task does not claim selected-profile recovery after arbitrary forced termination or atomic crash commits across metadata and Windows Credential Manager. Current-session cooperating application entrances share the Windows transaction lock; older binaries and external vault tools do not obey that protocol. See [ADR-016](../../architecture/adr/ADR-016-agent-and-provider-recovery.md).

The user-requested foreign previews at 1423 were preserved and released the port naturally. Only this task's owned verified processes and unique credentials were cleaned up. Hosted CI, signing, installers, formal publishing, real provider/GPU output and human visual acceptance are separate evidence boundaries.


## 2026-10-30 历史原始证据外置说明

本次ORG-6将历史E2截图/原始日志/录屏外置到容器output；原引用现指向[2026-10-13-agent-recovery manifest](evidence-manifest.json)。原始sourcePath、commit/blob、sha256、大小与原链接目的地逐项可查；原图片嵌入改为同文字的清单链接。原结论、失败、时间和数字未重写，不代表当前功能重新验收或main已合流。E1摘要、JSON、关键图及活跃运行资料仍留仓；恢复仅写新空目录并复核字节。
