# Spec：主线接管与 P6 live 测试基线收口

- Task ID：TASK-DELIVERY-MAIN-20261030
- 状态：READY
- 日期：2026-11-01
- Intent / 账本：`intent.md`；`docs/governance/task-ledger.json`
- 当前规范与实现基线：本地 `main@b93b4e7f`，Node 24、npm 10、Playwright 现有配置。
- Source of truth：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/TESTING.md`、`docs/architecture/adr/ADR-033-comfy-canvas-runtime.md`。

## 用户行为与入口

- 主流程和相邻流程：默认测试列表/运行 → opt-in endpoint 预检 → Canvas 真实队列和资产归档 → evidence。
- 页面/route/组件或 API/命令入口：`tests/browser/p6-live-comfy.spec.ts` → `Canvas` → `ComfyRuntimePort`。
- loading、success、error、cancel、offline、timeout：测试保留页面异步等待；预检使用 5 秒 timeout；缺 endpoint/checkpoint 时明确失败；默认关闭时跳过。
- 重试、幂等、stale async、unknown 受理与重启恢复：由现有 Comfy workflow runtime 覆盖；本阶段不新增产品状态机。
- 键盘/焦点/Escape/IME、长文案、响应式：不适用，本阶段不改产品 UI。

## 架构、数据与权限

- 模块职责和依赖方向：测试通过公开 `features/comfyui/index.ts` 和 `ComfyRuntimePort`，不引入第二套 runtime。
- schema/API/事件/文件格式与兼容策略：使用 ComfyUI `/system_stats`、`/object_info/CheckpointLoaderSimple`、`/prompt`、`/history`、`/view`。
- 数据归属、原件保留、校验和、并发/原子性：浏览器项目状态只落隔离 profile；外部输出不清理；接管快照用 SHA-256。
- 凭据与日志边界、最小权限、外部传输与费用：工作流不得含凭据；测试只访问本地 loopback；不读写用户凭据。
- 相关 ADR：ADR-033；本阶段无新跨模块契约。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| P6 live archive test | 未验证 | opt-in，真实 loopback endpoint | N/A | Desktop 进程托管和 Mobile 不属于本阶段 |
| 接管/治理证据 | 代码与文档 | 可读回 | N/A | 只证明当前 checkout，不证明合并或发布 |

说明：本阶段的 Canvas harness 仅用于挂载正式 `Canvas` 并访问真实 ComfyUI HTTP；默认运行是 skipped，不产生真实服务证据。

## 生命周期与恢复

- 初始化/安装：任务 worktree 通过 `npm ci --ignore-scripts` 和 `npm ci --prefix vendor/canvas-agent` 准备；不安装或修改外部 ComfyUI。
- 正常使用、取消/离线：默认跳过；opt-in endpoint 失败即报告，测试不自动重试外部生成。
- 升级和旧 schema：不改产品 schema。
- 损坏/写失败/进程重启：不适用；Desktop recovery 留给原 P6 任务。
- 备份、还原、回滚：Figma 通过 patch/manifest/SHA 回读；代码变更可由 Git revert 回滚。
- 导出/卸载/退役及用户数据保留：不适用；不清理外部输出。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 快照可复核 | PowerShell/Git | `output/figma-pages-takeover-2026-11-01/` |
| AC-2 | 默认 skipped | isolated Edge/Playwright | test result + command |
| AC-3 | prereq 缺失时 fail closed | live flag + local endpoint | error text + live receipt if available |
| AC-4 | ledger/delivery 一致 | Node governance scripts | generated views and checks |

## 风险和决策

- 可自主解决的技术决定及依据：沿用现有 harness/Port；不新增依赖或 lifecycle adapter。
- 待用户决定的产品语义：无；外部 checkpoint、Figma OAuth 和正式发布仍是外部条件。
- 规范冲突、外部依赖与阻断范围：local main 与 origin/main 分叉；记录两者，不强制重写。
- 与 intent 的差异及授权依据：无。
- 明确未承诺的能力：真实 GPU 图片、视频 AssetPort、能力按钮、Figma L3/L4、Hosted、安装包和公开发布。
