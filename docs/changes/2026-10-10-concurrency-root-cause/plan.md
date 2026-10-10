# Plan：IRV-CONC-001 首轮异常定位

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：IN PROGRESS
- Owner：root；branch `codex/TASK-VERIFY-CONCURRENCY-002-root-cause`。
- Base：`7ebf143b291e344b243e1ef396d510bb91730bd3`；独立登记 worktree，无其他写入者。
- 依据：[intent](intent.md)、[spec](spec.md)；使用 systematic-debugging、using-git-worktrees 和 writing-plans 流程，自主执行已授权技术工作。

## 实施顺序

- [x] 核对 main、open PR、分支、账本、源码差异和全部历史失败。
- [x] npm ci、git guards；基线 lint/typecheck/build 实际通过。原失败标 PRE-EXISTING；Linux Edge 启动失败保留环境日志。
- [x] 为证据保护、固定端口、首轮/重试区分和资源单位补自动检查；先 RED，再实现诊断工具。
- [x] `scripts/diagnostics/browser-concurrency.mjs` 管理预定独立实验；reporter 和 Windows sampler 分别记录步骤与资源，不改产品/现有测试。
- [x] 新增独立 Windows CI 诊断工作流，执行全量4/12一次和历史9项1/12两轮；始终上传证据，不改变原 quality 工作流。
- [x] 从原始 gzip 重算历史时间线、资源、耗时及hash；保存派生分析，追加 GB/GiB 勘误。
- [ ] 实际运行实验，若失败先读取 trace 和资源，再设计单变量实验；若确认根因，先建立可失败回归再最小修复。
- [ ] 完成适用检查、文档/账本/进度/恢复入口；提交草稿 PR，按实际 head 独立审查。

## 验证与恢复

新脚本检查应覆盖已有输出目录拒绝（原件不变）、非默认端口拒绝、失败后首轮不被通过覆盖、进程子树与全机指标区分、GB/GiB正确换算、采样错误显式保留。定向 Node 检查和完整 verify 分别记录；Rust/native 不适用于无产品变更的诊断工具。Windows CI 是可运行环境，不能把本机 Linux 浏览器启动失败计作测试断言失败。

保留既有49份历史及20份矩阵原件；新增实验全部独立目录。新源码/head/基线发生变化后重验受影响范围并复审。无合并/发布/清理授权；撤销诊断工具用普通后续 PR，不覆盖历史证据。
