# Review：T5 原生生命周期

- Task ID：T5；2026-10-08。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md)
- Base：`5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`。
- Self-review：PASS。本机实际十组原生验收、当前 product/harness 源文件 hash 与收据相同，完整 verify、Rust/native 构建和静态门禁通过；取消保留 unknown/已有资产，可选元数据不放宽资产 schema，测试只触及 owned 进程/合成凭据并完整清理。
- Independent review：NOT VERIFIED，需当前 committed HEAD 的独立上下文审查。
- 用户已授权完成待办与合并完成分支；GitHub 人类 approval、独立 AI review、Hosted CI 和用户授权分别记录，不互相代填。

重点抽查真实任务提交/取消/恢复、原件保留、幂等身份、fixture/native 边界和秘密隔离。无真实付费 Provider、生产部署、Mobile 或安装器发布结论。
