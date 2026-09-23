# Verification: Google 对话与生图

- Task ID: TASK-AGENT-004
- 状态: PARTIAL（本地/fixture 全量通过；真实 Google 请求待用户填入 API Key 后验收）
- Base: b45c5bc7a180c641dbcc3d127d1106f05174df12
- 分支: feat/TASK-AGENT-004-google；Worktree: C:/Users/Administrator/.codex/worktrees/google-interactions/KK-Studio-2.0
- 本地/fixture 与真实 Google 验收分别记录；目前未进行真实 Google 请求。

## 已通过的本地/fixture 验证（2026-09-23）

| 检查                                                                                                                     | 结果                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 单元测试 `node --test tests/unit/googleInteractions.test.ts tests/unit/googleAgent.test.ts tests/unit/agentHost.test.ts` | 14/14 通过（协议字段、header 凭据、模型归一化、函数回执、错误/取消/去重、会话续接与归档一次、unknown 持久化、跨项目取消）                  |
| TypeScript `tsc --noEmit`                                                                                                | 通过                                                                                                                                       |
| ESLint `npm run lint`（0 warnings）                                                                                      | 通过                                                                                                                                       |
| 治理 `node scripts/check-governance.mjs`                                                                                 | 60 tasks, 0 violations                                                                                                                     |
| 特性 `node scripts/check-features.mjs`                                                                                   | 29 features, 0 violations                                                                                                                  |
| UI 标准 `node scripts/check-ui-standards.mjs`                                                                            | 162 文件, 0 violations                                                                                                                     |
| 生产构建 `npm run build`                                                                                                 | 通过                                                                                                                                       |
| 浏览器测试 `tests/browser/google-agent.spec.ts`                                                                          | 通过（设置 Key → 测试连接 → 连续对话续接 previous_interaction_id → 图片归档画布 → response_format 校验 → 刷新恢复历史 → 未连接不提交请求） |
| 浏览器回归 `tests/browser/agent.spec.ts`                                                                                 | 7/7 通过（共享 ConversationPanel 无回归）                                                                                                  |

## 修复记录（本次收尾）

1. `tests/browser/google-agent.spec.ts` 发送按钮定位由 `name: "发送"` 修正为项目统一的 `name: "发送消息"`。
2. reload 恢复断言补上「项目库 → 打开项目」步骤（面板挂载即从项目存储恢复会话），与既有 Codex 测试模式一致；未连接时发送不产生请求的安全断言保留。
3. `ConversationPanel.tsx` 311 行超出 300 行组件边界：将 `submitMessage` 抽取为 `useConversationSubmit` 钩子，恢复 0 违规。

## 未验证项（真实 Google）

- 真实 API Key 连接与对话、真实图片生成与归档、真实连续对话续接、配额/错误状态展示。
- 桌面（Tauri）边界：本验证基于 Web（Playwright）与本地 fixture；桌面运行时行为需在应用内用真实 Key 复核。

## 2026-09-23 组合候选补充验证（004/005 合并收尾分支）

- 当前候选 `feat/TASK-AGENT-004-google-closeout` 的 `npm run verify` 退出 0：治理 61/0、功能 29/0、单元测试 404/404、浏览器 302/302，lint、类型、UI 标准、格式和生产构建通过。该次校验在主线新增 Markdown 门禁合入之前执行；同步主线后会另行重验。
- **同步主线后重验（2026-09-24）**：与 main（含规则审计 Markdown 门禁）合并冲突解决后 `npm ci` 全新安装，`npm run verify` 再次退出 0：治理 63/0（合并后任务账本）、Markdown 门禁、单元测试与浏览器 302/302 全通过，lint/类型/UI/格式/生产构建通过；`npm run client:check`（Cargo check）退出 0。合并后相对 origin/main 仅含本任务（004/005）新增内容，规则审计与 Markdown 门禁内容完整保留。
- Web 运行方式为 `npm run test:ui` 所启动的 `vite preview --host 127.0.0.1 --port 1423 --strictPort`；浏览器地址 `http://127.0.0.1:1423/`，页面 route `/`，加载重新构建的 production `dist`。设置链路：`src/App.tsx` → `SettingsSections.tsx` → `ConnectionSettings.tsx` → `GoogleConnectionSettings.tsx`；对话链路：`src/App.tsx` → `ConversationPanel.tsx` → `GoogleConversationPanel.tsx` → `GoogleAgentControls.tsx`。浏览器测试分别验证 390px 与 1920px 设置控件可达、Google Key 输入/保存、CLI→Key 切换、两轮对话、图片卡归档和刷新恢复。界面截图见 [fixture 截图](evidence/google-image-fixture.png)；其中图片为 1×1 测试字节，不能证明真实出图。
- Windows `npm run client:check`（Cargo check）退出 0，说明原生代码编译检查通过；没有启动本轮 Tauri WebView 或发布构建，故 Desktop 运行态仍记 NOT RUN。
- 没有使用真实 Google API Key 发起 Interactions 请求；模型额度、实际图片、跨轮 `previous_interaction_id`、实际桌面凭据库仍需真实账号验收。独立审查最初发现 Key 输入与登录模式切换阻断问题且已修复；本轮最终补审因 reviewer 工作区额度耗尽未完成，不声称独立终审通过。
