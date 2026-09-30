# Plan：画布会话分栏与固定侧栏交互修复

- Task ID：TASK-UI-CANVAS-001
- 状态：IMPLEMENTED
- 日期：2026-09-28
- Intent / Spec / ADR：`intent.md` / `spec.md` / 无 ADR
- Owner / branch / worktree：root / `main` / `D:/kk-studio/KK-Studio-2.0`（保留既有 dirty worktree）
- Base / HEAD SHA 与远端目标：base `a89792ad8f8d1354418cf70289ff4bd650706272`；本任务未提交，HEAD 保持该 SHA。
- Git dirty/index 状态、并行任务与文件归属：工作区已有大量并发 UI/文档改动；本轮只追加与画布/会话分栏有关的源码、测试和本 change package，不清理或覆盖其他改动。

## 开工证据

- 已读取的规则、账本、规范和实现：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/PROMPTING.md`、`docs/UI_INDEX.md`、`docs/UI_RULES.md`、`docs/DESIGN_TOKENS.md`、`PROJECT_STATE.md`、task ledger、`App.tsx`、`Sidebar.tsx`、Canvas HUD/toolbar/navigation、`ConversationPanel`、`useCanvasViewport`。
- 依赖/工具版本与安装：Node 24（项目要求 >=24）、npm 11.19.0（`D:\tools\node-v24.20.0-win-x64\npm.cmd`）、现有 node_modules；未新增依赖。
- 基线 lint/typecheck/相关测试：现有工作区包含其他未提交改动；本轮以 targeted browser tests、typecheck、build 和 git diff check 作为范围验证。
- PRE-EXISTING FAILURE 与关联任务：`canvas-layout.spec.ts --grep "缩放和窄屏"` 中 `connector-video1` 超时，原因是既有 blank project 使用空 canvas fixture；记录在 verification，不归因于本轮布局改动。
- 计划中 AI 自主事项：在不改变业务状态的前提下选择 960px 分栏断点、CSS rail inset 和固定 44px toggle。

## 实施顺序

| 步骤 | 文件/模块                                                     | 改动和目的                                                                | 依赖               | 验证                          |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------ | ----------------------------- |
| 1    | `Sidebar.tsx`                                                 | 移除侧栏 ResizeHandle，只保留开关                                         | 既有 sidebar state | 1067px 展开/收起断言          |
| 2    | `App.tsx`                                                     | 按 phone/窄 tablet 区分覆盖式会话和分栏会话                               | `useSidebarLayout` | canvas inert/interactive 断言 |
| 3    | `responsive*.css`, `canvas-hud.css`, `conversation-panel.css` | 960–1200px 让会话占 rail，HUD/nav/toolbar 左移并保留；<960px 保留覆盖规则 | 现有 CSS cascade   | computed geometry 与截图      |
| 4    | `tests/browser/*.spec.ts`                                     | 将平板预期改为分栏，补 fixed sidebar/边界/对齐回归                        | 1–3                | targeted Playwright           |
| 5    | `docs/changes`, ledger, PROGRESS, PROJECT_STATE, HANDOFF      | 记录事实、限制和验证结果                                                  | 1–4                | governance/markdown checks    |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：无；当前根目录已有其他 dirty 工作，未另起并行写入。
- 同文件写入的串行顺序：先核对 `App`/CSS 实际布局，再改组件和断言，最后写文档。
- 整合负责人、目标 branch/base 和同步策略：root；保留当前 main dirty 状态，不提交、不推送。
- 冲突后重新验证的范围：若其他 UI 改动改变 CSS import 或 sidebar DOM，需重跑 typecheck、build 和 1067/834 Playwright。

## 风险与恢复

- 最危险的失败场景与预防：会话 rail 覆盖导航或工具栏；用 canvas/panel/nav/toolbar 四边界断言和 screenshot 防止回归。
- 数据备份/原件保护/回滚或补偿：无数据迁移；仅回滚本轮 CSS、App prop 和 sidebar render。
- 触发恢复的条件及 runbook：若 960px 以下控件被遮挡，恢复 `covered` 和 max959 隐藏规则，重建 dist 后重跑 targeted tests。
- 高风险外部动作的授权、权限和费用边界：无。
- 不选择的方案及理由：不使用 JS 手动移动节点；CSS right inset 能让 viewport 测量和现有世界坐标保持一致。

## 验证和交付

- 定向回归，bug 修复的预期失败及修复后结果：平板会话测试由“toolbar hidden/canvas inert”调整为“toolbar visible/canvas interactive”，并增加 rail/对齐边界；修复后通过。
- 完整验证与必要 Rust/native/live 检查：typecheck/build 通过；本轮未跑完整 `npm run verify`、Rust/native/live provider。
- UI 的 Figma/DOM/截图、1421/1423/Tauri 证据：Vite preview 1423 targeted Playwright；开发页面 1421 HMR 与 Playwright 直接 DOM 检查；截图 `evidence/after-tablet-chat-final.png`。
- 独立 reviewer 与当前 SHA 审查：未创建独立 reviewer；本轮完成 self-review 和真实浏览器回归，review.md 明确此限制。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：按步骤 5 完成。
- PR、用户产品验收、发布和回滚记录：未提交、未推送、未发布；用户最终视觉验收仍待用户确认。
- 暂不可验证项及准确状态：Figma MCP reauth、Tauri native narrow viewport、真实移动设备和完整 canvas fixture 均 NOT VERIFIED。

## 计划变更记录

- 2026-09-28：根据用户评论把原有 1200px 以下“隐藏画布控件”的响应式策略改为 960–1200px 分栏、<960px 覆盖；未改变业务能力或数据契约。
