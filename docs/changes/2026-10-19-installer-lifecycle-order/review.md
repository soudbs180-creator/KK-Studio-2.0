# Review：安装验收顺序的有界修复

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release。
- 状态：IN_PROGRESS / NOT_VERIFIED；currentPackage：本目录。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-lifecycle`；base：e43c5efaa9e80ad7ee617c852868a20e6093e08a/tree d9c0ee4206fb83bc413696b50356a887d10ad049；新head待提交。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

- Self-review：实现前已检查installer全流程和所有native启停调用，停止保护是原子drain ack，健康不代表无活跃mutation/prepare。测试直接IPC绕过UI pending/busy与lifecycle flight保护；不改该保护。
- 独立诊断：release_head_review独立只读确认自动ensure→prepare与旧测试stop可并发；真实运行由root唯一执行，观察409及自然ready支持本次测试时序原因，不声称Codex所有长期preparing风险已修复。
- 实现后dirty独立预检无阻断：independent-installer-lifecycle-order-dirty-precheck.json SHA256 85d5f15e9eed37a082d88e4baed0b7e9c672a4aa64f4319b338f42f422e2ba08；确认已有UI pending边界充分，原项目/四轮持久化/损坏拒绝/cleanup完整。精确提交独立审查仍NOT_VERIFIED，不用dirty预检代填。
- Hosted/实际GitHub审批/合并：NOT_VERIFIED；按实际ruleset正常流程，不自我批准、不绕过required checks。既有用户已授权正常提交合并与发布，非新增产品语义。
- 范围限制：本机已装WebView2，未做干净Windows VM/真实手机硬件/付费Provider调用；本任务测试维护不增加这些承诺。
