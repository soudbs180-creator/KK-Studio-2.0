# Plan：Desktop 整包 V1

- Task ID：TASK-WHOLE-V1-20261121
- 状态：IN PROGRESS
- 日期：2026-11-21
- Intent / Spec / ADR：[intent.md](intent.md)；[spec.md](spec.md)；[scope-map.md](scope-map.md)
- Owner / branch / worktree：root / main（当前 checkout）/ `D:/KK Design`
- Base / HEAD SHA：见 intent；变更以本交付包 + 账本为准
- Git dirty/index：允许本包文档与治理文件；不混入无关产品大改

## 开工证据

- 已读：AGENTS.md、AI_RULES.md、PROJECT_GOALS、BACKEND-ROADMAP Wave 0、features.registry、UI_INDEX 入口
- 本包阶段：先完成盘点/冻结/搁置/走查准备/迭代规矩；**产品挡项修复按下列队列在终验前执行，不在旁路展开**
- 预存失败：大量 PARTIAL；历史 NOT_VERIFIED 整包

## 状态与开发笔记

| 时间 | 旧状态 | 新状态 | 原因/决策 | 负责人 | 证据路径 |
| ---- | ------ | ------ | --------- | ------ | -------- |
| 2026-11-21 | 无 | IN_PROGRESS | 建立整包任务与地图 | root | 本目录 |

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| ---- | --------- | ---------- | ---- | ---- |
| 1 | scope-map.md | 四桶盘点，标勿重做 | registry | 文档自检 |
| 2 | intent/spec | 冻结算进/不算进与 UI 标准 | 步骤1 | 与用户原意一致 |
| 3 | task-ledger | 新增 WHOLE-V1；旁路 nextAction 搁置 | 步骤2 | governance:check |
| 4 | walkthrough + verification 草稿 | 用户终验准备 | 步骤2 | 清单可执行 |
| 5 | iteration-rules.md | 钉基线后迭代规矩 | 步骤2 | 文档 |
| 6 | PROJECT_STATE / HANDOFF / PROGRESS | 短链当前整包入口 | 步骤1–5 | 人工回读 |
| 7 | 挡项修复（后续编码轮次） | 仅下表 P0 队列 | 用户 Key/Agent | 走查 AC-2/3 |
| 8 | 用户终验 | 勾选 walkthrough；钉 SHA/包 | 步骤7 | verification FINAL |

## V1 挡项修复队列（只修这些）

按序；完成一项勾一项。已计入 REAL 不重做。

| 优先级 | 挡项 | 关联 | 完成样子 |
| --- | --- | --- | --- |
| P0-1 | 日常 Desktop 可启动且身份可记录 | FEAT-026 | verification 记下入口与版本 |
| P0-2 | 连接/Key 健康可见 | FEAT-032/022 | 失败有原因 |
| P0-3 | 一次真实文本 + 重开仍在 | FEAT-008/009 | 走查勾选 |
| P0-4 | 一次真实图片 + 原件回写 + 重开仍在 | FEAT-002 | 走查勾选 |
| P0-5 | 取消或失败态可见 | FEAT-031 | 走查勾选 |
| P0-6 | 演示/Prototype 不冒充 | FEAT-025/017/018/006 | 标或禁用 |
| P0-7 | 主路径 UI 死按钮/错态 | FEAT-023/022 | 用户 UI 过关 |

非队列（搁置示例）：T6/EXT-COMFY、T12/Mobile、BACKEND-PLATFORM 账号积分云、TASK-CANVAS-RELEASE 资产名、PERF-001、Astra、视频真链。

## 并行与冲突

- 收口期禁止并行开旁路产品实现。
- 若必须热修生产/安全：单独任务，注明不扩大 V1 范围。

## 风险与恢复

- 风险：把模块 PASS 写成整包完成 → 禁止；以用户 walkthrough 为准。
- 风险：搁置被理解成废弃 → nextAction 写明解冻条件，不改 OBSOLETE。
- 数据：终验不自动迁移/删除用户数据。

## 验证和交付

- 文档阶段：governance:check / features:check 不因本包破坏。
- 产品阶段：walkthrough + 定向回归；verification 记录版本身份。
- 独立 review：对本包文档与账本变更做 review.md。

## 计划变更记录

- 2026-11-21：初版；范围冻结为 Desktop 整包 V1。
