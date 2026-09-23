# Independent final scoped dirty-diff preflight — PASS

Reviewed at 2026-09-22 (Asia/Shanghai).
Worktree: C:/Users/Administrator/.codex/worktrees/ui-feature-parity/KK-Studio-2.0.
Base/head: cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4.
37-file review-manifest.json SHA256: 539153322fb39780e660faf1ad6035c49b28ca9f2b4d071db4768975134804f9.
All 37 file hashes matched at review entry and completion. Reviewer changed no project file.

## Conclusion

PASS for the scoped local dirty-diff review. UI-PARITY-R1 through R5 are closed in the examined snapshot. No remaining evidenced P1/P2 was found in the requested protocol, reconnect-action and conditional-preparation scope. This is an independent AI preflight, not a committed final review, hosted approval, release acceptance or user product acceptance.

## R4: reconnect action lock — CLOSED

Store exposes connectionRevision. ConversationPanel keys AgentConversationMessages by that revision, discarding old busy/error state. AgentComposer preserves its drafts but resets old busy/feedback/reference when the connection changes; completion/catch/finally only apply to the matching request revision.

Fresh independent browser tests confirmed that a held old interrupt or turn request cannot disable actions after reconnect, the new approval remains actionable, the Agent draft survives, and a late old error is not shown as the new request's failure.

## R5: concurrent preparation replacing existing session — CLOSED

Client calls only POST /agent/codex/conversation/prepare with expectedConversationId/revision. It does not fall back to the unconditional threads/new endpoint. A 404 clearly reports that the old service does not support safe preparation.

Tracked scripts/agent/prepareIdleConversation.ts is shared by the fixture and installed service. It validates registered client, idle state, empty thread and expected identity/revision before any mutation. Its authoritative check and begin are synchronous with no intervening await. Installed route invokes it inside the existing codexMutation wrapper, whose try/finally holds the lock across the awaited preparation. Existing thread-new behavior remains intact.

The race test delays the preparation POST while another window creates a ready thread. The shared handler rejects it without mutation, and client/server retain the other thread. Direct handler tests also reject disconnected, stale, existing-thread and preparing cases with zero mutations.

## Installer verification

Ran scripts/agent/install-idle-preparation.mjs against an independent temporary copy of the original vendor HTTP source at C:/Users/Administrator/AppData/Local/Temp/kk-agent-installer-review-EWh9Dt.

- Removing only the inserted import and bounded route reconstructs the original HTTP source byte-for-byte.
- Second installation leaves both HTTP source and helper unchanged.
- Locally modified helper is rejected without overwriting either helper or HTTP source.
- Locally modified preparation route is rejected without overwriting it.
- Installed HTTP SHA256: f657b16176fcd406886c0f7e35dd2e1d979d9d3e59db4408eb83d7b4bc04909c.
- Installed helper SHA256: e5acf05a1731e1e437cf2097b9d03dea168c3e0b393acf0302b90aca0f538bbe; matches tracked template.
- package agent:build runs the installer before tsc; npm run agent uses that build path.

## Fresh independent commands/results

1. node --test tests/unit/agentApi.test.ts tests/unit/agentConnection.test.ts tests/unit/agentPreparation.test.ts tests/unit/agentProtocol.test.ts — 28 passed, 0 failed, exit 0.
2. node node_modules/@playwright/test/cli.js test tests/browser/ui-feature-parity.spec.ts --grep 'pending old|Agent (idle|warning)' --retries=0 --reporter=list --output C:/Users/Administrator/AppData/Local/Temp/kk-ui-parity-review-final-browser — 4 passed, 0 failed, exit 0.
3. node node_modules/typescript/bin/tsc -p C:/Users/Administrator/AppData/Local/Temp/kk-agent-prepare-build-e9p474sm/tsconfig.json --noEmit — exit 0. That full-source temporary integration has the same installed HTTP/helper hashes above.
4. Independent installer preservation/idempotence/refusal experiment — all assertions passed, exit 0.

Browser tests used Edge production preview at http://127.0.0.1:1423 with current dist entry /assets/index-HYgoeN0v.js and /assets/index-C-iCNdfc.css. Test contexts and loopback fixtures were isolated; no real CLI/account/Provider call was made. Playwright-owned preview terminated and no listener remained on 1423.

## Evidence limits

This final pass closes the prior scoped findings and supplements earlier reviewed UI work; the reviewer did not rerun the whole application suite in this pass. The implementer's 12-browser full feature file result was inspected, while 4 relevant browser cases were independently rerun. No Tauri release was launched and no real CLI/provider or hosted gate was accepted. Original-engine integration, full verify on that integrated tree, Desktop rebuild/runtime evidence and any future committed-head review remain separate gates. The ignored vendor service in the source worktree was not modified by this reviewer; only temporary copies were installed/typechecked.

## Narrow addendum: channel-selector extraction — PASS

Follow-up snapshot: base/head cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4; 38-file manifest SHA256 8de1d69cf0262d820fb806c690ea639f63b97b191d1b72938ba875fb0ae9619b. All 38 current file hashes matched the manifest. This addendum extends the prior scoped PASS to the two-file presentation-only extraction below; it does not reopen or repeat the closed protocol review.

Reviewed only src/components/ConversationPanel.tsx and new src/components/ConversationChannelSelector.tsx for the final delta. Selector preserves the original div class conversation-channel, role=group, accessible name, two type=button controls, ui-capsule classes, image/Agent labels and aria-pressed values. It introduces no state or side effects. Parent retains channel ownership, clears pending image approval only when selecting Agent, and clears status on either selection. The existing connectionRevision key on AgentConversationMessages remains intact. ConversationPanel is now 282 lines.

No actionable P1/P2 found in this extraction. This is static source/manifest equivalence review; no browser or full test rerun was performed in this narrow pass. Port 1423 was not used. The implementer is running integrated full verification separately; its completion is not asserted by this addendum. All earlier Desktop, real CLI/provider, committed-head and hosted-gate limitations remain unchanged.

Pre-addendum report SHA256 for traceability: 640d9260f3573f661ad8d9acc2d4db01b976131dc0d748f2bdac73b8b2c53e04.

## Final formatting addendum — PASS

Final snapshot: base/head cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4; 38-file manifest SHA256 75925f0d6c0cbbb3bd27818c5466f3d278e12e63f5b33abbf3cde4852b07ad6b. All 38 current file hashes match the final manifest.

Inspected src/features/agent/agentApi.ts again, specifically the formatted new Error(message, { cause: error }) call. The 404 predicate, message, cause, rethrow path, preparation endpoint, expected identity/revision body and absence of threads/new fallback retain the previously reviewed behavior. Current agentApi.ts SHA256: 0a4be08f48caaa14bddd9f124be7695f6da739b193b25b0638428c690c898cdd. No new actionable finding; the prior scoped PASS extends to this final formatting snapshot.

No tests or servers were run for this formatting-only check; port 1423 was not used. Integrated full verify remains the implementer's separate current run. Prior verification scope and limitations are unchanged.

Pre-addendum report SHA256: 66a4573c392a48da01d8af7f5fd4b24f98a5a497e36cc6062edd8d6f6a9c49e3.
