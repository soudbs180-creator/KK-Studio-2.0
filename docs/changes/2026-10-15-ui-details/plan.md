# Plan：统一现有 UI 细节

- Task ID：TASK-UI-DETAILS-20261015；状态：IMPLEMENTED。
- 先从PROJECT_STATE核实最新运行树与真实import链；三个独立只读审计，无代理并发修改。
- 依赖顺序：复现与RED回归 → 共享composer/卡片/设置tokens及目录布局 → 同状态浏览器GREEN → 全量门禁 → 独立审查 → 新鲜桌面候选验收。
- 源码范围：StartComposer、ConversationActions、CanvasImageActions/CollectionToolbar与caller、VideoNode、SettingsPanel；composer/settings/extensions/媒体CSS和tokens。
- 测试：ui-details及原ui-unification、settings-latest-layout、canvas-selected-zoom-menu、video-upload-persistence；原断言只按本次反馈更正，保留存储/权限/错误断言。
- 风险：CSS优先级、旧响应式覆盖、按组换行、旧项目恢复；不改变Provider/草稿数据、删除原件或覆盖primary。
- 检查：build/typecheck、ui:check、相关生产浏览器，随后npm run verify；Desktop由现有启动器重建并绑定EXE与输入指纹。
- 回滚：本任务独立分支相对18e143f最小差量；未迁移数据，不reset/clean其他工作树。
