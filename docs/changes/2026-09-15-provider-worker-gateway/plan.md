# Plan

## Gateway runtime completion

**Goal:** Run an authenticated Node 24 Gateway and independent durable Worker with SQLite transactions, private asset storage, and no provider credentials in client payloads.

**Architecture:** `src/features/generation-server` owns the Node process and SQLite state. Existing client contracts remain compatible; only connection IDs and task inputs cross the client boundary. The server resolves an explicitly registered provider, checks principal ownership, records one output slot per requested result, and reserves credits and connection budget in a single `BEGIN IMMEDIATE` transaction. Worker leases carry fencing tokens; terminal updates use compare-and-swap.

**Constraints:** One checkout, preserve dirty UI changes; no subscription OAuth or account pooling; no real paid requests in tests; no production credentials in config, database, browser, snapshots, URLs, or logs. User keys are supplied through the host credential resolver/request memory. Platform mode stays off until explicitly configured.

### 1. Durable repository and accounting

- [x] Add `src/features/generation-server/schema.sql` and `repository.ts`: jobs, per-output attempts, reservations/settlements, credit accounts, connections/controls, webhook receipts, assets/ownership, authentication token hashes remain process-memory only.
- [x] Add `tests/unit/generationServer.test.ts`; verify real file-backed SQLite reopen preserves idempotency and held credit; simultaneous submissions cannot exceed credit/concurrency/cost caps.
- [x] Implement `submit(ownerId, input)`, `claim(workerId, now)`, fenced `complete/fail/cancel`, `retry(ownerId, jobId, indices)` and settlement once per output generation. Missing balance fails closed.

### 2. Independent Worker and adapters

- [x] Add `provider.ts` and `worker.ts`. Use existing reviewed adapter contract with host-only secret and fetch injection; issue one provider request per output to preserve individual retry and immediate archival.
- [x] Recover known async provider IDs by polling. Unknown in-flight synchronous submit after crash enters manual review rather than resubmitting and risking duplicate charges. Preserve automatic attempt idempotency keys; explicit manual retry gets a new generation key.
- [x] Test 1/4/20/100 outputs, 429 seconds/date headers, 401/403/scope/project quarantine, bounded 503, all cooldown, cancellation while download runs, partial output retry and old lease fencing.

### 3. Private object storage, authentication and webhooks

- [x] Add `assets.ts`: stream with byte limits; verify content-type/signature/Content-Length, SHA-256, write private content-addressed object before owner mapping. No provider URL is persisted or returned.
- [x] Add `http.ts` / `main.ts`: authenticated submit/list/status/retry/cancel/assets, admin controls, signed webhook route, capped bodies, origin policy, safe error messages, health endpoint; start Worker independently of HTTP disconnects.
- [x] Verify HMAC signature, current signed timestamp, attempt correlation, delivery key AND event ID deduplication, body-hash conflict, durable pending receipt and monotonically increasing sequence. Retry pending webhook application after a crash.
- [x] Add Node CLI environment configuration and executable command. No default user, token, balance or provider.

### 4. Evidence and review

- [x] Run real SQLite + local fake provider HTTP integration tests; restart process/repository and test owner isolation and secret canaries.
- [x] Run `npm run verify`, record any concurrent unrelated failures exactly; run browser 1421/1423 and Tauri release identity after final source build. Update architecture/verification/progress with deployed vs local boundaries.
- [x] Review original prototype findings, audit the new runtime source, and resolve material findings before reporting completion.

1. 建立 zod 领域 schema、SQLite migration 和持久化接口。
2. 将现有 OpenAI/Gemini/ComfyUI Adapter 接入 Adapter Gateway，并提供不携带密钥的 HTTP Gateway client。
3. 实现租约恢复、死信、人工重试、取消围栏、结果下载校验和内容寻址归档。
4. 实现额度预留/结算/退款及连接控制面（禁用、轮换引用、成本上限、全局熔断）。
5. 用单测覆盖批量大小、错误、Webhook、断线/重启/晚到结果和敏感字段。
