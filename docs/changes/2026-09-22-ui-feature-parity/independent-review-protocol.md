# Independent protocol re-review — CHANGES REQUIRED

Snapshot: base/head cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4.
33-file manifest SHA256: c944f043550d2d1840e79746261ef6169af7ef92e2d78370dc101f7c664752ba.
At review entry, every file hash matched the manifest. Product source was frozen while inspected; reviewer changed no project file. This report describes this snapshot, not subsequent fixes.

## Previous findings

- UI-PARITY-R1: CLOSED within local protocol scope. Named SSE event type is retained, raw payload is handled, hello restores conversation/codex/approval queue; activation and snapshot are sent only after hello, and successful registration is required before connected.
- UI-PARITY-R2: CLOSED. ready/warning are usable; idle/preparing/failed cannot send. Warning optional-tool UI exists.
- UI-PARITY-R3 store overwrite: CLOSED. Old connection approval/interrupt replies do not clear new approval or overwrite current state. Review discovered the related UI lock below.
- First idle preparation has an explicit UI action and cannot be sent automatically by connect. Existing session protection is insufficient under the race below.

## UI-PARITY-R4 — P2 — OPEN — action UI lock survives reconnect

File: src/components/AgentConversationMessages.tsx:42 (busy state), :57-69 (act), :92 and :163 (disabled action buttons). The local busy flag is released only after the original action promise resolves; it is not tied to a connection revision.

Independent browser repro on production /assets/index-NkuvjWSf.js: connect fixture running session; hold old POST /agent/codex/interrupt in Playwright routing; disconnect and reconnect through actual settings controls; new hello reports running; emit a new approval. Both Stop and Allow remain disabled=true although the new connection is ready. Switching image channel then Agent unmounts/remounts message UI and restores disabled=false. A lost old response therefore prevents controlling the new connection until a hidden workaround.

Screenshot: C:/Users/Administrator/AppData/Local/Temp/kk-ui-parity-review-stale-action-lock.png.

Suggested bounded fix: bind operation identity/busy/error to connection revision; old finally/feedback must not affect an action in a later connection. Apply corresponding identity handling to AgentComposer pending send state as appropriate. Owner: implementer. Blocks this reconnect interaction acceptance; not a claim of wider product outage.

## UI-PARITY-R5 — P2 — OPEN — preparation can replace a concurrently created session

Files: src/features/agent/agentConnection.ts:705-725, src/features/agent/agentApi.ts:121-129; actual service vendor/canvas-agent/src/server/http.ts:248-253. The client checks local idle/thread state, then sends unconditional /threads/new with only clientId/permissionMode. The real handler immediately begins and resets the conversation. It has no idle or expected-version condition. tests/helpers/agentServer.ts adds a stronger idle guard absent from the vendor, which conceals this difference.

Independent loopback HTTP/SSE reproduction (controlled handler mirrors the real /threads/new reset semantics; no CLI/account/provider invocation): connect idle, begin prepare and hold request transport; another simulated window completes preparation and pushes existing-thread/ready; release original POST; service resets existing-thread to replacement-thread and client returns ok:true. Captured body contained clientId and permissionMode only. This demonstrates the TOCTOU failure without claiming a live multi-window CLI run.

Suggested bounded fix: guard empty-conversation preparation atomically inside the existing service mutation lock with expected conversation/revision and registered client. Prefer a narrowly named preparation endpoint so older servers fail with 404 rather than silently ignoring optional safety fields. If using optional fields on /threads/new, capability negotiation is necessary before trusting an older service. Existing ordinary thread-new behavior need not change. Owner: implementer. Blocks the promise that preparation does not replace an existing session.

## Independent verification

Command: node --test tests/unit/agentApi.test.ts tests/unit/agentConnection.test.ts tests/unit/agentProtocol.test.ts.
Result: 22 tests, 22 passed, 0 failed, exit 0. Includes named hello ready/warning/idle, strict SSE-before-activate-before-state order, approval queue restore, late store replies and failed activation.

Additional browser repro used fresh headless Edge, owned Vite production preview at http://127.0.0.1:1423, bundle /assets/index-NkuvjWSf.js, viewport1920x1080 and fixture credentials only. Owned browser/Vite cleaned up and 1423 released. No project files or historical evidence modified.

No new Tauri release run, real CLI session, paid provider, or hosted checks were executed. Findings and closed statuses above are scoped to this dirty-diff preflight. The original 33-file snapshot remains CHANGES REQUIRED until R4/R5 are fixed and independently rechecked under a new manifest.
