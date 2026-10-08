# Review：桌面单排标题栏

- Task ID：TASK-UI-013；独立审查 PASS；self-review PASS。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。
- Base：1af0357b088df79dc51e9b309ef310a500722cf8；独立审查 head：6c37fb5a3ef5eed862b0eab453500507f0fb32de。
- Reviewer：`titlebar_review` 独立只读 Codex 上下文；时间 2026-10-08 19:40:36，Asia/Shanghai。不同于实现者 self-review，不代表 GitHub 账号审批。
- 重点：真实窗口功能、菜单/拖动边界、最大化状态、Web 回归、事件清理、最小权限与真实构建来源。
- 用户产品验收、托管 CI、合并和发布未执行。

Self-review：核对了 TopBar 的实际 App import、四项 main-only 权限和生成 capability、语义 token、窗口状态失败捕获、异步监听清理、菜单及 drag region 边界。完整 verify、client:check、新 release 真窗口与 Web development 已通过；没有修改既有测试断言或存储身份。正式独立评审仅在提交后开始，结论绑定真实 base/head。

独立审查：检查实际 diff、相关源码、交付文档、截图与初次失败/最终通过日志。15 项源码与 JS/CSS/EXE 指纹一致，截图与原件一致；browser JSON 支持 411/411、零失败/零 flaky，既有 desktop-agent 测试未修改。reviewer 实际执行的四项内存探针覆盖初始化异常、卸载后迟到响应/订阅、resize/unlisten、操作失败恢复，均通过；核对 installed Tauri 2.11.5 的拖动目标处理，菜单/按钮/图标后代不触发 drag。没有 P0–P3 finding 或本次验收阻断项，Declined to judge 为空。

限制：reviewer 没有重跑完整构建或启动原生窗口，动态结论来自抽查过的原始运行证据及其内存探针。开发态 stylesheet href 为 null，单独不能识别每份 CSS 的加载顺序；本次生产态实际样式表 URL 与 computed 40px/中心线保存在 native receipt，源 import 顺序另核对。macOS/Linux、安装器、Agent resources、Hosted CI、用户最终视觉验收和发布不属于本次 PASS。最后的治理文档提交单独请求本 reviewer 回读；产品源码与构建指纹保持本次审查版本。
