# Independent dirty-diff preflight — initial findings

Review base/head: cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4
Scope: 32 paths in docs/changes/2026-09-22-ui-feature-parity/review-manifest.json
Manifest SHA256: ac790c78667f1a9c0890cac4c5efa728e738812380611f657728f4bc807e3751
All 32 current file hashes matched at review entry. No product files changed by reviewer.

## UI-PARITY-R1 — P1 — CHANGES REQUIRED
New header-authenticated SSE reader discards event names. Vendor canvas/session.ts:534 emits `event: conversation_changed` and raw JSON data, but agentEventStream.ts:35-43 forwards only data while agentConnection.ts:400 requires wrapped {type,data}. Actual events cannot update readiness, messages, permissions or completion. Fixture incorrectly supplies wrapped data instead of the vendor protocol. In addition, the initial vendor stream sends hello containing conversation/codex/pendingApprovals; it is not consumed, so a previously ready service can still time out after the event framing fix.
Evidence: injected ReadableStream through actual createAgentConnection fetch path with `event: conversation_changed\ndata: {"revision":1,"conversationId":"c1","threadId":"t1","status":"ready","mcpStatuses":{}}\n\n`; after 6200ms status=error, conversation=null. Separately wrapped hello with a ready conversation also gives status=error, conversation=null. No actual CLI/provider invoked.

## UI-PARITY-R2 — P2 — CHANGES REQUIRED
agentConnection.ts:211-215 accepts ready/running but rejects warning. Vendor canvas/session.ts:147-155 produces warning when optional MCP startup fails while required infinite-canvas is ready; server/http.ts:307 explicitly permits ready/warning turns. With wrapped conversation_changed status warning, the client retains conversation.status=warning but becomes connection error after 6200ms. The removed timeout fallback exposes this state as permanently disconnected. Accept warning as usable and surface optional MCP information accurately.

## UI-PARITY-R3 — P2 — scope-related existing defect
agentConnection.ts:600-601 applies a late resolveApproval success without binding it to connection revision and requestId. Repro: old approval response pending; disconnect/connect; new approval arrives; release old HTTP200. pendingApproval changes from new to null, activity becomes already responded, leaving current operation without its approval control. Parent explicitly included this existing candidate defect in current lifecycle acceptance; it was not newly introduced by this task.

## Related existing bootstrap gap
Vendor new session starts idle with no thread; only /agent/codex/threads/new prepares it. Current client does not initialize a thread. Fixing framing and hello alone does not make first-install idle sessions usable. Accurate initialisation UI or scoped preparation contract is required before claiming this path works. Existing active sessions must not be reset.

## Independent verification
- node --test tests/unit/agentApi.test.ts tests/unit/agentConnection.test.ts tests/unit/promptLibrary.test.ts: 24 passed, 0 failed.
- Headless msedge production preview, owned Vite process at 127.0.0.1:1423, loaded /assets/index-DT_O-4NH.js. Fresh context + controlled loopback Agent fixture, no credentials except fixture token.
- Collapse and reopen keeps Agent draft; new project has separate empty Agent draft. App uses hidden workspace/panel rather than unmounting. No draft-loss finding.
- Stable Agent UI after resize: 390 width send right326/panel right356/scroll=client281; 768 right704/right734/358; 1920 right1715/right1743/468. No persistent horizontal overflow. The immediate-after-resize failure is consistent with transition sampling.
- Owned browser and Vite process closed; port 1423 released.
- No Tauri release launched or verified by reviewer. No real CLI/provider acceptance claimed. This is dirty-diff preflight, not committed final review.
