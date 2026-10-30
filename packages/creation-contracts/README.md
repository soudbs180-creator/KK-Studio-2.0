# Creation contracts 1.1.0

This platform-independent TypeScript package carries KK's existing durable task, draft, attachment, output, cost receipt, image edit, provider capability and original asset identity facts. Existing task helpers keep their behavior. New declaration validation uses Zod 4.6.7 (MIT) and semver 7.8.5 (ISC); @types/semver ships with this source package so isolated TypeScript consumers can compile it. Its public entry is `index.ts`; direct workspace tests use Node 24 type stripping, while Expo/Metro and other bundlers consume the installed TypeScript source.

Mobile consumes `@kk-studio/creation-contracts` through a local file dependency. Desktop/Web continue using their current implementation; this restoration does not replace their runtime. Root project/canvas storage normalization and retry-child reconciliation remain in their existing owner.

`canRetryTask` rejects submitted and unknown work. `retryableOutputIndices` additionally excludes successful and unknown slots, while preserving KK's legacy output-vector fallback and interrupted unsubmitted intent behavior. Mobile must persist an explicit output vector for new tasks and mark a potentially accepted provider request unknown before offering retry. A network abort is not provider cancellation confirmation.

`recoverInterruptedTask(task, now)` keeps terminal task identity unchanged; queued unsubmitted work becomes interrupted intent, and running/submitted/unknown work becomes unknown. It preserves original attachments, output identities, receipt fields and idempotency key. It does not reconcile a provider, persist state or start another request.

`markArchiveFailuresUnknown` retains successful originals and fences unarchived provider results. Archive recovery must retain provider receipt/result content in adapter-owned durable storage instead of resubmitting paid work. Wire interfaces describe facts only; adapters remain responsible for validation, HTTPS, secret vaults and immutable byte/hash verification.

Package typecheck uses only ES2022 standard library types, with no DOM or Node ambient types. Local contract and regression tests are evidence of pure behavior only; real Provider, device, native persistence and release acceptance remain separate.

## Business capability declarations (P1 candidate)

`capabilityManifestSchema` validates `BusinessCapabilityManifest`, including adapter compatibility with this package version, literal hostname permissions, local dependency checks, platform availability and degradation. The existing `CapabilityManifest` in `wire.ts` still describes provider modalities/operations and is unchanged. Defaults normalize a new declaration, never old project data.

`TaskPort`, `AssetPort` and `ProviderPort` are pure interfaces over existing task, archive and provider facts. They own no queue, status, storage, credentials or adapter implementation. Cancellation requests do not confirm provider cancellation. Task submission accepts an already prepared durable task; original approval and idempotency guards still apply. Asset `preview` follows the existing archive's original data URL contract.

The schema checks only local `uses` identity/self references. Cross-manifest graph cycles, card existence, registry resolution, permission enforcement and runtime wiring remain P2/P5/governance work. See the [P1 design and mapping](../../docs/changes/2026-10-28-capability-contract/spec.md). Reverting this additive 1.1.0 API to 1.0.0 requires no data migration.

Type-check profile: the existing tsconfig keeps ES2022, types=[] and skipLibCheck=true. A stricter ES2022-only consumer with skipLibCheck=false currently fails on four upstream Zod URL declarations. That stricter profile is not supported by this candidate; no DOM shim or dependency patch is provided. The failure is retained separately from the successful project-profile consumer build.
