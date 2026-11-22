# Review：统一模型网关与本地模型商店

- Task ID：TASK-MODEL-GW-20261122
- 时间与时区：2026-11-22 / Asia/Shanghai
- Reviewer/context/工具或模型：实现同会话 self-review + 合入前架构/交付门禁复验
- 独立于实现上下文：否（self-review）；独立 Bugbot 已在 PR #87 留档，不冒充第二人 GitHub approval
- Base SHA / head SHA / 规则版本：`e4383a1e` → `53d056ad`（修复提交后以最新 head 为准）；AGENTS.md / ADR-027
- PR / branch / worktree：https://github.com/soudbs180-creator/KK-Studio-2.0/pull/87 · `feat/TASK-MODEL-GW-20261122-gateway-store` · `D:/KK Design`
- Intent / Spec / Plan / Verification：本目录对应文件

## 评审范围和方式

- 读取的真实 diff、实现、规范和证据：42 文件网关/商店变更；ADR-027；FEAT-040；定向单测
- 静态 review / 实际运行检查：架构 R1 深路径导入、delivery 缺 review.md、定向 unit；Desktop 大文件/GPU 未跑
- 未覆盖范围及原因：Native 多 GB 安装与 FastVideo GPU 出片需实机，标 NOT VERIFIED
- self-review 与独立 review 的区别：本稿为合入前自检与门禁修复；Bugbot 结论见 PR，非人工第二账号审批

## Findings

| ID | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | ----- | ---- | --------------------- | ------------- | ---------- | ----------- | --------- |
| GW-R1 | P1 | 否→是 | 是（governance） | `LocalModelStorePanel` / `FastVideoRuntimePanel` 深路径导入 `features/models/*` | Hosted governance 失败 | 改经 `features/models/index.ts` 桶导出 | 修复后复跑 governance |
| GW-DEL | P1 | 否→是 | 是（delivery） | change pack 缺 `review.md` | Hosted delivery 失败 | 补本文件 | 修复后复跑 delivery |
| GW-NV | P2 | 否 | 否（产品 PARTIAL） | Native 大文件 / FastVideo GPU | 未宣称 REAL | 后续实机任务 | OPEN |

## 复核摘要与交接

- 已确认的用户结果与验收范围：契约、设置入口、Key 池 credentialRef、mock/probe 单测可合入 PARTIAL
- 仍为 PARTIAL / NOT VERIFIED / BLOCKED 的范围：真实下载、GPU 出片、Inkling pin SHA
- 发现问题是否形成回归或 incident：否；门禁失败属合入前发现
- 交接给后续任务的风险、依赖和复查条件：Desktop 实机安装与 FastVideo GPU 双门通过后才可推进 FEAT-040

## 适用门禁

| 门禁 | 真实结果 | 证据与 SHA/时间 | 未满足的影响 |
| --- | --- | --- | --- |
| Self-review | PASS WITH FOLLOW-UPS | 本文件；修复 R1/delivery 后 | 无 |
| 独立 AI review | PARTIAL（Bugbot） | PR #87 Bugbot neutral | 不替代产品验收 |
| CI / 定向回归 | 修复前 FAIL；修复后待 Hosted | governance/delivery/verify | 未绿不可合 main |
| GitHub 实际审批数量/身份 | ruleset required approvals=0 | 仓库规则 | 不自批 |
| 用户 UI/交互/产品验收 | PENDING | 用户授权合主线，实机未验 | PARTIAL 保留 |
| 推送/合并/发布授权 | 用户要求合并主线 | 对话授权 | 待 CI 绿后 squash |
| 恢复/回滚实证（适用） | N/A | 普通 revert | — |

## 结论

- PASS WITH FOLLOW-UPS
- 未关闭 blocker：Hosted verify/governance/delivery 须在修复提交后转绿；实机路径非合入 blocker
- 非阻断后续任务与理由：PARTIAL 能力与文档已标明
- 新 head SHA 发生后本 review 对新提交失效；复审记录：合入前补审绑定最新 head
- 本结论不代替合并、发布或用户最终验收。

## 追加勘误

- 初版 PR head `53d056ad` Hosted governance/delivery/verify 失败；根因见 GW-R1 / GW-DEL，以后续修复提交关闭。
