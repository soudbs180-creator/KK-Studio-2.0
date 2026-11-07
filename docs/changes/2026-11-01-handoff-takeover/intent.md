# Intent：主线接管与 P6 live 测试基线收口

- Task ID：TASK-DELIVERY-MAIN-20261030（接管证据 owner）；关联 TASK-MOD-P6-1、TASK-MOD-P6-HOST、TASK-MOD-P7、TASK-MOD-P1-G
- 状态：IMPLEMENTED（本阶段实现）；产品总交付仍 PARTIAL
- 日期与提出者：2026-11-01，当前用户请求
- 请求来源：将 KK Studio 从 mostly PARTIAL 推进到可审计的真实基线，并处理两个未跟踪 P6 测试文件、账本归属和门禁。
- 用户授权范围与依据：仓库 `AGENTS.md` / `AI_RULES.md` 的全权自治开发；不涉及生产发布、账号、凭据、物理设备或用户数据删除。
- 关联账本、spec、plan：`docs/governance/task-ledger.json`、`docs/superpowers/specs/2026-11-01-handoff-takeover-design.md`、`docs/superpowers/plans/2026-11-01-handoff-takeover.md`
- 交付包角色：`current`

## 领取与开工确认

- Owner / branch / worktree：root / `fix/TASK-HANDOFF-TAKEOVER-20261101` / `D:/kk-studio/.worktrees/TASK-HANDOFF-TAKEOVER-20261101`
- Base SHA / 当前 HEAD：`b93b4e7f347f9a01b28b4055668a5412af489303`；当前提交前 HEAD 同上
- 依赖任务、共享文件和并行写入者：接管现有 Figma worktree；无并行写入者；不改主线 dirty 文件
- 基线检查与预存失败：typecheck/lint 通过；初次 `npm test` 因未生成随包 Agent dist 失败 2 项，安装嵌套依赖并运行 `npm run agent:build` 后定向 3/3 通过
- 需求和验收标准确认时间/依据：2026-11-01；当前用户请求与设计文档
- 当前状态：IN_PROGRESS；外部 Figma OAuth、SD checkpoint、Hosted/打包和发布继续保持未验证

## 用户原意

把当前 mostly PARTIAL 的 KK Studio 接管为能继续交付的真实基线，保留已有证据和用户改动，不能用 fixture 或 mock 冒充真实 ComfyUI、Figma、GPU、Desktop 或发布结果。

## AI 工程转译

先在隔离 worktree 建立主线/Figma 快照；把 P6 live 浏览器测试改成默认跳过、环境门控、真实 endpoint/checkpoint 预检；把 `.tmp.tsx` 正式化；更新现有 ledger 任务的当前归属和交付包；记录可执行门禁与剩余外部阻断。

## 目标与非目标

- 预期结果：接管证据完整、live test 边界清楚、临时文件不再作为正式输入、账本归属可回读、基线门禁可重跑。
- 包含范围：Figma worktree 快照、P6 live test 门控、harness 重命名、治理账本和五件套。
- 明确不包含：真实图片 checkpoint、三项 GPU 能力、Figma OAuth/L3/L4、Hosted、正式 EXE 安装、origin/main 推送或公开发布。
- 受影响平台/模块：Web Playwright、ComfyUI feature test、governance docs。
- 已有实现和规范来源：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/TESTING.md`、`docs/architecture/adr/ADR-033-comfy-canvas-runtime.md`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| AC-1 | 当前主线与 Figma worktree 的接管状态可复核 | `output/figma-pages-takeover-2026-11-01/` manifest、diff、SHA | Git/Web |
| AC-2 | live ComfyUI 测试默认不触发外部服务 | 默认 Playwright 运行 1 skipped | Web |
| AC-3 | 显式启用 live test 时只接受真实 endpoint/checkpoint | `/system_stats`、`/object_info/CheckpointLoaderSimple` 预检和真实归档断言 | Web + 外部 ComfyUI |
| AC-4 | 账本当前归属与交付包一致 | governance/delivery checks 通过；状态仍 PARTIAL/NOT VERIFIED | Governance |

## 假设、风险和决策

- FACT：本地 `main` 为 `b93b4e7f`，`origin/main` 为 `9b1038a7`；Figma worktree 有 60 个 tracked dirty 文件及 13 个 untracked 路径。
- INFERENCE：本阶段以本地 main 为接管基线，origin/main 只作分叉记录；这样不丢弃本地 166 个提交。
- UNKNOWN / CONFLICT：当前没有已授权的 SD1.5/SDXL/FLUX checkpoint；Figma connector 仍需用户完成 OAuth 或提供 token。
- AI 自主决定：live test 只 attach 到已运行 ComfyUI，不启动/停止外部进程；缺少 live 条件时启用运行应失败并说明原因，默认则跳过。
- 必须由用户决定的产品语义：无新增语义；真实 checkpoint、Figma OAuth 和公开发布仍按原红线由用户提供/确认。
- 外部条件、费用或不可逆动作及已有授权：未执行外部账号、模型下载、生产发布、推送或数据删除。
- 不在本次范围的问题与账本 ID：227 browser failures、Windows rename EPERM、视频资产契约和三项 GPU 能力，分别保留在原任务与后续交付包。
