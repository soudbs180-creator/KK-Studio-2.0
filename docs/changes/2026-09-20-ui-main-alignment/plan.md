# Plan

1. 以 origin/main@8aca3ab 创建 TASK-UI-MAIN-001；npm ci、原始 lint/typecheck 基线通过。
2. 以历史候选29d0d9b为三方基线比较原目录当前文件和稳定 main，只迁移27项源码/测试/审计脚本差异；对 ConversationPanel、TaskPanelPopover、settings.css、main.rs 保留 T3b/T4/T5 主线新增功能。
3. 读取 Figma 现行上下文；通过真实导航捕获34种状态，纠正设置、搜索、资产、任务入口和首页滚动；补回归及准确服务文案。
4. 完整 verify、Rust tests/client check/release；分别检查 development1421、production preview1423、隔离 Tauri release，记录 bundle、路由、DOM、截图。
5. 只提交本任务源码、Figma导出图标、回归、日期证据与治理文档；还原隔离工作树中测试自动改写的历史 evidence，不上传 node_modules/dist/target/.tmp/工作树/运行数据。
6. PR → GitHub CI → squash merge → 回读 origin/main。历史本地 main 保留为历史引用，当前仓库 main 迁移为云端同一提交；原 dirty checkout 的内容和原 index 完整备份校验后再切换，禁止 reset/clean、强推和删除历史分支。

独立治理任务 codex/TASK-GOV-002-ai-sdlc 在另一个 worktree 中；它不是已合并主线，不夹带其75文件修改。保留其分支和提交，并记录当前基线已推进，后续需在新 main 上重验。
