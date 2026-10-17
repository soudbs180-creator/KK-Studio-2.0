# Intent：审计修复与当前事实收敛

- Task ID：TASK-AUDIT-REPAIR-20261017
- 状态：READY；任务 IN_PROGRESS，产品及交付验证 NOT_VERIFIED。
- 日期：2026-10-17（Asia/Shanghai）
- 请求来源：用户授权执行 2026-10-17 文件、版本、任务、分支与代码审计的 A–D 方案；先保全，再修复、验证启动与同步治理。
- 用户授权范围：完整保全、隔离修复、相关测试和构建、按实测修复启动入口及本地防线、治理同步；删除、移动、远端配置、合并、发布或付费调用不因本计划自动获授权。
- Owner / branch / worktree：root / `fix/TASK-AUDIT-REPAIR-20261017` / `D:/kk-studio/.worktrees/TASK-AUDIT-REPAIR-20261017`。
- 来源：本地 `main@8c36a6b138205613ae1a7c27950b86792da8de1a` 的 63 条 dirty 原字节；隔离快照 `221560a322107092f66c142c7b911439087019f8` 明确未验收。远端基线 `d95e4c446d3b4ae5419ce0f58c68057ebabc286a`。
- 关联：[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)、[权威账本](../../governance/task-ledger.json)。交付包角色：current。

## 用户原意与工程转译

恢复可信启动和模型执行边界，先保护当前源码、历史与恢复能力，再修复审计发现的数据、权限、凭据、受理和素材垃圾箱问题。旧主仓及原 index 保留，不把未完成候选当作正式交付。

## 范围与非目标

- A：原件、Git refs/index/dirty、快捷方式和构建证据保全，进行隔离恢复核验。
- B：修复五个 P1 与素材垃圾箱误导；协议 6 尚无聊天隔离时按 ADR-022 禁用新聊天、临时聊天及不支持的多聊天/v3 写入，保留 v2 legacy 单聊天；12AI 缺持久 receipt port 时拒绝执行，完整接入仍开放。
- C：通过当前候选相关验证后，从独占实体依赖/产物构建并绑定 source、版本、receipt、EXE、实际进程，再修复日常入口；本地 hook 和运行时备份策略按实际证据记录。
- D：纠正失效任务分配、当前文档和规则矛盾，补齐需求文档包，保持原任务身份、功能成熟度及历史证据。
- 不实现统一接入完整新产品范围，不扩展多聊天承诺，不批量结案，不改用户数据身份、凭据引用和旧链接。

## 验收条件

| ID | 可观察结果 | 必要证据 |
| --- | --- | --- |
| AC-A | 原主仓、dirty、index 和历史可恢复 | 保全收据、hash 与隔离恢复比对；原失败保留 |
| AC-B | 不跨聊天泄漏，不越权/串凭据，不丢受理身份，不伪报删除成功 | 真实模块/调用链反例、修复后回归及持久化边界证据 |
| AC-C | 日常入口加载本候选真实产物 | 当前 source/版本/receipt/EXE hash/实际路径与进程、正常关闭重开；未完成时 NOT_VERIFIED |
| AC-D | 当前分配与文档可恢复且不虚报完成 | ledger/schema、文档链接/快照、功能及 Delivery 检查，旧证据完整保留 |

## 已知事实与风险

保全 core 已通过；原外部 memory 变更、两份新增文档和长路径首轮恢复失败保留各自记录。该结论不表示其他聊天永久静止。当前Desktop/Web已递增2.1.36，并取得unit/lint、4项浏览器与Rust bin的preflight证据；HEAD221560a3加dirty尚待冻结，完整verify、Native界面/启动、Hosted、最终SHA审查和用户验收仍无本包通过结论。
