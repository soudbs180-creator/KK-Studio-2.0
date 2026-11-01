# KK Studio 接管与基线收口设计

## 意图

把 `D:/kk-studio/KK-Studio-2.0` 当前主线接管为可继续交付的真实基线：保留既有用户改动，处理主线上的两个未跟踪 P6 测试文件，记录 Figma worktree 的完整快照，校正账本中的分支/worktree事实，并重新运行当前主线能执行的快速门禁。目标是让后续功能工作从一个可审计、可复现的基线开始。

## 目标

- 建立接管证据目录，保存当前主线、工作树、分支、文件 SHA 和 Figma worktree 差量。
- 将 `p6-live-comfy.spec.ts` 变成默认跳过、环境门控的真实 live test；保留 opt-in 运行路径，不伪造实时 ComfyUI 证据。
- 移除或迁移 `.tmp.tsx` harness，使仓库不再把临时文件当成正式源码。
- 纠正指定任务的 ledger 分支/worktree字段，并刷新生成视图。
- 在独立任务 worktree 中运行 typecheck、lint、unit test、governance/delivery checks；对失败保留原始证据并精确标注边界。

## 非目标

- 本阶段不宣称 ComfyUI 图像/视频真实验收、Figma L3/L4、Hosted、GPU 能力、打包安装或公开发布完成。
- 不修改用户的 ComfyUI 安装、模型、工作流、凭据、外部账号或物理设备。
- 不在 `main` 直接写功能，不删除历史失败日志，不批量把失败标记为过时。

## 反目标

- 不用 fixture、mock、harness 或构建通过替代真实 provider/GPU/桌面证据。
- 不为清理而删除仍有独有提交或未审阅的 worktree/分支。
- 不为了门禁通过而放宽断言、跳过默认测试或改写既有失败记录。

## 约束

- 正式仓库为 `D:/kk-studio/KK-Studio-2.0`；任务在 `D:/kk-studio/.worktrees/TASK-HANDOFF-TAKEOVER-20261101`。
- 使用现有脚本、依赖和生成器；不新增依赖。
- 代码与用户界面保持中文；证据只能写入 `output/<topic>-<date>/`，临时文件写入 `.tmp/`。
- 完成状态仍按 `REAL/DONE/PARTIAL/NOT VERIFIED/BLOCKED` 的现有治理语义记录。

## 建设路径

1. **接管快照（选定）**：在任务 worktree 中只做证据和小范围门禁修复，先得到可复现基线；优点是风险小、能立即揭示真正阻断，代价是产品能力仍分阶段推进。
2. **直接全量实现**：同时改 ComfyUI、能力工作流、资产血缘和 Figma；会跨越多个依赖和外部授权，难以把失败归因到具体任务，放弃。
3. **只做文档收口**：不改 live test 与临时文件；无法满足“接管并建立基线”的请求，放弃。

后续阶段按依赖顺序推进：ComfyUI runtime/视频资产 → outpaint/upscale/layer split → AssetPort lineage/source row → Figma audit/pixel → Hosted、打包和发布。任何需要 Figma OAuth、模型 checkpoint、真实 Provider、生产发布或外部权限的阶段，保持明确的阻断状态。

## 实现决策

- live test 通过 `RUN_LIVE_COMFY=1`（或仓库现有等价变量）显式启用，默认 `test.skip`；启动前验证目标 ComfyUI 地址和 checkpoint 可用，失败时给出清晰原因。
- harness 移入 `tests/support/fixtures/` 仅在正式测试仍需要时保留；若只服务于一次性 live 测试，则删除并改用已有测试 fixture，避免第二套状态源。
- ledger 只更新已有条目，不复制条目；所有字段变更绑定本阶段 evidence 路径。
- 每次代码变化后按仓库要求运行 typecheck、lint、unit test；文档/治理变化还运行 delivery/governance checks。

## 交付边界

本设计交付接管证据、live test 门控、临时文件清理、账本/生成视图刷新及当前可运行门禁结果。独立 review 以本阶段提交的 base/head SHA 为准；外部条件未满足的阶段继续留在 ledger 的 PARTIAL/NOT VERIFIED/BLOCKED，不在本设计中代填。
