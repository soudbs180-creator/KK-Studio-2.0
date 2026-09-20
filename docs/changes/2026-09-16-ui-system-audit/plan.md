# UI 系统收敛计划

- ID：`2026-09-16-ui-system-audit`
- 变更文件：后续按阶段更新 primitive、页面样式、`ui:check`、测试和 `docs/PROGRESS.md`；本轮仅新增审计文档与证据。
- 实施顺序：Token → Base components → Layout/responsive → IA → Page alignment → Visual QA → Regression/release。
- 风险与回滚：每阶段小范围迁移；保留 Figma-specific variant 和 Prototype 边界；出现视觉回归时按页面回退，不做全量 CSS 重写。
- 验证命令：`node scripts/check-ui-standards.mjs`；实现阶段追加 `npm run verify` 及 web/Tauri 运行态核验。

顺序按“先建立约束，再迁移画面，再做视觉验收”安排。每阶段都应有可独立复核的产物，避免一次性重写。

## Phase 1 — Token cleanup

- 盘点 semantic color、type、spacing、radius、icon、motion 和 overlay 层级。
- 为现有小数 Figma 值补节点注释，标出可迁移值和保留值。
- 把 canonical 新增规则写入 `ui:check`，先阻止继续扩散，不做大范围视觉改变。
- 产物：token matrix、legacy exception list、静态检查报告。

## Phase 2 — Base component cleanup

- 建立并文档化 Button、IconButton、Input、Select、Badge、Capsule、Tooltip、Modal、Toast。
- 把 `.ui-button` 从 CSS utility 提升为可复用 React contract，同时保留 Figma 特殊控件的明确 variant。
- 集中处理 focus、disabled、loading、error、offline 和 accessible name。
- 产物：组件目录、variant matrix、Story/fixture 页面和键盘检查。

## Phase 3 — Layout/responsive cleanup

- 先处理 Sidebar、Landing composer、Workspace toolbar、Conversation panel、Assets grid、Task panel。
- 为每个 row 写 Fill/Hug/Min/Max/Wrap/Scroll/Truncate 规则；补 `min-width:0` 和移动端 More/sheet 方案。
- 验证 390/768/1440/1920，同状态检查动态文案压力。
- 产物：layout contract、responsive evidence、overflow regression cases。

## Phase 4 — IA cleanup

- 按 L0-L6 分组 shell、primary nav、page header、main content、context、metadata、advanced。
- 将 zoom detail、map options、rare export、MCP/advanced 等低频项移入 More/context/settings。
- 保证创建/发送、当前模型、任务状态和返回/关闭保持直接可见。
- 产物：IA map、navigation matrix、toolbar grouping review。

## Phase 5 — Page-by-page alignment

- 依次对齐 Landing、Workspace、Assets、Settings、Tasks、Account。
- Workspace 以 `404:28667` 和 `410:67357` 为基线；Creation/Account 以当前 `458:948`、`458:972`、`312:2436` 为基线。
- Landing 先在 Figma 重新建立有效 current frame，再进行实现级对齐。
- 每页只迁移一组 ownership 清晰的 primitives，避免混合视觉重构与业务改动。

## Phase 6 — Visual QA

- 每个状态提供截图、DOM geometry、computed style、键盘/鼠标路径和 Figma 节点映射。
- 检查 default/hover/active/selected/disabled/focus 及适用的 loading/success/error/cancel/offline。
- 对动效记录 duration/easing/enter/exit/cleanup；检查 Esc、blur、pointercancel 和 lost capture。
- 产物：per-state evidence manifest、差异清单、已知限制。

## Phase 7 — Regression and release

- 运行 typecheck、unit、ui:check、format、browser tests，并保存实际命令与结果。
- 重新构建 Vite production 和 Tauri `frontendDist`，确认加载的是新产物。
- 在 web 与 desktop 分别复核 route/import chain、runtime mode、窗口尺寸、缓存和旧进程残留。
- 产物：release verification、更新后的 `docs/PROGRESS.md`、可审阅的变更说明。
