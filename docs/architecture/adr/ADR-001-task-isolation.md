# ADR-001 — 当前源码候选与任务隔离

- Status: Accepted，2026-09-17；依据本轮用户完整整改及独立Task/Branch/Worktree要求。
- Context: 本地HEAD仍609f524，而现有产品功能大量未提交；直接从HEAD工作会丢失既有功能，只在共享dirty目录修改又不能安全并行。旧T3a计划限制不建第二checkout，已被本轮明确worktree授权更新。
- Decision: 仓库仍是D:/kk-studio-next；在该仓库登记的.worktrees下隔离任务。用独立Git index捕获限定源码为标明未验收的候选29d0d9b，不移动原分支，不更改原index，不把运行数据、临时脚本和生成证据纳入快照。后续task分支从候选起步，验证后再准备主线整合。
- Reason: 可追溯修改前后的有效源码，同时保留原dirty现场；规则可以被账本/CI验证，而非只靠聊天承诺。
- Alternatives: 从旧HEAD开发会重复/遗漏未提交能力；直接全量提交原checkout会错误归属其他工作；建立独立产品仓库会产生第二套工程。
- Consequences: 必须显式记录候选未验收范围；历史master和远端旧monorepo不能被混作新main。无remote时只准备本地commit与PR描述，不能宣称远端保护已启用。各worktree默认1421/1423运行端口需要串行协调。
