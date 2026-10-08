# Plan：T5 原生生命周期收尾

- Task ID：T5；状态：IN_PROGRESS；2026-10-08。
- [Intent](intent.md) · [Spec](spec.md)
- Branch：`codex/T5-native-lifecycle`；worktree：`D:/kk-studio/KK-Studio-2.0/.worktrees/T5-native-lifecycle`。
- Base：`5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`。原树 clean，独立 npm ci，lint/typecheck 和 53 项原生恢复相关 Node 基线通过。

1. 编写真实原生验收脚本：独立 data/profile、owned CDP、loopback HTTP、唯一合成凭据；记录 SHA、EXE/bundle hash、计数、状态、恢复结果。
2. 构建并用未修复的 fresh release 执行验收；保留实际 RED。运行错误与产品失败分开记录。
3. 对已复现缺陷补实际原生异步回归，并运行现有 Rust 契约回归；最小修复现有 TaskHost，保存 unknown/逐输出幂等与归档边界。
4. 当前源码执行 targeted/full verify、Rust fmt/test/check、带 Agent 的 fresh release；真实 UI/IPC/restart 复验，按影响自动 bump。
5. 更新原 T5、功能卡、PROGRESS/Project State/Handoff；绑定 committed SHA 进行独立只读审查，修复 blocker 并补审。
6. fetch 合入最新主线，冲突逐项处理并复验；新 PR 当前 verify/delivery 通过后按用户授权 squash merge，记录 merge SHA 和合并后检查。

Review focus：fixture 不替代原生宿主；取消 race 不造成安全重试或丢已存输出；journal 先于 POST；异常重启不再次提交；不同身份不能覆盖同名任务；只触及 owned 测试进程/凭据；不覆盖其他任务的源码/端口/证据。验证入口为本目录 [verification](verification.md) 和 [review](review.md)。

执行调整：前端 queued intent 和 native submitted journal 分属 IPC 回执前后的正常阶段；成功项用正常退出，未确认图片/文本明确强杀 owned 进程并恢复。新发现的浏览器配置 durable 与既有 image health 缺口登记 TASK-PROV-005/006，不扩展本分支架构、不升级其能力状态。

2026-10-08 独立审查对 b58854c0 提出两项 P2 阻断：凭据 ID 冲突的异常可泄露原值、unknown 批次仍显示单项可重试。两处凭据检查改为布尔断言，真实原生测试使用 owned 合成凭据触发冲突，核对原值保留与异常/JSON 均无原值；BatchMatrix 与实际提交共享 retryableOutputIndices，失败项文字不预先承诺重试。真实 native header RED 与 Web 的 1 success + 1 unknown + 2 failed RED 保留，再构建分别复验。PR #35 已合入 main@5dd6e6dd，候选通过 fa9da162 承接当前主线；步骤 5–6 继续绑定最终提交与实际托管结果。

托管返修顺序：保留 8399 的实际失败与诊断，记录真实权限和退出时序；以受限 CI 包装器准备应用专属临时策略并验证所有所有权/清理分支；合入 PR #36 主线，重新验证模型能力与 T5 组合、版本及 fresh native，再补审当前 head 并执行 Hosted。失败不得通过延长门禁、取消原生检查或修改应用安全参数隐去。
