# Plan：主线接管与 P6 live 测试基线收口

- Task ID：TASK-DELIVERY-MAIN-20261030
- 状态：IMPLEMENTED
- 日期：2026-11-01
- Intent / Spec / ADR：`intent.md`、`spec.md`、ADR-033
- Owner / branch / worktree：root / `fix/TASK-HANDOFF-TAKEOVER-20261101` / `D:/kk-studio/.worktrees/TASK-HANDOFF-TAKEOVER-20261101`
- Base / HEAD SHA 与远端目标：base `b93b4e7f`; origin reference `9b1038a7`; merge target remains a later normal PR
- Git dirty/index 状态、并行任务与文件归属：任务树初始只含两个复制的 untracked P6 文件；Figma worktree 独占其 dirty 内容；无共享 index 写入

## 开工证据

- 已读取：根级/主仓 `AGENTS.md`、`AI_RULES.md`、治理/架构/测试规范、P6/P7 delivery、Figma worktree 状态。
- 依赖/工具版本与安装：根 `npm ci --ignore-scripts`；随包 Agent `npm ci --prefix vendor/canvas-agent --ignore-scripts --no-audit --no-fund`。
- 基线 lint/typecheck/相关测试：typecheck PASS；lint PASS（保留 changelog drift/code-health advisory）；初始 npm test 2 failures 由缺少随包 dist 导致，agent build 后目标测试 3/3 PASS。
- PRE-EXISTING FAILURE：完整 browser 227 failures、Windows rename EPERM、真实 Figma/GPU/Hosted 未验证，均不由本阶段重写。
- 计划中 AI 自主事项：live test gate、harness 正式化、快照和 ledger current ownership、五件套。
- 必需外部条件与已存在授权：live test 需要 `KK_RUN_LIVE_COMFY=1`、`KK_COMFY_URL`、`KK_COMFY_CHECKPOINT`；Figma OAuth 和图片 checkpoint 未提供。

## 状态与开发笔记

| 时间 | 旧状态 | 新状态 | 原因/决策 | 负责人 | 证据路径 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-01 | TODO | IN PROGRESS | 建立隔离 worktree 和设计/计划 | root | 本文件 |
| 2026-11-01 | IN PROGRESS | IN PROGRESS | 快照、live gate 和 ledger 正在执行 | root | `output/figma-pages-takeover-2026-11-01/` |

关键技术方案、放弃方案和遗留问题：

- 方案：只 attach 外部已运行 ComfyUI；放弃在浏览器测试中启动/停止外部服务。
- 影响：真实 HTTP 归档链可独立验收，Desktop 进程所有权仍留在 P6 physical task。
- 遗留：无 checkpoint 时不能执行真实图像；Figma/L3/L4 和 227 browser failures 另行处理。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | output snapshot | 保存 main/origin/Figma diff、status、SHA | Git worktree | manifest/hash |
| 2 | p6 live test/harness | 默认跳过、预检、真实 endpoint define、去除 `.tmp` 命名 | ComfyRuntimePort | typecheck + focused Playwright |
| 3 | ledger/delivery | 修正 active branch/worktree、刷新生成视图、补五件套 | 1/2 | governance/delivery |
| 4 | gates/review | 重跑快速门禁并记录边界 | 1-3 | receipts + independent review |

## 风险与恢复

- 最危险场景：把 fixture 或 H3/首帧证据误称图片/GPU 完成；预防是默认 skip、checkpoint preflight 和明确 verification boundary。
- 数据备份/原件保护/回滚：Figma 只读 snapshot；外部 ComfyUI 不触碰；Git revert 可回滚测试和 ledger。
- 触发恢复：任意证据指纹与源 worktree 不一致时停止合流，保留旧快照并重新生成新日期目录。
- 高风险外部动作：无生产、账号、推送、发布或模型下载。

## 验证和交付

- 定向回归：live test 默认 skipped；agent runtime test 在随包 build 后 3/3 PASS。
- 完整验证：见 `verification.md`；真实 GPU、Desktop、Hosted 和发布不在本阶段。
- UI/Figma：仅记录 Figma worktree snapshot；无 OAuth/L3/L4 结论。
- 独立 reviewer：提交后按当前 base/head SHA 请求独立只读 review。
- 文档/账本：写入本 delivery package，并刷新 `TASK_LEDGER.md` / `TASK_STATUS.md`。
