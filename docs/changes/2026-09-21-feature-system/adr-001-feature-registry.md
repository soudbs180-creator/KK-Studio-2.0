# ADR-001：功能卡片 + 登记册 + 生成看板 + 门禁

- 状态：Accepted
- 日期：2026-09-21
- 任务：FEATURE-SYSTEM

## 背景

功能状态此前分散在 task-ledger（工作项视角）、架构文档、代码里的 Prototype 字符串和各 change 记录中，没有“按功能定位”的入口；新 AI 难以快速判断某功能是真实可用、半成品还是纯演示。

## 决策

- 目录：`docs/features/`，一个功能一个 `feat-<name>.md` 卡片；`features.registry.json` 是机器可读权威（数组，与 task-ledger 同模式）；`README.md` 看板由 `npm run features:write` 生成，禁止手改；`_feature-template.md` 是模板；`BACKEND-ROADMAP.md` 是后端化路线。
- 状态口径：REAL / PARTIAL / PROTOTYPE / PLANNED（定义见 README），与任务状态（DONE/TODO/…）正交：卡片描述“产品能力真实程度”，账本描述“工作项进度”。
- 打通：每条功能记录 code/tests 路径（必须真实存在）、tasks（必须是账本内 ID）；非 REAL 功能必须挂至少一个未 DONE 任务。
- 门禁：`scripts/check-features.mjs`（逻辑在 `scripts/features/registry.mjs`）校验卡片章节、路径存在、任务存在、非 REAL 有开放任务、卡片均已登记、看板最新；并入 `npm run lint` 与 `verify`。

## 备选与取舍

- 仅用 Markdown 不设 registry：无法机器校验路径/任务一致性，放弃。
- 把功能状态并入 task-ledger：任务与功能是多对多、视角不同，会让账本臃肿，放弃。
- 自动从代码生成全部信息：import 关系可分析但“真实/演示”语义无法可靠推断，改为人工卡片 + 机器校验关键字段。

## 后果

- 新功能必须“先建卡 + 建任务”，否则 verify 失败，体系不会腐化。
- 新增卡片成本低（模板 + 一条 registry）；看板零手工维护。
