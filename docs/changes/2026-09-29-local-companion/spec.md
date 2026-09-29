# Spec：Web 本机伴随服务与既有浏览器数据迁移

- Task ID：`TASK-LOCAL-SERVICE-001`
- 状态：IMPLEMENTED（产品能力 PARTIAL）
- 日期：2026-09-29
- Intent / 账本：`intent.md` / `docs/governance/task-ledger.json`
- 当前规范与实现基线：`docs/superpowers/specs/2026-09-29-web-local-companion-design.md`、`docs/superpowers/plans/2026-09-29-web-local-companion.md`、`docs/architecture/DATA-STORAGE.md`
- Source of truth：`src/features/local-service/protocol.ts`、`src/features/local-service/store.ts`、`src/features/local-service/server.ts`、`src/features/local-service/client.ts`；本文只记录本轮实现边界。

## 用户行为与入口

- 主流程：用户启动本机服务 → 设置/储存填写 `http://127.0.0.1:4319` 和一次性配对码 → 连接成功 → 服务优先保存快照/素材 → 可选预检/导入旧 IndexedDB → 创建/恢复备份。
- 页面/API 入口：`CompanionSettings`、`CompanionMigrationActions`；服务入口 `npm run local-service`；HTTP `/health`、`/v1/pair`、`/v1/session`、`/v1/snapshot`、`/v1/assets`、`/v1/migration/*`、`/v1/backups/*`。
- loading/success/error/cancel/offline/timeout：设置按钮覆盖连接中、已连接、服务离线、需要重新配对、协议不兼容、冲突和错误；迁移显示预检、上传进度、成功或失败；客户端请求失败不会写 recovery copy。
- 重试、幂等、stale async、unknown 与重启：快照使用 expected revision CAS；服务重启后需重新配对但数据目录保持；资产 content-addressed 可重复上传；预检报告 15 分钟过期；失败导入不发布快照，旧 IndexedDB 保留。
- 键盘/焦点/Escape/IME、长文案、响应式：使用既有设置表单/44px 控件和语义按钮；浏览器验收覆盖 1920px、390px，长状态文案使用可换行文本；移动原生布局不在本轮宣称完成。

## 架构、数据与权限

- 模块职责和依赖方向：协议/manifest 为 Node-free 共享契约；store 只处理文件与完整性；server 只处理 loopback HTTP/会话；client/migration 是浏览器边界；creation storage/assetRepository 通过显式连接开关选择服务或既有本地路径。
- schema/API/文件格式：快照 version=2；素材 `asset-<sha256 前 24 位>`、允许 MIME、1–100MiB、完整 SHA-256；迁移 manifest 是 canonical `{snapshot,assets}` hash；备份 manifest 记录每个文件路径、大小和 hash。
- 数据归属、原件、校验、并发/原子性：服务数据根在用户设备；快照 `.tmp` 写入并校验后原子替换，保留 `.bak`；素材先 staging 再发布 records/blobs；迁移导入按 service revision CAS；旧 IndexedDB 不删除。
- 凭据与日志：服务只监听 `127.0.0.1`；配对码只提交一次；会话为 `HttpOnly; SameSite=Strict` cookie；浏览器只存 endpoint/deviceId/protocol/enabled；不持久化 API key、OAuth、session 明文或 URL token。
- 相关 ADR：`docs/architecture/adr/ADR-008-platform-versions-and-local-first.md`；账号和云端边界由 `BACKEND-PLATFORM` 负责。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| 本地项目持久化 | REAL，Tauri 原生仓库 | PARTIAL，本机服务启用后服务优先，未连接仍为 IndexedDB | PLANNED | Mobile 原生持久层由 T12 |
| 素材原件 | REAL，Tauri assets | PARTIAL，本机服务 content-addressed store | PLANNED | Mobile 包未发布 |
| 旧浏览器数据迁移 | N/A | PARTIAL，用户触发、无损保留旧库 | N/A | 只针对 Web IndexedDB |
| 账号登录 | Prototype/另项 | 未接真实账号 | 未接 | `BACKEND-PLATFORM` |
| 云端同步/VPS 部署 | 未承诺 | 未承诺 | 未承诺 | 本轮只验证本机服务 |

## 生命周期与恢复

- 初始化/安装：当前手动运行 `npm run local-service`；数据根可由 `KK_STUDIO_COMPANION_DATA` 指定；安装器/自动更新未实现。
- 正常使用、取消/离线：显式连接后服务优先；离线/401/409/协议错误显示状态并保留原项目；迁移可在上传失败时停止。
- 升级和旧 schema：协议 version 不匹配显示 migration-required；旧 IndexedDB 只在用户触发预检/导入时读取；不自动改写或删除。
- 损坏/写失败/进程重启：主快照损坏时从有效 `.bak` 恢复；主备份都损坏则拒绝创建空项目；文件写入使用临时文件和校验；服务重启后重新配对读取同一数据根。
- 备份、还原、回滚：备份 manifest 和每个文件 SHA-256 必须通过；恢复前校验快照/记录/原件，再写入服务；失败保留当前数据。导入失败可能留下未引用 staging/资产，后续需 GC。
- 导出/卸载/退役及用户数据保留：本轮提供服务目录内备份和恢复 API；未提供安装器卸载策略，用户数据不因断开连接而删除。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 1920px/390px 设置页可配对并显示状态 | Playwright + 临时 loopback service | `tests/browser/local-service-connection.spec.ts` |
| AC-2 | 服务终止后为离线，不显示已保存；断开清理 metadata | Playwright、client 单测 | 同上、`tests/unit/localServiceClient.test.ts` |
| AC-3 | 完整迁移后服务快照引用素材，旧 IDB revision 不变 | 真实浏览器 + Node service | `tests/browser/local-service-migration.spec.ts` |
| AC-4 | 备份/恢复、重启后 revision 和内容可读取 | server/store/integration/smoke | `tests/unit/localServiceServer.test.ts`、`tests/local-service/production-smoke.mjs` |
| AC-5 | bundle 无 Node 服务入口/秘密 | Vite build + bundle scan | `tests/local-service/production-smoke.mjs` |

## 风险和决策

- 可自主解决的技术决定及依据：服务使用 loopback、cookie、CAS、staging 和 hash；这些边界与原 spec/AGENTS 数据安全要求一致。
- 待用户决定的产品语义（无则写无）：无；账号登录和 Mobile 已有任务归属。
- 规范冲突、外部依赖与阻断范围：无代码规范冲突；真实账号、安装器、VPS 访问和 Mobile 仍是外部/后续条件。
- 与 intent 的差异及授权依据：新增生产 smoke 和连接状态浏览器验收，以完成用户要求的核验；不扩大为云同步或 VPS 部署。
- 明确未承诺的能力：本机服务不是账号后端或云备份；“本地可恢复”不代表 VPS 已上传或 Git 已在 VPS 同步。
