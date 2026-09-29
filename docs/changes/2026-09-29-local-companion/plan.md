# Plan：Web 本机伴随服务与既有浏览器数据迁移

- Task ID：`TASK-LOCAL-SERVICE-001`
- 状态：IMPLEMENTED / closeout review
- 日期：2026-09-29
- Intent / Spec / ADR：`intent.md`、`spec.md`、`docs/architecture/adr/ADR-008-platform-versions-and-local-first.md`
- Owner / branch / worktree：root / `feat/TASK-LOCAL-SERVICE-001-companion` / `D:/kk-studio/.worktrees/platform-versioning`
- Base / HEAD SHA 与远端目标：base `origin/main@49f20c85c48b1d9f939c1b423dc542b419e18260`；实现提交 `599c99b`, `46ed2ee`, `4f81d7c`, `0619154`, `bd22aa8`, `84008ab`, `346c2c0`, `c103efb`, `2d61a4c`；当前候选 head `2d61a4c91316b81a61f800c6792f8dd69bc89ba0`，目标 `origin/main`。
- Git dirty/index 状态、并行任务与文件归属：实现 worktree 与根 checkout 隔离；根 checkout 的 UI/evidence dirty 改动未触碰；本任务文件仅由本分支串行维护。

## 开工证据

- 已读取的规则、账本、规范和实现：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/SDLC.md`、`BRANCH-POLICY.md`、`REVIEW.md`、`PROJECT_STATE.md`、`DATA-STORAGE.md`、FEAT-037、现有 creation/storage/asset 代码与测试。
- 依赖/工具版本与安装：Node `24.19.0`、TypeScript/Playwright/Vite 使用仓库 lockfile 已安装依赖；未新增运行时依赖。
- 基线 lint/typecheck/相关测试：Task 1–3 已有 499/504/509 总测试证据；当前最终实现完整单元回归 518 总计、510 通过、8 跳过。
- PRE-EXISTING FAILURE 与关联任务：VPS SSH/上传/恢复、真实账号、Mobile 未验证；不属于本任务代码修复范围，分别由 `T10/T11`、`BACKEND-PLATFORM`、`T12` 负责。
- 计划中 AI 自主事项：补测试、更新功能/架构/治理文档、创建 PR、等待门禁并在授权范围内合并；不写入真实 VPS 或秘密。
- 必需外部条件与已有用户授权：用户已授权继续实现/核验/合并/同步；VPS 只有控制面板浏览器上下文，没有可用 SSH 证据，因此只做 UNKNOWN 记录。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `protocol.ts`, `manifest.ts`, `store.ts` | 严格契约、文件根、revision/CAS、资产 hash、备份和恢复 | 现有 snapshot/asset schema | 协议/仓库单测 |
| 2 | `server.ts`, `session.ts`, `main.ts` | loopback HTTP、一次性配对、HttpOnly cookie、资产/迁移/备份路由 | 步骤 1 | server 单测、HTTP integration |
| 3 | `client.ts`, `connection.ts`, `storage.ts` | Web 连接状态和服务优先快照读写；服务错误不静默回退 | 步骤 2 | client/storage 单测、类型/UI 检查 |
| 4 | `migration.ts`, `assetRepository.ts`, 设置组件 | IndexedDB 只读预检/导入、资产服务适配、备份恢复 UI | 步骤 1–3 | migration 单测、真实浏览器迁移 |
| 5 | `local-service-connection.spec.ts`, `production-smoke.mjs`, 功能/架构/治理文档 | 覆盖连接、备份、断线、窄屏、重启和 bundle 边界，记录 PARTIAL 真实边界 | 步骤 4 | 连接浏览器验收、smoke、完整门禁 |
| 6 | 本五文件变更包、独立 review、PR | 绑定精确 head/base、托管门禁、主线回读 | 步骤 5 | review/CI/merge/postmerge |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：本轮没有并行写同一 worktree；浏览器/单元检查只读并行执行。
- 同文件写入的串行顺序：先服务实现，再资产/迁移，再 UX/验证，最后治理生成文件。
- 整合负责人、目标 branch/base 和同步策略：root 负责；分支从 `origin/main@49f20c8` 建立，PR 默认 squash 到 `main`。
- 冲突后重新验证的范围：任何冲突解决后重新跑 typecheck、相关单测、完整 `npm test`、UI/format/build 和浏览器 smoke。

## 风险与恢复

- 最危险的失败场景与预防：错误快照覆盖、迁移缺失引用、素材 hash/MIME 不符、会话重放、VPS 误宣称；由 CAS、manifest、严格 schema、一次性 pairing 和文档 UNKNOWN 边界预防。
- 数据备份/原件保护/回滚或补偿：旧 IndexedDB 不删除；服务写入先 staging/临时文件；`.bak`、backup manifest 和逐文件 hash 可恢复；导入失败不发布快照。
- 触发恢复的条件及 runbook：服务主快照损坏读取有效 `.bak`；backup restore 校验通过后恢复；跨主机迁移按 `deploy/MIGRATION.md`，本轮不执行 VPS 写入。
- 高风险外部动作的授权、权限和费用边界：真实账号、VPS SSH、DNS、付款和发布外部写入无可用凭据/证据，不自动执行。
- 不选择的方案及理由：不把浏览器 bearer token 放 localStorage，不静默把 IndexedDB 搬走，不把 CI/控制面板视作 VPS 部署证明。

## 验证和交付

- 定向回归：资产服务优先缺失 `size` 的问题已修复；真实浏览器暴露的 detached fetch 误报离线已修复；迁移/资产/服务测试通过。
- 完整验证：最终记录见 `verification.md`；本地 full unit 518/510/8，integration、typecheck、UI、Prettier、Vite build 和 production smoke 通过。
- UI 运行态证据：Playwright preview `127.0.0.1:1423`，设置 → 储存；1920px 配对/备份/断开与 390px 离线状态通过。真实临时服务和 fresh browser context 由 smoke 启动。
- 独立 reviewer 与当前 SHA 审查：由 `review.md` 记录；新 head 生成后旧结论失效，必须绑定最终 PR head。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：FEAT-037、registry、DATA-STORAGE、PROGRESS、PROJECT_STATE、task-ledger 与生成 TASK_LEDGER 同步。
- PR、用户产品验收、发布和回滚记录：PR/Hosted/merge/postmerge 由 closeout 追加；用户已授权工程动作，但未发生 VPS 生产发布。
- 暂不可验证项及准确状态：BACKEND-PLATFORM 账号、安装器/更新、Mobile、VPS 上传/SSH/Git/data recovery = NOT VERIFIED/OPEN。

## 计划变更记录

- 2026-09-29：Task 4 发现 Web 浏览器保存的 detached fetch 会同步抛 `Illegal invocation`，改为客户端 wrapper 后重新跑真实迁移；资产服务上传 metadata 补 `size` 并加回归测试。验收范围扩大到连接/备份/断线/重启 smoke，不改变产品意图。
