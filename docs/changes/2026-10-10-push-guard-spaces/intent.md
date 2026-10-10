# Intent：Git pre-push 路径兼容

- Task：TASK-FIX-PUSH-GUARD-SPACES-001；2026-10-10；READY。
- 授权：用户要求落实路径修复、可重复回归、实际验证及可审查代码；技术决策在该范围内自主执行。
- 用户结果：Windows 含空格、多级目录和长路径的仓库可以合法推送，非法推送仍被拒绝。
- 范围：钩子启动、已审阅 v1 安全升级、真实 Git fixture、失败诊断；不改变推送策略、服务器保护、产品 UI、发布或用户数据。
- 基线：main `7ebf143b291e344b243e1ef396d510bb91730bd3`；PR #47 `0f663222addc22b08dc083c8cfd506e22ebe7971`。两者相关源码/测试/依赖/CI 相同；任务只登记于 #47，因此采用依赖 #47 的独立分支，不修改上游分支。
- 平台：开发工具修复，不改变 Desktop/Web/Mobile 运行产物，不递增产品版本。
- FACT：v1 已引用 shell 参数，但仍向 Windows Node 传入 POSIX 绝对路径；安装器拒绝任何不同版本的已安装文件。
- 边界：当前可执行环境是 Linux；Windows 原生测试须以 Hosted Windows 回执确认，模拟不得冒充原生结果。
- 关联：[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)、[Review](review.md)。
