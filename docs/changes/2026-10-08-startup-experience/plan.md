# Plan：桌面与网页启动体验

- Task ID：TASK-LAUNCH-001；状态：READY；普通已授权任务的 AI 技术决策。
- 分支：codex/TASK-LAUNCH-001-quiet-start；worktree：D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-LAUNCH-001。
- 基线：5dd6e6dddaf00cf2d5c14ae02ef5974c72238232；工作区初始 clean；独立 npm ci 完成，未借用其他树依赖。
- 基线 lint/typecheck/desktopRelease 12 项通过。默认 fetch 因失效本机代理失败，显式空 http.proxy 后 fetch 成功，origin/main 未前移。

## 顺序、验证与恢复

1. 登记本任务，先增加真实 Windows 安装/子进程/图标回归并保存 RED；增加 GUI 启动器、快捷方式脚本与 batch 后台模式，验证 GREEN。
2. 只读子代理审查 Web 首屏依赖与开销；root 串行修改共享 App，增加首次 landing/进入工作区/返回历史与按需页面回归。避免首次定位在异步 chunk 之前发送。
3. 同步 Desktop/Web patch、FEAT-026、PROGRESS、PROJECT_STATE、HANDOFF、账本和本交付包。保留 FEAT-026 PARTIAL 的安装/发布边界。
4. 执行完整 verify、client:check，重新构建带 Agent 的 Desktop；固定 1421/1423 验证实际 Web/Tauri，不占用其他任务端口。
5. 独立上下文审查真实 diff/源码/证据。审查后把桌面与 canonical 内被忽略的快捷方式指向本轮已验证的登记任务树；不改 main 源码或旧产物，不直接推送 main。PR 集成/用户验收后，再构建和复验稳定入口；被快捷方式引用的任务树必须保留。

依赖图：桌面调查和 Web 只读调查独立；实现、版本、构建、运行验收、审查、安装串行。root 是唯一写入者。风险：后台失败沉默、重复构建、首次工作区事件丢失和回到首页时丢失局部状态；分别由日志/错误、互斥、保持必要同步依赖及 sticky mount 回归覆盖。快捷方式变更前保存原目标/参数/图标收据；新快捷方式只在编译成功后写入；回滚可恢复收据，不覆盖用户数据。

推送前增量：origin/main前移至1af0357b，按分支规则在任务树保留双方记录并整合能力复查；新版本Desktop2.1.7/Web2.1.8。对组合重跑verify/clientcheck、production/Tauri/GUI图标与新鲜度，再绑定当前SHA独立补审；保留第一轮验证，不改写其版本/hash结果。
