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

## 2026-09-26 独立复审与修复候选

独立于实现上下文的只读 reviewer 对 `76339c9..42c3f26` 给出 **CHANGES REQUIRED**。四项 P1：Bash 环境导出执行 URL 中的命令替换；stdio 持久化 schema 接受凭据 env；Codex 输出默认 `chat` 且根级模型选择误入 provider 表；中文 seed ID 碰撞并在合并时静默丢失。两项 P2：不同连接 ID 的目标配置键碰撞；catalog profile ID 可形成越界路径。原新增定向单测 24/24 通过但未覆盖这些输入；未接线的纯函数也不能因没有当前调用者而把错误输出视为可合并。

本工作树现以失败先行测试逐项修正上述六项：shell 值使用单引号转义，Codex 仅输出当前官方支持的 `responses` 并先写根级选择，stdio schema 直接拒绝凭据键/值，中文 seed 使用稳定指纹且导入重复 ID 显式拒绝，配置键附稳定指纹，profile ID 限于安全文件名。新增显示名换行 TOML 转义回归。`tests/unit/{providerTargetRenderers,mcpConfig,providerConfigIO,modelCatalogWindow}.test.ts` 当前定向 31/31 通过，TypeScript 通过；Bash 实跑保留了 `$(...)` 字面值。本段是实现者修复记录，**不是新 head 的独立复审结论**。主线并线、完整 verify、Hosted CI 和最终独立补审仍待完成；真实 Codex/Claude/Provider 消费仍为 NOT VERIFIED。

## 2026-09-27 合并 head 独立复审与补救

独立只读 reviewer 对 `origin/main@2683d852..39369c9` 给出 **CHANGES REQUIRED**：原 4 P1、2 P2 关闭，但合法中文 `connection.id` 的三目标渲染被 `catch` 静默吞掉（新 P1），同名 ASCII seed 不同地址仍撞 id（新 P2），FEAT-032 卡片关联任务状态滞后（P3）。该结论针对 `39369c9`，不因该 head 的本地或 Hosted 检查改变。

实现者已为两个行为补失败先行测试，旧代码 18/22、四项失败；随后用非 ASCII id 的指纹键、显式异常传播和包含地址指纹的 seed id 修复，定向 22/22 通过，并将功能卡状态改为 REVIEW。修复后完整本地 `verify` 为 456 Node、300 浏览器，治理 70/0、功能 32/0、Markdown 85/0。此段仍非修复后 head 的独立补审；精确 head Hosted CI 与真实第三方消费须分别记录。

## 2026-09-27 修复后精确 head 独立补审

独立只读 reviewer 对 `origin/main@2683d852fcbaba64d0bfff422650fff7f5d8ca9b..1f813229a1c4fcb80fc11ec116ceab0e8c137359` 给出 **PASS**，未发现新的 P0–P2 阻断。中文 `connection.id` 的 Codex/Claude/OpenAI 三目标均能生成，异常不再被吞；同名不同地址 ASCII seed 的 id 不同且合并保留两项；FEAT-032 卡片与账本均为 REVIEW，FEAT-030/031/032 并存。审阅者实际运行定向 33/33、TypeScript、治理 70/0、功能 32/0、Markdown 85/0、`git diff --check`，未独立重跑全量 `verify`。这项审查覆盖上述源码 head；补录本节的文档提交需再做只读检查，Hosted CI 与真实 Codex/Claude 消费各自另验。
