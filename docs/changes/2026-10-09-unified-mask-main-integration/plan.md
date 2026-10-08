# Plan：统一 Mask 主线整合

- Task ID：TASK-IMAGE-EDIT-001；串行实现，独立上下文只读复审。

1. 复用已结束且clean的登记任务worktree，保留原e7cfd285366fdb12902dd9bfe809069f29393281提交及历史证据；在任务分支merge当前main。
2. App所有Mask核心语义hunk逐一移到当前main；Provider与App灯箱嵌入保留的lazy workspace，CSS顺序image-edit→image-selection→desktop-titlebar。节点复用现有CanvasImageActions/ResultPreview，不恢复卡片内按钮；预览路由到App灯箱。
3. 语义合并账本，仅增加两项Mask任务，逐项保留104主线任务对象；35功能保留33主线对象，FEAT-003仅接入已审Mask的summary，其他字段保留。使用版本脚本递增Desktop/Web，Mobile规划不变。
4. 验证driver适配已合入的真实上方操作栏。完整verify、Rustfmt/test/clientcheck/fresh Agent release及native Mask/UI/TaskHost/model/titlebar/startup、Web三宽度。严格端口冲突仅等待原执行者释放，不终止其他进程。
5. 保存原始日志/工件指纹，提交精确产品；独立源码复审并修复阻断项。文档收尾后精确head补审。
6. 普通push及draft PR，当前verify/delivery/保护规则全通过后普通squash；landing whole-tree一致、本地main FF-only、实际post-main CI通过。保留所有分支/工作树/快捷方式。

## 当前运行复验调整

27bdb8b 的完整 verify、原生 Mask/UI13/TaskHost11/titlebar 通过。原生模型能力 driver 实际复现 strict-mode FAIL：原图加载与模型能力提示同时具有 status 角色。保留原 FAIL 日志；仅将原生及两处同类浏览器断言定位到实际 GenerationStatus 的 .local-generation-status，并要求唯一及 role=status，全部能力文字、禁用按钮、零请求和存储断言保留。产品源码和构建产物不改变；提交 driver 后补当前 head 完整 verify、原生模型和独立复核。

## 当前收尾

产品27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a、最新测试headeaa0886e99965d00a5a514b301adb665b150373d的完整445browser、native及生产三宽度/开发已知故障外的局部回归和独立审查完成。开发插件未修、primary-main冷启动复現超时、不代表零错开发验收；详情及例外由verification/独立报告绑定现有TASK-PLUGIN-DEV-001。下一步仅docs/evidence精确head复审、普通PR及最新Hosted/main门禁。
