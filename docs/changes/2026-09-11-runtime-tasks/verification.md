# Verification

- ID：2026-09-11-runtime-tasks
- 命令与结果：
  - TypeScript 在任务面板和关闭重开修正后通过；最终一次 Tauri 重建被工作树随后加入的 `DemoResultNode.tsx` 类型错误阻塞（`CanvasItemKind` 未收窄为 `image|video`）。
  - `node --test tests/unit/*.test.ts`：20/20 通过；同步更新了 `canvasGraph` 旧图片尺寸断言，使其匹配当前 441px 视觉区域。
  - 任务面板 Playwright 定向用例：1/1 通过；配置入口回归包含任务入口检查：2/2 通过。
  - 生产浏览器回归：同一生产构建 94/101 通过；7 项失败均在现有画布连线、生成错误反馈或旧图片尺寸断言，任务面板用例通过。
  - 目标文件 Prettier 检查：通过。全仓格式门禁仍被 9 个既有文件阻塞；UI 标准门禁仍报告 `Canvas.tsx` 333 行超过 300 行边界。
  - `tauri build --no-bundle`：本轮曾成功生成并启动包含任务面板的 release；随后源码继续被并发画布改动写入，最终重建在 `DemoResultNode.tsx` 类型错误处停止，当前 release freshness 不能标为最新。
- 浏览器视口/状态：1920×1080，`http://127.0.0.1:1421/` development 证据和 `http://127.0.0.1:1423/` production preview 证据；工作台 route 由 `src/main.tsx → App.tsx → Canvas → CanvasHud → TaskPanel` 渲染。
- 截图或 DOM 证据：`docs/evidence/runtime-tasks-2026-09-11/dev-task-panel.png`、`dev-task-panel.json`、`preview-task-panel.png`、`preview-task-panel.json`、`task-panel.png`。生产 JSON 记录 `data-runtime-entry=src/main.tsx`、`index-BE4fsay9.js` / `index-gbDRN-Tn.css`、面板 `(321,108,196,240)`、标题 `(335,119,169,10)`、筛选 `(335,138,170,14)`、卡片区 `(335,161,170,52)`，三个占位资源均加载完成、页面错误为空；同时记录详情打开、入口关闭后详情清理、失败筛选空态。
- Figma 对比：节点 `396:938` 读取的原稿尺寸为 `196×240`，背景 `#1a1a1a`、边框 `#3c3c3c`、圆角 8；标题、筛选和卡片区相对坐标分别为 `(14,11,169,10)`、`(14,30,170,14)`、`(14,53,170,52)`。原始导出保存在 `tmp/figma-task/export.png`，占位图源文件来自同节点导出。
- 结论：Prototype。Runtime / Tasks 的原稿视觉状态、筛选和本地查看行为已实现并有同状态 Web 证据；真实任务服务未接入；Desktop 的最新 freshness 仍受工作树其它未提交文件在构建窗口内变更阻塞。
