# Review：多供应商接入与多目标配置（Provider Connectivity）

- Task ID：TASK-PROV-002
- 时间与时区：2026-09-24 JST
- Reviewer/context/工具或模型（已知时）：待独立上下文审阅（本记录由实现会话起草，不冒充独立审阅）
- 独立于实现上下文：否；说明方式：同一会话实现并自检，独立 review 需在推送后由独立上下文执行
- Base SHA / head SHA / 规则版本：base origin/main 76339c9；head 17a821f5fa57b9e0be17fecb44431827876cb4be；AGENTS.md/AI_RULES.md@76339c9
- PR / branch / worktree：feat/TASK-PROV-002-provider-connectivity / D:/kk-studio/.worktrees/TASK-PROV-002-provider-connectivity
- Intent / Spec / Plan / Verification：docs/changes/2026-09-24-provider-connectivity/{intent,spec,plan,verification}.md

## 评审范围和方式

- 读取的真实 diff、实现、规范和证据：4 个新模块（providerTargetRenderers/providerConfigIO/modelCatalogWindow/mcpConfig）+ 4 个单测 + 账本/功能卡/文档包；对照 providerConnections 领域 schema 与 mcpClient 现有契约。
- 静态 review / 实际运行检查（逐项）：typecheck、eslint、394 单测、ui:check、format、governance/features/markdown 门禁全部本地执行通过。
- 未覆盖范围及原因：浏览器 test:ui 未本地运行（环境限制，推送后 CI 覆盖）；真实 Codex/Claude 消费未发生（接线任务）。
- self-review 与独立 review 的区别：本文件为实现会话自检记录；独立上下文 review 尚未执行，不得以此记录代替。

## Findings

| ID | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | ----- | ---- | --------------------- | ------------- | ---------- | ----------- | --------- |
| F-1 | P3 | 单测 | 否 | providerConfigIO 导入合并 keep-existing 语义 | 已存在 id 不覆盖运行状态，属有意设计 | 已记录 spec/测试 | 待独立审阅确认 |
| F-2 | P3 | 单测 | 否 | mcpConfig stdio env 拒绝密钥值 | 与“密钥不进 localStorage”基线一致 | 已记录 spec/测试 | 待独立审阅确认 |
| F-3 | P2 | 待调查 | 否 | 渲染产物与 Codex/Claude 版本字段兼容性 | 纯函数不影响现有行为，接线时对拍 | remaining.md 接线项 | 推送后接线任务验证 |

## 适用门禁

| 门禁 | 真实结果 | 证据与 SHA/时间 | 未满足的影响 |
| ----- | -------- | --------------- | ------------ |
| Self-review | PASS（本地） | 上表 verification.md，2026-09-24 | 无 |
| 独立 AI review | 未执行 | 待推送后独立上下文 | 合并前必须完成，不得自审代替 |
| CI / 定向回归 | 未执行（本地） | 推送后 verify/delivery | 合并前必须通过 |
| GitHub 实际审批数量/身份 | 未发生 | — | 平台 ruleset 现状 required approvals=0，按 PR 流程记录 |
| 用户 UI/交互/产品验收 | 未发生 | — | 本批无 UI |
| 推送/合并/发布授权 | 未发生 | — | 等待用户确认 PR 范围 |
| 恢复/回滚实证（适用） | N/A | 无数据写入 | — |

## 结论

- PASS / PASS WITH FOLLOW-UPS / CHANGES REQUIRED / NOT VERIFIED / BLOCKED：NOT VERIFIED（待独立上下文 review + CI）
- 未关闭 blocker：无本地阻断；独立 review 与 CI 为合并前必要条件
- 非阻断后续任务与理由：接线/聚合/协议转换见 remaining.md（独立交付单元）
- 新 head SHA 发生后本 review 对新提交失效；复审记录：待推送后补充
