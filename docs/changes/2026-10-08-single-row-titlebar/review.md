# Review：桌面单排标题栏

- Task ID：TASK-UI-013；当前组合 NOT VERIFIED；旧版本独立审查为历史 PASS。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。
- Base：1af0357b088df79dc51e9b309ef310a500722cf8；独立审查 head：6c37fb5a3ef5eed862b0eab453500507f0fb32de。
- Reviewer：`titlebar_review` 独立只读 Codex 上下文；时间 2026-10-08 19:40:36，Asia/Shanghai。不同于实现者 self-review，不代表 GitHub 账号审批。
- 重点：真实窗口功能、菜单/拖动边界、最大化状态、Web 回归、事件清理、最小权限与真实构建来源。
- 用户产品验收、托管 CI、合并和发布未执行。

Self-review：核对了 TopBar 的实际 App import、四项 main-only 权限和生成 capability、语义 token、窗口状态失败捕获、异步监听清理、菜单及 drag region 边界。完整 verify、client:check、新 release 真窗口与 Web development 已通过；没有修改既有测试断言或存储身份。正式独立评审仅在提交后开始，结论绑定真实 base/head。

独立审查：检查实际 diff、相关源码、交付文档、截图与初次失败/最终通过日志。15 项源码与 JS/CSS/EXE 指纹一致，截图与原件一致；browser JSON 支持 411/411、零失败/零 flaky，既有 desktop-agent 测试未修改。reviewer 实际执行的四项内存探针覆盖初始化异常、卸载后迟到响应/订阅、resize/unlisten、操作失败恢复，均通过；核对 installed Tauri 2.11.5 的拖动目标处理，菜单/按钮/图标后代不触发 drag。没有 P0–P3 finding 或本次验收阻断项，Declined to judge 为空。

限制：reviewer 没有重跑完整构建或启动原生窗口，动态结论来自抽查过的原始运行证据及其内存探针。开发态 stylesheet href 为 null，单独不能识别每份 CSS 的加载顺序；本次生产态实际样式表 URL 与 computed 40px/中心线保存在 native receipt，源 import 顺序另核对。macOS/Linux、安装器、Agent resources、Hosted CI、用户最终视觉验收和发布不属于本次 PASS。最后的治理文档提交单独请求本 reviewer 回读；产品源码与构建指纹保持本次审查版本。

## 当前主线预检及修复

独立 reviewer `continuation_review` 对 f922cf8e3e3318c5b01a922eaed424b11ccb2d0a → 8d8584c4a08a2425cdd4c15922d5e1b4661b3dbb 的只读源码预检为 CHANGES REQUIRED。旧 PASS 不覆盖新增故障条件。

| ID | 优先级 / 状态 | 复现和处理 |
| --- | --- | --- |
| UI013-REVIEW-001 | P2 / root 已修复，待独立复验 | 初始化旧 false 读在最大化及新 true 读后迟到，按钮错误恢复为最大化；统一读序号，在操作开始前失效旧读，卸载与操作 token 阻止迟到更新。 |
| UI013-REVIEW-002 | P2 / root 已修复，待独立复验 | SDK 的 void 类型清理函数实际返回 Promise；已登记卸载、卸载后迟到登记两条拒绝均触发全局 unhandledRejection；统一捕获同步异常及 Promise 拒绝，以固定内部诊断记录，禁止卸载后写状态。 |

真实组件 VM 回归先在 8d 旧实现运行，7/7 FAIL；最小修复后 7/7 PASS。未替换组件同步逻辑；故障清理测试只用被动 catch 保持测试进程稳定，要求实际组件自行输出诊断。独立 reviewer 将另外检查全局拒绝事件。lint/typecheck PASS。完整新组合及最终 source/doc SHA 审查、Web/native、Hosted 和合并门禁仍待执行。
