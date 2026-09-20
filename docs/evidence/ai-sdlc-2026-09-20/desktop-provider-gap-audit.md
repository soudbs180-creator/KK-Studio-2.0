# Desktop Provider Gate Audit

**Checked:** 2026-09-20  
**Checkout:** `codex/TASK-GOV-002-ai-sdlc` at `8aca3abdd6386b6d6cee7fd9836e27e5aec38eab`  
**Scope:** read-only audit of the current Desktop image submission path; no Rust or product-code changes are included in this audit.

## Verified path

Task creation does perform a provider check. `src/features/creation/imageTaskCommand.ts:61-110` validates the image input, resolves or preserves a `ProviderConnection`, calls `hasApiKey`, and binds `connection.id`, `baseUrl`, and `credentialRef` into the task. On Desktop, `hasApiKey` reaches `credential_get` through `src/features/creation/providerCredentials.ts:67-87`; the Windows command reads the system credential store in `src-tauri/src/main.rs:356-370`. A missing credential therefore fails closed before the task is appended.

## Confirmed gap

`src/App.tsx:423-432` reserves a provider lease only when `nativeTaskHost` is false. The Desktop branch then writes the intent, flushes it, and calls `submitNativeTask` at `src/App.tsx:438-464` without `reservation.assertCurrent()`. During or after the creation check, a connection can be disabled, quarantined, cooled down, or reach its recorded concurrency limit without blocking the native submission. Independent projects can therefore bypass the browser-side `activeJobs` limit.

The Rust host validates the raw request and its idempotency/fingerprint, then reads the credential by `credentialRef` (`src-tauri/src/task_host.rs:225-273`, `:704-760`, `:402-421`). It has no `ProviderConnection` state, lease, health revision, or concurrency contract. Deleting the credential still fails closed before the provider request, but provider state changes do not.

The native branch returns at `src/App.tsx:613-636` before the Web health bookkeeping at `:799-821`. The catch path only records provider failure when a browser `reservation` exists (`src/App.tsx:882-904`); native submissions currently have none. Native 401/403/429/5xx/network outcomes therefore do not update quarantine, cooldown, or degraded state, and native success does not mark the connection healthy.

Rust already returns structured failure data: `TaskHostFailure { failure_class, status, retry_after_seconds, message }` in `src-tauri/src/task_host.rs:54-62`, carried by `JobRecord.failure` at `:66-76`. The TypeScript adapter instead declares `failure?: string` and reduces an object to its message (`src/features/creation/nativeTaskHost.ts:35-43`, `:104-111`), so the health class, HTTP status, and retry-after value are discarded.

## Test coverage boundary

`tests/unit/nativeTaskHost.test.ts:37-76` covers adapter command forwarding and identity; `:78-131` covers missing-record reconciliation. `tests/browser/task-intent.spec.ts:198-263` uses a browser HTTP route and a Tauri storage mock, but does not mock `task_host_submit` or native provider outcomes. There is no current Desktop IPC regression that proves reservation, disabled/quarantined/cooldown blocking, concurrency, or native health updates.

## T5 disposition and smallest reliable follow-up

This is a **T5 acceptance blocker**, separate from the already implemented durable intent, stable idempotency, journal, and unknown-state protections. The smallest front-end follow-up, without expanding the Rust host, is:

1. Create the same `reserveProviderSubmission` lease for the native binding and call `reservation.assertCurrent()` immediately after the durable flush and immediately before `submitNativeTask`.
2. Always release the lease in `finally`.
3. Preserve the Rust failure object in `NativeTaskHostRecord`; map its failure class/status/retry-after into the existing `markProviderConnectionFailure` path and mark success healthy only when the lease health revision is unchanged.
4. Add an IPC-mock regression covering native submit, state change before submit, structured 401/403/429/network outcomes, and concurrency.

The lease is browser-profile metadata and is not a crash-recovery ledger. If the process dies after reserving, `activeJobs` can remain stale while the native journal converts `submitted` to `unknown` (`src-tauri/src/task_host.rs:191-220`). Any implementation must therefore add lease reconciliation/expiry evidence before claiming the full Desktop gate is complete.
