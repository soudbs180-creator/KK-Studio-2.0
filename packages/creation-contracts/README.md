# Creation contracts 1.0.0

This pure TypeScript package carries KK's existing durable task, draft, attachment, output, cost receipt, image edit, provider capability and original asset identity facts. It has no runtime dependencies. Its public entry is `index.ts`; Node 24 strips types and Expo/Metro consumes the same source.

Mobile consumes `@kk-studio/creation-contracts` through a local file dependency. Desktop/Web continue using their current implementation; this restoration does not replace their runtime. Root project/canvas storage normalization and retry-child reconciliation remain in their existing owner.

`canRetryTask` rejects submitted and unknown work. `retryableOutputIndices` additionally excludes successful and unknown slots, while preserving KK's legacy output-vector fallback and interrupted unsubmitted intent behavior. Mobile must persist an explicit output vector for new tasks and mark a potentially accepted provider request unknown before offering retry. A network abort is not provider cancellation confirmation.

`recoverInterruptedTask(task, now)` keeps terminal task identity unchanged; queued unsubmitted work becomes interrupted intent, and running/submitted/unknown work becomes unknown. It preserves original attachments, output identities, receipt fields and idempotency key. It does not reconcile a provider, persist state or start another request.

`markArchiveFailuresUnknown` retains successful originals and fences unarchived provider results. Archive recovery must retain provider receipt/result content in adapter-owned durable storage instead of resubmitting paid work. Wire interfaces describe facts only; adapters remain responsible for validation, HTTPS, secret vaults and immutable byte/hash verification.

Package typecheck uses only ES2022 standard library types, with no DOM or Node ambient types. Local contract and regression tests are evidence of pure behavior only; real Provider, device, native persistence and release acceptance remain separate.
