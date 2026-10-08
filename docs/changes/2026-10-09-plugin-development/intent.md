# Intent：修复开发态随包插件加载

- Task：TASK-PLUGIN-DEV-001；用户要求“检查完继续合并”“未完成和失败的继续任务”。
- 授权：既有失败项的最小技术修复、隔离回归、独立检查及通过门禁后的普通合并；用户无需另批准技术方案。
- Base：1d6f640ac6f3a1e7af32c38d85596527704dc54a；branch fix/TASK-PLUGIN-DEV-001-same-origin-modules。
- Outcome：固定1421开发模式能够发现并使用四个随包插件，设置不被错误遮罩阻挡。
- 现有事实：账本记录 /plugins/*.js public import FAIL；源码 @vite-ignore 动态导入 root-relative URL。安装的 Vite 会为该动态值注入 import query，其 public middleware 跳过带此 query 的请求。绝对同源 URL 是否修复必须由真实开发运行确认。
- 约束：沿用插件store、同源边界、HTTPS远程限制和 Tauri CSP；不关闭HMR遮罩、不新增权限/依赖、不覆盖已有失败证据。
- 对应 [spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)。

- 运行追加范围：TASK-PLUGIN-RECOVERY-001 保存/重启插件负载，TASK-PLUGIN-MARKDOWN-001 随包Markdown离线渲染；均为四插件完整可用的直接验收失败。Desktop/Web共享运行行为版本2.1.11 → 2.1.12；Mobile规划保持2.1.1。
