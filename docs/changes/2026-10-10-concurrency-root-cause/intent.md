# Intent：IRV-CONC-001 首轮异常定位

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：READY
- 日期与提出者：2026-10-10，当前用户。
- 请求来源：继续 IRV-CONC-001；定位历史首轮 flaky 的真实触发条件，设计并实际执行可重复实验。
- 授权：当前请求授权技术调查、隔离实验、必要修复和回归、分支及草稿 PR 准备。未授权合并或发布。
- 账本：`docs/governance/task-ledger.json`；本包 [spec](spec.md)、[plan](plan.md)。

保留 source105 原始失败和 1431 反例；核对最新主线、在途分支与测试条件，区分资源竞争、异步时序和环境差异。只对具有可重复因果证据的缺陷实施修复，不提高测试 timeout、不增加 retries、不删除断言。

| AC | 可观察结果 | 证据 |
| --- | --- | --- |
| AC-1 | 历史首轮失败逐项可追溯 | 校验原件 hash，提取测试身份、尝试、错误和时间重叠 |
| AC-2 | 并发/环境差异可以比较 | 相同构建、1423、retries=0；每轮独立目录与资源/步骤/服务采样 |
| AC-3 | 假设经过实验，结论不越界 | 执行 Windows/Edge 实验；失败保留；无法运行或未复现明确标记 |
| AC-4 | 确认缺陷才修复并回归 | RED/GREEN 和独立审查；根因未确认时任务保持 PARTIAL |

FACT：main `7ebf143b291e344b243e1ef396d510bb91730bd3`；#46/#48 已合并，#44/#45/#47 仍开放。source105 到 main 的 `src`、`tests/browser`、Playwright/Vite 配置和 root lockfile diff 为空。UNKNOWN：历史机器负载、浏览器精确版本、停顿来源。无待用户决定的产品语义。Desktop/Mobile、Provider、用户数据及其他在途任务不在本轮实现范围。
