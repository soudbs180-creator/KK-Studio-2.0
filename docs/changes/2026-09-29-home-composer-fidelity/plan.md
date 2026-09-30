# Plan：首页/对话输入区与剩余页面反馈收口

- Task ID：TASK-UI-HOME-002
- 状态：IMPLEMENTED；验证 PARTIAL（Figma 节点与关键交互已核验，canvas 图片 fixture 仍待补齐）
- 日期：2026-09-29
- Intent / Spec / ADR：`intent.md` / `spec.md` / N/A
- Owner / branch / worktree：root / `main` / `D:/kk-studio/KK-Studio-2.0`
- Base / HEAD SHA 与远端目标：工作区当前 `main`，保留既有 dirty changes；不重置、不清理。
- Git dirty/index 状态、并行任务与文件归属：工作区已有多个 UI/docs/test 改动；本轮保留它们，并补齐首页、对话、设置、侧栏、画布和移动顶栏的 Figma 收口。

## 开工证据

- 已读取规则、账本、规范和实现：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/*`、`docs/UI_INDEX.md`、`docs/UI_RULES.md`、`docs/DESIGN-SYSTEM.md`、DS1.3 input contract、`StartComposer`/`StartPage`/`ConversationActions`/响应式 CSS。
- Figma：重新授权后成功读取 `0nU0A7pq6eyjwfwm1TtWkO` 节点 `483:753`、`407:29265`，取得代码上下文与截图。
- 基线：既有 typecheck/build 已通过；既有 settings 前三项、canvas/chat 定向回归通过，完整 canvas fixture 有已记录的 `connector-video1` 限制。
- 计划中 AI 自主事项：移除 Home shortcut；按节点固定 composer 几何；设置分类移到底部；侧栏默认收起并固定画布工具条；修复对话入口；更新相关断言；补 browser evidence。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `StartPage.tsx`, `App.tsx` | 删除首页提示词库快捷按钮及无用 prop，保留菜单/面板 | 无 | typecheck、DOM count |
| 2 | `composer.css`, `conversation-panel.css`, `responsive-content.css` | 首页/对话输入区按节点固定几何；移除旧宽度覆盖 | 步骤1 | computed style、截图 |
| 3 | `settings.css`, `SettingsSectionData.tsx`, `responsive.css` | 设置分类改为连续底部滑块；移动顶栏按反馈布局 | 步骤1 | DOM bounds、截图 |
| 4 | `useSidebarLayout.ts`, `SidebarIcon.tsx`, `sidebar.css`, `responsive.css`, `CanvasToolbar.tsx`, `canvas-tools.css` | 侧栏收起默认态、291px 展开态、左小右大状态图标、工具条尺寸和对话重开位置 | 步骤1 | expand/collapse smoke、geometry、图标资源 |
| 5 | `input-contract.spec.ts`, `ui-feature-parity.spec.ts` | 断言设计后的入口与菜单路径 | 步骤1–4 | 定向 Playwright |
| 6 | `docs/changes/...`、账本 | 记录实现、验证、审查和未验证边界 | 步骤1–5 | governance/markdown |

## 风险与恢复

- 最危险场景：隐藏首页入口造成提交链路或旧测试无法进入生成选项；通过保留 draft 字段、菜单入口与画布节点参数降低影响。
- 恢复：若触屏生成流程需要选项，撤销本任务 media-query block，保留 shortcut removal 和 tablet grid 修复；不触碰用户已有 dirty changes。
- 不选择的方案：不删除 PromptLibraryPanel，不将提示词库功能移到新的不可验证入口。

## 验证和交付

- 定向回归：home/prompt menu/input contract、responsive layout、composer fidelity、settings scroll、canvas/chat smoke。
- 构建：`npm run typecheck`、`npm run build`。
- UI evidence：Vite development 1421、390/834/1099/1920 screenshots、Figma node screenshots、设置/工作区 geometry smoke retained in verification notes.
- 暂不可验证：Tauri release、真实软键盘、live provider、用户最终视觉验收。

## 计划变更记录

- 2026-09-29：Figma 重新授权后从“仅按仓库旧契约”扩展为首页、对话、设置、侧栏、画布和移动顶栏的节点收口。
- 2026-09-29：完成首页/对话 composer 几何、设置底部滑块、收起侧栏、画布工具条、移动顶栏和对话导航 smoke；输入、菜单、设置、侧栏和 shell 断言已迁移到当前节点，canvas 图片 fixture 仍保留为后续核查项。
- 2026-09-29：根据浏览器反馈修正平板侧栏：展开宽度从旧的 304px 收敛到 Figma 的 291px，工作区随右边缘移动；收起/展开图标改为左小右大的几何，展开态填充左侧小框。
