# Intent：画布会话分栏与固定侧栏交互修复

- Task ID：TASK-UI-CANVAS-001
- 状态：IMPLEMENTED
- 日期与提出者：2026-09-28，当前用户
- 请求来源：浏览器评论；用户要求侧栏展开只作为开关、画布右侧减少空白、顶部按钮保持等高水平对齐，并让会话展开后继续显示和左移画布控件。
- 用户授权范围与依据：当前用户直接要求检查并修正应用 UI、操作交互和功能；范围限于现有 Web 画布、会话面板和侧栏布局。
- 关联账本、spec、plan：`docs/governance/task-ledger.json`；本目录的 `spec.md`、`plan.md`。

## 用户原意

在约 1067px 的画布页面中，左侧侧栏展开后应保持固定宽度，只切换展开/收起；打开对话后，会话占据右侧空间，画布顶部导航、任务按钮和底部工具仍应可见、可操作、对齐，并被会话向左挤压。

## AI 工程转译

把 960–1200px 视为平板分栏状态：会话面板固定为最多 400px 的右侧 rail，画布通过 right inset 让内容区域真实缩小；HUD、canvas navigation 和 bottom toolbar 在剩余画布区域内保持可见并遵守统一 44px 命中高度。低于 960px 继续使用现有紧凑覆盖式会话，画布保持 inert。侧栏移除可调宽度拖拽，只保留现有 toggle。

## 目标与非目标

- 预期结果：会话展开不再覆盖或隐藏平板画布控件，控件随可用画布区域左移且布局稳定。
- 包含范围：`App` 的画布覆盖判定、`Sidebar` 固定宽度、canvas HUD/navigation/toolbar 与 conversation rail 的响应式 CSS、对应浏览器回归。
- 明确不包含：真实 Provider、Tauri IPC、数据持久化、移动原生设备验收、Figma 文件写入或其他页面重做。
- 受影响平台/模块：Vite Web 的 workspace/canvas/conversation/sidebar；手机覆盖布局保留。
- 已有实现和规范来源：`docs/UI_INDEX.md`、`docs/UI_RULES.md`、`docs/DESIGN_TOKENS.md`、现有 `ConversationPanel`（Figma node `407:29265`）及本轮浏览器评论截图。

## 验收条件

| ID   | 用户可观察结果                                                 | 技术证据/检查                                                                      | 适用平台       |
| ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------- |
| AC-1 | 平板侧栏展开后宽度固定，只能用开关切换                         | `sidebar.spec.ts` 检查 304px、无 `.resize-handle`、44px toggle，并恢复 72px        | 960–1200px Web |
| AC-2 | 打开对话后会话留在右侧，画布标题导航和工具栏在左侧剩余区域可见 | `composer-fidelity.spec.ts` 检查 canvas/panel 边界、navigation/toolbar 右侧 gutter | 960–1200px Web |
| AC-3 | 顶部按钮等高并水平对齐，底部工具不再漂到会话下方               | 浏览器 computed geometry 与截图 `evidence/after-tablet-chat-final.png`             | 960–1200px Web |
| AC-4 | 更窄视口仍使用原有覆盖式会话，不把平板分栏规则误用于手机       | `responsive-layout.spec.ts` 短视口回归和 `App` 的 `covered` 判定                   | <960px Web     |

## 假设、风险和决策

- FACT（直接证据）：当前 1067px 页面打开会话时已有右侧面板；原 CSS 在 1200px 以下隐藏 HUD/toolbar/nav，导致用户评论中的控件消失。
- INFERENCE（假设及风险）：960px 作为分栏与覆盖的工程断点，依据现有平板测试和 400px 会话 rail；真实硬件与软键盘未验证。
- UNKNOWN / CONFLICT：Figma MCP 本轮需要重新认证，无法重新读取节点；实现依据现有 `407:29265` 组件、代码和浏览器状态，未声称新的 Figma 同态读取。
- AI 自主决定的技术事项及理由：使用 CSS right inset 而非 JS 重排，让 canvas 自身测量到扣除会话后的宽度，保持现有 viewport/world 坐标逻辑。
- 必须由用户决定的产品语义/范围事项（无则写无）：无；用户评论已明确交互方向。
- 外部条件、费用或不可逆动作及已有授权：无外部写入、发布或付费动作。
- 不在本次范围的问题与账本 ID：未接通真实服务和 Tauri IPC 的既有问题继续按现有账本记录。
