# Intent：P1 exact SHA 证据收口

- Task：冻结一个可回读的干净 exact SHA，核对远端 Hosted 结果，并按依赖顺序收口 P1 任务。
- 范围：`TASK-VERIFY-ORIGIN-003` 的来源/端口契约、同一 SHA 的本地回归、GitHub Hosted receipts，以及后续 P1 的证据边界。
- 约束：不扩展 P2；不修改产品实现；不把脏工作树、旧 receipt 或跳过的 delivery 当作发布完成。
- 目标：形成可复核的候选快照和明确的 DONE、REVIEW、PARTIAL、TODO、NOT VERIFIED 边界。
