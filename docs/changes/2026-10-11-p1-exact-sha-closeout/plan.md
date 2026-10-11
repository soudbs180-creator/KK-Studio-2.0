# Plan：P1 exact SHA 证据收口

1. 冻结远端 `main` 的 exact SHA，并在隔离 worktree 中确认 clean。
2. 从 GitHub 回读同一 SHA 的 Hosted `quality.yml` 与 `git-guards` 结果，记录 delivery 是否执行。
3. 在冻结树上重跑来源契约、目标 browser specs、build 和治理检查；将环境相关失败单独标记。
4. 只有同一 SHA 的独立审查收据齐全时，才考虑把 `TASK-VERIFY-ORIGIN-003` 从 `REVIEW/PARTIAL` 升级；其余 P1 继续按依赖和外部证据保持原状态。
5. 不执行 merge、push、release、真实 Provider、第二环境安装或用户验收。
