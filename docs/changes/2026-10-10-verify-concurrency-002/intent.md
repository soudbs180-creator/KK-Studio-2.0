# Intent：浏览器并发失败原因与隔离复核

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：IMPLEMENTED（诊断范围；产品修复未实施）
- 日期与提出者：2026-10-10，当前用户“你看着来，但要根据规则执行，继续任务”
- 请求来源：继续未完成任务，并严格按仓库规则执行。
- 用户授权范围与依据：授权继续技术审计、隔离验证和必要文档收口；不授权把本地结果伪装成 Hosted/主线结果。
- 关联账本、spec、plan：`docs/governance/task-ledger.json`、本目录 `spec.md`、`plan.md`

## 用户原意

保留历史浏览器并发首轮失败，继续查明资源或超时条件，不能靠重复运行隐藏失败。

## AI 工程转译

在干净的 `origin/main@8090475958f1a0bdd1b4b36ada7f2aba1e4e6264` 隔离 worktree 中，复用同一份 production `dist`，固定 preview 端口 1423 与 `retries=0`，执行 workers 1/2/4/8/12 的完整 447 用例矩阵。每档保留原始 Playwright JSON、控制台、退出收据和本次测试进程树资源采样；把当前结果与 source105 的 9 个 flaky 首轮失败分开记录。只有出现可重复根因才实施最小代码修复。

## 目标与非目标

- 预期结果：确定当前 main 在不同并发档位的首轮失败/超时边界，并保留可审计原件。
- 包含范围：`tests/browser`、`playwright.config.ts` 的并发验收行为和证据，当前 source 与历史 source105 的差异核对。
- 明确不包含：不修改产品断言、timeout、端口契约或测试重试策略；不把降并发称为根因修复；不伪造 Hosted、PR、合并或新 main 回读。
- 受影响平台/模块：Web production preview、Playwright/Edge 浏览器测试；不涉及 Desktop/Mobile 产品实现。
- 已有实现和规范来源：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/SDLC.md`、`docs/engineering/REVIEW.md`、`docs/governance/task-ledger.json`、`docs/changes/2026-10-09-windows-entry-diagnostics/verification.md`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| AC-1 | 历史 source105 首轮失败及其来源仍可追溯 | 原历史压缩原件与既有 verification 不覆盖；新目录追加当前证据 | Web/审计 |
| AC-2 | 当前 main 的并发档位没有被重试隐藏 | 1/2/4/8/12 workers 均 `retries=0`，每档 447 个结果逐一保留 | Web/Edge |
| AC-3 | 可比较并发与资源条件 | 每档固定 1423、同一 production dist、进程树 JSONL、RSS/空闲内存和端口收据 | Web/Edge |
| AC-4 | 结论不越过证据边界 | 当前结果、历史失败、Hosted/PR/main 未验证项分开；任务保持 PARTIAL/NOT VERIFIED 边界 | 工程治理 |

## 假设、风险和决策

- FACT（直接证据）：当前 source 与 source105 的浏览器测试/config 无代码差异；本轮 1/2/4/8/12 均为 447/447、retries=0、exit 0。
- INFERENCE（假设及风险）：历史 12 workers 的 9 个首轮失败集中在重型测试并接近 30 秒 timeout，跨模块且重试换 worker 后通过，支持共享调度/进程资源压力假设；本轮未复现，不能称根因已确定。
- UNKNOWN / CONFLICT：历史 Hosted 原因、当前 Hosted/PR/普通合并/main 回读仍 UNKNOWN；本机资源峰值不能替代 Hosted 证据。
- AI 自主决定的技术事项及理由：使用固定 1423、同一 dist、retries=0 和独立 evidence 文件，避免端口误判、构建漂移和 retry 掩盖首轮结果。
- 必须由用户决定的产品语义/范围事项（无则写无）：无；本轮只做已授权工程诊断。
- 外部条件、费用或不可逆动作及已有授权：无外部写入；网络/Hosted 读取未执行或不可用，不推断成功。
- 不在本次范围的问题与账本 ID：Hosted/main 推广、端口来源契约 `TASK-VERIFY-ORIGIN-003`、Windows Hosted 恢复 `TASK-WINDOWS-ENTRY-RECOVERY-003`。
