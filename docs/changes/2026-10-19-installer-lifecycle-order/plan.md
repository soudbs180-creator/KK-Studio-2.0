# Plan：先修复验收顺序再继续统一发布

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release。
- 状态：IN_PROGRESS / NOT_VERIFIED；currentPackage：本目录。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-lifecycle`；base：e43c5efaa9e80ad7ee617c852868a20e6093e08a/tree d9c0ee4206fb83bc413696b50356a887d10ad049；新head待提交。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

1. 已读现有installer、DesktopAgentControl/lifecycle、App ensure调用、Rust stop与服务drain；真实同包诊断记录HTTP409和prepare自然完成，不把通用错误字符串当实际HTTP码。
2. 只移动tests/desktop/installer.mjs原Agent探针到首次launch后/新建项目前，复用设置里服务运行中和停止按钮enabled等待首页flight结束，补强启动和停止状态断言。先写本包，再改代码；不改应用、配置、构建输入、生产guard。
3. 用已验证官方d965候选做完整四轮隔离安装预检，保留第一轮失败；全相关单测、lint/typecheck/格式、两个版本检查及精确head Delivery/独立审查。其他153账本对象和其原JSON尾字节保持。
4. 正常新PR/Hosted门禁和合并后main检查；本次仅test/docs，不扩大Windows candidate路径，正式tag始终fresh构建，不用旧候选代填。
5. 正式单setup完整验收、默认资料安装前后保护、实际客户端Agent/工具栏、公开下载及kkai.plus/手机Web生产回读，最后另追加实际发布收据。
