# Plan：Kaworkai 无限画布交互研究与 KK 本地画布增强

- Task ID：TASK-CANVAS-KAWORKAI-001
- 状态：PARTIAL（实现完成；既有空项目画布 fixture 的全量回归未通过）
- 日期：2026-09-29
- Intent / Spec / ADR：本目录 `intent.md`、`spec.md`；无需 ADR
- Owner / branch / worktree：root agent；当前 `main` dirty checkout（保留并发 UI 改动，不重置）
- Base / HEAD SHA 与远端目标：`a89792a`；不在本轮推送或合并远端
- Git dirty/index 状态、并行任务与文件归属：已有 UI 治理和画布布局改动；本轮只新增/修改画布相关文件与本目录文档，避免覆盖既有差异。

## 开工证据

- 已读取的规则、账本、规范和实现：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/{PROMPTING,SDLC,BRANCH-POLICY,REVIEW}.md`、`docs/governance/PROJECT_STATE.md`、`docs/UI_INDEX.md`、`docs/UI_RULES.md`、`docs/DESIGN_TOKENS.md`、`docs/DESIGN-SYSTEM.md`、Canvas 相关组件/领域模型/浏览器测试。
- 依赖/工具版本与安装：沿用仓库 Node 24、React 18、TypeScript strict、Vite、Playwright；不新增依赖。
- 基线 lint/typecheck/相关测试：实现前执行定向画布单测与 typecheck，结果记录到 `verification.md`。
- PRE-EXISTING FAILURE 与关联任务：根 checkout 已有大量未提交 UI 治理改动；其归属不在本轮，验证时区分既有失败。
- 计划中 AI 自主事项：按用户授权完成研究记录、最小本地实现、定向验证与文档登记。
- 必需外部条件与已存在的用户授权：参考站点只读访问；用户已要求节省 50 积分，本轮不触发生成。

## 实施顺序

| 步骤 | 文件/模块                                                                              | 改动和目的                                                                    | 依赖     | 验证                                |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------- | ----------------------------------- |
| 1    | `src/domain/canvasHistory.ts`、`tests/unit/canvasHistory.test.ts`                      | 先写并验证快照栈纯函数，覆盖去重、上限、undo/redo 分支。                      | 无       | Node 单测（先失败后通过）           |
| 2    | `src/components/canvas/useCanvasHistory.ts`                                            | 将 items/positions/edges/viewport 组合成会话历史，并把恢复应用回现有 setter。 | 步骤 1   | typecheck、Canvas 浏览器回归        |
| 3    | `src/components/canvas/useCanvasPreferences.ts`、`useCanvasPointer.ts`、`Canvas.tsx`   | 持久化网格吸附/连线/背景偏好；节点拖动按 16px 对齐，Ctrl/Cmd 临时绕过。       | 无       | 偏好单测、pointer 回归              |
| 4    | `CanvasContextMenu.tsx`、`CanvasOverlays.tsx`                                          | 右键动态撤销/重做，并在同一菜单提供图层管理和吸附入口，保持既有工具条几何。   | 步骤 2/3 | context-menu/UI 回归                |
| 5    | `CanvasLayersPanel.tsx`、`canvas-layers.css`                                           | 新增搜索、类型标签、选中和定位的平铺图层面板。                                | 步骤 2   | layers 浏览器回归、DOM/截图         |
| 6    | `docs/features/feat-001-canvas-workbench.md`、registry、ledger、PROGRESS、verification | 同步能力状态、研究结论和证据；保持未接远程能力为原状态。                      | 步骤 1–5 | governance/features/markdown checks |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：无；当前 checkout 已有并发 UI 工作，不启动第二代理、不改其归属文件。
- 同文件写入的串行顺序：先领域/测试，再 hooks，最后 UI 组合；`CanvasToolbar.tsx` 已有并发差异，使用小范围补丁。
- 整合负责人、目标 branch/base 和同步策略：root agent，保持当前 dirty worktree，不做 reset/clean。
- 冲突后重新验证的范围：Canvas 及新增测试、typecheck、build；若现有治理门禁触及不相关 dirty 文件，按实际输出记录。

## 风险与恢复

- 最危险的失败场景与预防：历史恢复覆盖异步项目状态；用快照指纹与应用目标保护，撤销/重做不再次入栈。
- 数据备份/原件保护/回滚或补偿：不迁移现有项目快照；删除新增代码即可回滚，localStorage 偏好未知版本安全回退。
- 触发恢复的条件及 runbook：若历史或面板造成节点丢失，关闭页面/重开项目由既有快照恢复；检查 `projectCanvasFingerprint` 与项目快照回调。
- 高风险外部动作的授权、权限和费用边界：不调用外部生成、上传、分享、购买或积分操作。
- 不选择的方案及理由：不复制站点大体量 AI workflow 和样式；本地已有 provider/agent seam，且用户要求保留本地 UI 和节省积分。

## 验证和交付

- 定向回归，bug 修复的预期失败及修复后结果：记录 history 单测 Red/Green 与画布新增回归。
- 完整验证与必要 Rust/native/live 检查：至少 `npm run typecheck`、`npm run build`、相关 Node/Playwright；Rust/live provider 不受本轮代码影响，必要性按门禁判断。
- UI 的 DOM/截图、1421/1423/Tauri 证据：使用固定 Vite 1421 的浏览器运行链路；记录 route、import、DOM 与截图路径。
- 独立 reviewer 与当前 SHA 审查：本轮无远端 PR；完成本地 self-review，未把其称为独立审批。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：步骤 6 完成。
- PR、用户产品验收、发布和回滚记录：不创建 PR、不发布；用户最终验收留待会话结束。
- 暂不可验证项及准确状态：Desktop 原生窗口与外部服务不在本轮；功能卡保持 REAL 仅在已有能力范围内，新增分组/AI 工具不宣称完成。

## 计划变更记录

- 2026-09-29：根据现有工具条 244×50 与导航外框 280.984×31.109 的浏览器门禁，将新增入口收口为右键菜单与独立图层浮层；不改变产品意图或授权范围。
- 2026-09-29：静态核对参考页的 dock 默认值、历史字节上限、图层搜索和端口校验后，定向 history/layers 浏览器用例通过；既有空项目 fixture 的节点型回归仍按 pre-existing 限制记录。
