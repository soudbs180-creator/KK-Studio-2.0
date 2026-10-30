# Plan：最小规则与派生文档同步

- Task ID：TASK-FIGMA-FIRST-20261021；日期：2026-10-21。
- [Intent](intent.md) / [spec](spec.md) / [verification](verification.md) / [review](review.md)。

1. 核对适用规则、分支/工作树、dirty/index；原本治理与 Markdown 检查均退出0。无相同规则任务；工作树创建被存量体积门禁拒绝，复用当前 checkout 的短期规则分支，不移动或清理其他任务。
2. 在线核对旧节点失效，取得用户的新链接后读取规范页七章、共享 Text Styles 与 Geometry/Icon Weight 变量；不写 Figma 或本地 UI。
3. AGENTS.md 定义强制顺序，UI_INDEX 统一来源/映射/同步规则；更新 DESIGN.md 人工说明、设计/交互/模板/运行文档及权威路由，保留 CSS 生成的 YAML 原样。
4. 扩展已有 agent-contract 场景；执行文档、生成器及适用项目检查，保存真实失败；独立上下文只读复核本次 diff 与规则场景。
5. 更新账本、进度、当前事实与恢复入口。仅在当前门禁及独立审查满足后进行提交/整合；不夹带已暂存产品改动，不自动合并已分叉的 main/origin/main。

恢复：本次文件在开工前无 dirty 变更，可按本任务 diff 逐块撤回；禁止回滚整个检出、覆盖其他 staged/unstaged 内容或改写历史失败证据。日志在容器 `output/logs/figma-first-20261021/run-01/`。
