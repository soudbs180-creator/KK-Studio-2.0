# Web 本机伴随服务实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个只监听本机、可配对、可恢复的 Web 本机伴随服务，使项目快照和素材在用户设备上有明确的耐久存储根，并能安全导入现有 IndexedDB 数据。

**Architecture:** 新增纯协议模块、Node 24 loopback 服务和文件存储仓库；浏览器端通过 HttpOnly 会话 cookie 调用服务，显式连接后才切换创作快照/素材的耐久读写。旧 IndexedDB 在迁移完成前保留为恢复源，所有写入使用 revision、内容 hash 和 staging 原子发布。

**Tech Stack:** TypeScript（Node 24 type stripping 与浏览器 ES modules）、Node `http`/`fs`/`crypto`、现有 Zod、React 设置页、Node test runner、Playwright、现有 Vite/Tauri 验收脚本。

**Spec:** `docs/superpowers/specs/2026-09-29-web-local-companion-design.md`

## Global Constraints

- 服务只绑定 `127.0.0.1`，默认端口 `4319`；不得开放局域网或公共网卡。
- Web 服务会话只通过 HttpOnly `kk_companion_session` cookie 发送；配对码、会话明文、Provider credential 不进入 `localStorage`、URL 或日志。
- 默认连接开关关闭；升级不能静默迁移、删除或覆盖旧 IndexedDB。
- 项目快照必须经过现有 `snapshotCodec` 校验；服务端未知 schema/version 或引用不完整时拒绝发布。
- 素材必须校验 MIME、1–100 MiB 大小、完整 SHA-256 与 `asset-<sha256前24位>` 身份；临时 Provider URL 不落盘。
- 所有文件发布先 staging、回读校验，再原子替换；失败保留旧主文件和备份。
- 不新增运行时依赖；Web bundle 不得包含 `node:fs`、`node:http` 或 Node 服务入口。
- 真实账号登录由 `BACKEND-PLATFORM` 负责；Mobile 由 `T12` 负责；本任务完成前账本不可标记 DONE。

## Review Focus

- 配对码重放、来源不在白名单、缺失/过期 cookie：服务必须拒绝且不留下会话；由 Task 2 的 HTTP 测试覆盖。
- 主快照损坏、`.bak` 也损坏、revision 过期和并发写入：必须恢复或返回冲突，不能创建空项目；由 Task 1 的 store 测试覆盖。
- 素材 hash、MIME、大小和 metadata 不一致：必须拒绝并保留旧 blob；由 Task 1 的 asset store 测试覆盖。
- 迁移中途断开、manifest 不匹配或缺少引用素材：旧 IndexedDB 和服务主目录必须字节不变；由 Task 4 的 migration 测试覆盖。
- 服务断线、401、409、协议不兼容：Web 不能显示“已保存”，且必须提供重试、只读恢复或重新配对状态；由 Task 3/5 的 client/browser 测试覆盖。

---

### Task 1: 协议、文件仓库与迁移 manifest

**Files:**

- Create: `src/features/local-service/protocol.ts`
- Create: `src/features/local-service/store.ts`
- Create: `src/features/local-service/manifest.ts`
- Create: `tests/unit/localServiceProtocol.test.ts`
- Create: `tests/unit/localServiceStore.test.ts`
- Create: `tests/unit/localServiceManifest.test.ts`
- Modify: `src/features/creation/snapshotCodec.ts` only if a pure shared validator export is needed

**Interfaces:**

- Consumes: `CreationSnapshot`, `StoredGeneratedAsset`, `decodeSnapshot`, existing asset ID/MIME limits.
- Produces: `serviceProtocolVersion`, Zod request/response schemas, `CompanionStore`, `writeSnapshot(expectedRevision)`, `readSnapshot()`, `stageAsset()`, `preflightImport()`, `publishImport()`, `createBackup()`, `restoreBackup()`, and canonical manifest hashing.

- [ ] **Step 1: Write failing protocol tests** for valid health/pair/session/snapshot/asset/migration/backup payloads and rejection of unknown keys, invalid IDs, invalid revisions, oversized metadata, and secrets.
- [ ] **Step 2: Run `node --test tests/unit/localServiceProtocol.test.ts`** and confirm failures are caused by missing protocol exports.
- [ ] **Step 3: Implement `protocol.ts`** with strict Zod schemas, stable error codes, bounded strings, origin and asset ID helpers, and no Node imports so the browser can consume it.
- [ ] **Step 4: Run the protocol test again** and confirm it passes.
- [ ] **Step 5: Write failing store tests** for first write, revision conflict, `.bak` recovery, corrupt primary, staged asset hash/MIME/size rejection, duplicate content, and failed publish preserving previous bytes.
- [ ] **Step 6: Run `node --test tests/unit/localServiceStore.test.ts`** and confirm the storage behavior is absent.
- [ ] **Step 7: Implement `store.ts` and `manifest.ts`** with a per-process lock, data-root initialization, canonical JSON, temp-file flush/rename, bounded backup rotation, content-addressed blobs/records, staging directories, and manifest SHA-256 verification.
- [ ] **Step 8: Run the store and manifest tests**; then run `npm test` to catch regressions in existing storage contracts.
- [ ] **Step 9: Commit** `test: define local companion storage contracts` and `feat: add local companion durable store` as separate commits if the test cycle makes that useful.

### Task 2: Loopback HTTP service and pairing session

**Files:**

- Create: `src/features/local-service/server.ts`
- Create: `src/features/local-service/main.ts`
- Create: `src/features/local-service/session.ts`
- Create: `tests/unit/localServiceServer.test.ts`
- Create: `tests/local-service/http-integration.mjs`
- Modify: `package.json` (`local-service`, `local-service:test` scripts)

**Interfaces:**

- Consumes: Task 1 protocol and `CompanionStore`.
- Produces: `createCompanionServer(options)`, `startCompanionService(options)`, `GET /health`, pairing/session routes, snapshot/assets/migration/backup routes, and normalized HTTP error responses.

- [ ] **Step 1: Write failing server tests** for loopback origin checks, one-time pairing, HttpOnly cookie, authenticated snapshot GET/PUT, 409 stale revision, asset GET/PUT, and 413 body limits.
- [ ] **Step 2: Run `node --test tests/unit/localServiceServer.test.ts`** and verify failures are due to missing server/session code.
- [ ] **Step 3: Implement `session.ts`** with random opaque session IDs, in-memory active sessions, hashed pairing code/session values, bounded expiry, and explicit revoke; never log secrets.
- [ ] **Step 4: Implement `server.ts`** with strict CORS, `OPTIONS`, route parsing without query parameters, auth middleware, body streaming limits, cookie attributes, and Task 1 store calls. Bind only to `127.0.0.1` in `main.ts`.
- [ ] **Step 5: Run unit server tests** and fix all expected status/error boundaries.
- [ ] **Step 6: Add the integration script** that starts a temporary service data root, pairs two HTTP clients from an allowed origin, verifies shared reads, restarts the process, and checks corrupt-primary recovery and failed import rollback.
- [ ] **Step 7: Add `npm run local-service` and `npm run local-service:test`**, then run the integration script and `npm test`.
- [ ] **Step 8: Commit** `feat: add loopback companion service`.

### Task 3: Web connection and creation snapshot adapter

**Files:**

- Create: `src/features/local-service/client.ts`
- Create: `src/features/local-service/connection.ts`
- Create: `tests/unit/localServiceClient.test.ts`
- Modify: `src/features/creation/storage.ts`
- Modify: `src/runtime/storage-contract.ts`
- Modify: `src/components/settings/SettingsSections.tsx` or the existing settings subsection selected by current component structure

**Interfaces:**

- Consumes: Task 1 protocol and Task 2 HTTP routes; existing `loadCreationSnapshot`, `persistCreationSnapshotAsync`, `SnapshotStorageError`.
- Produces: `readCompanionConnection()`, `pairCompanion()`, `checkCompanion()`, `disconnectCompanion()`, `companionConnectionState`, `loadCompanionSnapshot()`, and `persistCompanionSnapshot()`.

- [ ] **Step 1: Write failing client tests** for configured/unconfigured state, successful pair without localStorage token, service-unavailable status, 401 re-pair status, 409 conflict status, incompatible protocol, and “service success updates recovery copy only after 2xx”.
- [ ] **Step 2: Run `node --test tests/unit/localServiceClient.test.ts`** and confirm the new adapter behavior fails.
- [ ] **Step 3: Implement `connection.ts` and `client.ts`** using `credentials: "include"`, an allowlisted `http://127.0.0.1` URL, an in-memory session boundary, stable error mapping, and bounded connection metadata in the existing browser settings contract.
- [ ] **Step 4: Add a service-first branch to `storage.ts`** after Tauri detection and before IndexedDB. If service mode is not explicitly enabled, preserve the current IndexedDB path. If service mode is enabled and unavailable, return a typed error/state instead of claiming a successful durable save.
- [ ] **Step 5: Add settings controls** for service URL, pairing code, connect/check, disconnect, and migration-required/offline/conflict feedback with 44px controls and accessible labels.
- [ ] **Step 6: Run focused client tests, `npm run ui:check`, and the existing storage/browser tests**; fix regressions before proceeding.
- [ ] **Step 7: Commit** `feat: connect web creation storage to local companion`.

### Task 4: Asset adapter, IndexedDB migration, backup and restore

**Files:**

- Create: `src/features/local-service/migration.ts`
- Create: `tests/unit/localServiceMigration.test.ts`
- Create: `tests/browser/local-service-migration.spec.ts`
- Modify: `src/features/creation/assetRepository.ts`
- Modify: `src/features/creation/nativeAssetAdapter.ts` only if a shared adapter boundary is needed
- Modify: `src/features/creation/storage.ts` to expose the user-triggered migration flow

**Interfaces:**

- Consumes: Task 1 manifest/store, Task 2 migration/asset routes, Task 3 connection/client state, current IndexedDB stores `kk-studio-next / creation / snapshot` and `kk-studio-assets / blobs`.
- Produces: `preflightIndexedData()`, `importIndexedData()`, `exportCompanionBackup()`, `restoreCompanionBackup()`, and service-aware `storeGeneratedAsset`, `loadStoredAsset`, `listStoredAssets`.

- [ ] **Step 1: Write failing migration tests** for complete data, missing asset reference, changed blob hash, oversize blob, interrupted upload, manifest mismatch, and successful cross-instance read.
- [ ] **Step 2: Run `node --test tests/unit/localServiceMigration.test.ts`** and verify the failures are from missing migration functions.
- [ ] **Step 3: Implement a read-only IndexedDB enumerator** that decodes the existing snapshot, computes a bounded asset manifest without deleting records, and returns a report ID and exact byte/hash counts.
- [ ] **Step 4: Implement preflight/import** as two explicit calls: the service validates the report hash and stages all assets, then publishes only after snapshot and all references pass. Keep the old IndexedDB database untouched.
- [ ] **Step 5: Route asset reads/writes through the service when connected**; preserve native Tauri behavior and legacy IndexedDB behavior when the service mode is off.
- [ ] **Step 6: Add backup export/restore actions** with staging and checksum checks; surface `recovered` and `IMPORT_ROLLBACK` states to the caller.
- [ ] **Step 7: Run unit migration tests and the browser migration spec** with two browser contexts against a real temporary service; assert old IndexedDB bytes remain unchanged after both success and failure.
- [ ] **Step 8: Commit** `feat: migrate web projects and assets to companion storage`.

### Task 5: Settings UX and production verification

**Files:**

- Modify: `src/components/settings/SettingsSections.tsx` and the selected settings component/styles
- Create: `tests/browser/local-service-connection.spec.ts`
- Create: `tests/local-service/production-smoke.mjs`
- Modify: `docs/features/feat-037-web-local-service.md`
- Modify: `docs/architecture/DATA-STORAGE.md`
- Modify: `docs/PROGRESS.md`
- Modify: `docs/governance/PROJECT_STATE.md`
- Modify: `docs/governance/task-ledger.json`
- Modify: generated `docs/governance/TASK_LEDGER.md` via governance writer

**Interfaces:**

- Consumes: Tasks 2–4 public client/service interfaces.
- Produces: accessible connect/migrate/backup status UI and reproducible Web + service runtime evidence.

- [ ] **Step 1: Write the browser acceptance spec** for connect, status transitions, snapshot save, asset save, migration confirmation, disconnect, and failure copy at desktop and 390px widths.
- [ ] **Step 2: Run the new spec against the current implementation** and capture the expected red failures before final UI wiring.
- [ ] **Step 3: Wire the settings UI and status announcements**; ensure the browser never says “已保存” while service mode is offline or in conflict.
- [ ] **Step 4: Add production-smoke coverage** that builds the Web bundle, starts the service, verifies no Node built-ins/secrets enter the bundle, and exercises a fresh browser context plus a restart.
- [ ] **Step 5: Run `npm run verify`, `npm run client:check`, `npm run client:build`, the service integration/production smoke scripts, and `node scripts/check-delivery.mjs` with the actual base/head.
- [ ] **Step 6: Update feature and architecture docs with verified behavior and explicit non-goals; set `TASK-LOCAL-SERVICE-001` to `PARTIAL` unless BACKEND-PLATFORM and account binding are also complete.**
- [ ] **Step 7: Commit** `docs: record local companion verification and boundaries`.

### Task 6: Review, merge and closeout

**Files:**

- Create: `docs/changes/2026-09-29-local-companion/intent.md`
- Create: `docs/changes/2026-09-29-local-companion/spec.md`
- Create: `docs/changes/2026-09-29-local-companion/plan.md`
- Create: `docs/changes/2026-09-29-local-companion/verification.md`
- Create: `docs/changes/2026-09-29-local-companion/review.md`
- Modify: `docs/governance/task-ledger.json`, generated `TASK_LEDGER.md`, `PROGRESS.md`, `PROJECT_STATE.md`

**Interfaces:**

- Consumes: all verified implementation commits and Hosted CI output.
- Produces: five-file change package, independent review record, PR, merge SHA/tree, post-merge `verify`/`deploy-linux`, and an accurate ledger status.

- [ ] **Step 1: Write the five-file change package** with exact scope, acceptance mapping, local commands, runtime evidence paths, and remaining account/installer/Mobile boundaries.
- [ ] **Step 2: Run the independent read-only review** against the final implementation commit; resolve P0–P3 findings before opening the PR.
- [ ] **Step 3: Push a feature branch and open a PR** with the package, then wait for Hosted `verify`, `delivery`, and `deploy-linux` checks.
- [ ] **Step 4: Read back the exact PR head, checks, merge SHA and tree; squash merge only after all required checks pass.**
- [ ] **Step 5: Fetch `origin/main`, run post-merge `verify`/`deploy-linux`, and compare the merged tree with the recorded head.**
- [ ] **Step 6: Record VPS status separately:** Git remote sync may be verified from the merge SHA, but RackNerd upload/SSH/data recovery remain UNKNOWN unless a working server connection produces evidence.
