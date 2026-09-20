# Plan

- ID: conversation-panel-2026-09-11
- 变更文件: `CanvasHud.tsx`, `ConversationPanel.tsx`, `workspace.css`, `canvas-hud.css`, `motion.css`, `public/design/figma/chat-close.svg`, browser evidence and progress ledger.
- 实施顺序: 重读 Figma 组件与两种工作台状态 → 区分关闭/展开资源 → 把会话容器改成工作台覆盖层 → 固定右侧 HUD → 增加右向左进场与 reduced-motion 处理 → 采集同状态 DOM/截图 → 运行类型、单元、UI 标准、构建和桌面检查。
- 风险与回滚: 仅改变会话入口资源、覆盖层布局和动画；保留现有消息草稿、关闭回焦和窄屏规则。若回归发现窄屏碰撞，按媒体查询回退桌面覆盖层规则，不改变对话数据逻辑。
- 验证命令: `node_modules/.bin/tsc --noEmit`, `node --test tests/unit/*.test.ts`, `node scripts/check-ui-standards.mjs`, Vite build, direct Chrome same-state capture, `npm run tauri build -- --no-bundle`.
