# Intent：完成 T5 原生任务生命周期验收

- Task ID：T5
- 状态：READY；2026-10-08，AI 在用户授权范围自主执行。
- 用户请求：“如果完成的分支请合并到主线。如果没有完成的继续完成。”此前要求盘点、实现、回归、构建和报告。
- 关联：[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)；[权威账本](../../governance/task-ledger.json)。

T5 已实现原生 TaskHost，但账本仍缺实际 Tauri 提交、取消、进程重启与逐输出恢复证据。本轮在独立数据目录和 WebView profile 中，用本机 HTTP fixture、合成凭据和 fresh release 完成这些验收；发现实际缺陷则补回归并修复。

| AC   | 可观察结果                                                        | 验证                                                  |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| AC-1 | 请求到达供应商前，项目提交意图及原生 journal 已持久化             | 实际 Tauri UI/IPC 与真实 loopback HTTP 服务、磁盘读取 |
| AC-2 | 同身份重放、WebView reload、原生进程重启不增加供应商 POST         | 服务端请求计数及原生身份核对                          |
| AC-3 | 取消及时停止本地等待；已发送但未确认的输出保留 unknown            | 阻塞响应、原生取消命令、状态/计时                     |
| AC-4 | 已归档输出经异常终止和重启仍可读取；unknown 没有普通重试          | journal、asset hash、原生 UI/恢复                     |
| AC-5 | 原生文本并发围栏及取消后容量释放正常                              | 真实 SSE fixture 和 IPC                               |
| AC-6 | 受影响回归、完整 verify、Rust/native 构建、独立审查和托管门禁通过 | 当前候选 SHA 的新证据                                 |

FACT：主线基线 `5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`，PR #34 已合并。阶段工作台和模型能力分支有其他执行者，本轮不修改其工作区。技术方案与隔离验证属于已授权继续完成工作。真实付费 Provider、VPS、ComfyUI、Mobile、安装器发布不由 fixture 证明，仍沿用对应开放任务；不创建真实费用或部署。
