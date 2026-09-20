# Plan

- ID：2026-09-11-runtime-tasks
- 变更文件：`src/components/canvas/TaskPanel.tsx`；任务样式位于 `src/styles/workspace.css`、`canvas-hud.css`、`ui-tokens.css`；Figma 原始占位图位于 `public/design/figma/task-placeholder-*.png`；浏览器回归更新 `ui-motion.spec.ts` 与 `interaction-regressions.spec.ts`。
- 实施顺序：读取原稿和本地运行链路；用语义令牌校正几何及资源；补齐筛选、详情与关闭行为；在 1421 development 和 1423 preview 采集同状态证据；运行类型、单元、UI 规则、格式、生产浏览器和 Tauri 构建；同步账本。
- 风险与回滚：当前工作树包含其它未提交的画布变更；只对任务面板范围做局部修改，不重置工作树。数据保持 Prototype。回滚应只撤回本轮 TaskPanel、任务专属样式、资源和测试差异。
- 验证命令：`npm run verify`、`npm run test:ui`、任务面板定向 Playwright、目标文件 Prettier、`node scripts/windows/desktop-release.mjs` 与 `inspectDesktopRelease`。PowerShell 中通过临时 PATH 指向已安装的 npm CLI 执行现有脚本。
- 附带验证修正：`tests/unit/canvasGraph.test.ts` 的固定锚点从旧图片视觉尺寸更新为当前已实现的 441px 图形区域对应坐标 `(619,385.5)`，没有改变画布运行逻辑。
