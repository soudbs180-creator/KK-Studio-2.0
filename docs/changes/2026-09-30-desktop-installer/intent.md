# Intent：Windows 安装器与隔离恢复验收

- Task ID：TASK-DESKTOP-INSTALLER-001；父任务 T7。
- 状态：READY；日期：2026-09-30。
- 用户来源：“继续剩下的任务”；按[已登记剩余顺序](../2026-09-29-project-landing/remaining.md)优先 Desktop。
- 授权范围：已授权技术实现、打包与隔离测试；正式签名/发布、真实用户数据迁移和干净系统验收分别保留。
- [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md) · [Review](review.md)。

当前已有经过实际运行验证的 Desktop 2.1.2 ZIP，但没有安装器。提供包含完整 Agent 和离线 WebView2 的 Windows x64 安装包，逐文件核对安装结果，并验证重装、损坏资源修复、卸载再装后项目保留。

AC-1：锁定依赖可构建 current-user NSIS 安装器，保持应用和用户数据身份。
AC-2：安装器/EXE/全部运行资源与 commit/hash 对应；损坏包校验失败。
AC-3：隔离目录真实安装、启动、Agent 健康、重装、损坏资源修复与卸载再装成功；项目保留。
AC-4：拒绝覆盖已有用户安装；测试记录不冒充干净 Windows、无 WebView2 首装、签名或低版本回滚。

本次只改变安装/验证工具及打包配置，应用运行功能与三端版本保持现行版本；按 VERSIONING 的构建准备规则无需递增。T7 的完整发布依赖仍开放。
