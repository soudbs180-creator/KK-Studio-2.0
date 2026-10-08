# Review：桌面单排标题栏

- Task ID：TASK-UI-013；独立审查状态 NOT VERIFIED；self-review PASS。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。
- Base：1af0357b088df79dc51e9b309ef310a500722cf8；head 待提交。
- self-review 和独立只读 review 分别记录；尚不声称独立审查通过。
- 重点：真实窗口功能、菜单/拖动边界、最大化状态、Web 回归、事件清理、最小权限与真实构建来源。
- 用户产品验收、托管 CI、合并和发布未执行。

Self-review：核对了 TopBar 的实际 App import、四项 main-only 权限和生成 capability、语义 token、窗口状态失败捕获、异步监听清理、菜单及 drag region 边界。完整 verify、client:check、新 release 真窗口与 Web development 已通过；没有修改既有测试断言或存储身份。正式独立评审仅在提交后开始，结论绑定真实 base/head。
