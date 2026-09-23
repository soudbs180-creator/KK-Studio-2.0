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
