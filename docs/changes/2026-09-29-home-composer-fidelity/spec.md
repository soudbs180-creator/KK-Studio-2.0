# Spec：首页/对话输入区与剩余页面反馈收口

- Task ID：TASK-UI-HOME-002
- 状态：IMPLEMENTED，验证 PARTIAL
- 日期：2026-09-29
- Intent / 账本：`intent.md` / `docs/governance/task-ledger.json`
- 当前规范与实现基线：已授权 Figma 节点优先于旧 DS1.3 宽屏组合；首页快捷提示词入口已移至文件/应用功能菜单，首页和对话输入按节点固定几何。
- Source of truth：Figma `https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=483-753&m=dev`（首页输入）、`node-id=407-29265`（对话输入）、`node-id=399-27506`（设置）与 `node-id=410-67357`（工作区）；工程补充规则见 `docs/DESIGN-SYSTEM.md`。

## 用户行为与入口

- 首页入口：`/` → `StartPage` → `StartComposer`。
- 首页全部视口：工具栏保留附件、模型、Skill、语音、自动/询问、发送；桌面输入区 652×170，手机输入区 299×170；首页不显示伙伴、插件与批量/隐私选择行；提示词库从应用菜单进入。
- 对话入口：主导航“对话”/项目库打开 `ConversationPanel`，保留 Figma 对话节点中的模型、Skill、插件及右侧动作。
- Prompt Library：桌面 TopBar 的“文件”菜单和窄屏应用功能菜单仍可打开 `PromptLibraryPanel`；快捷按钮移除。
- loading、success、error、cancel、offline、timeout：本次不改异步协议；已有菜单/弹窗继续使用原有关闭、焦点恢复和错误提示。
- 键盘/焦点/Escape/IME、长文案、响应式：保持现有 `useComposerMenus`、`useDismissible` 和 ComposerTextarea；验证 390/834/1099/1920，并单独核对对话、设置和画布入口。

## 架构、数据与权限

- 页面职责：`StartPage` 只负责首页结构，`StartComposer` 负责输入与菜单，`ConversationComposer`/`ConversationActions` 负责对话输入。
- 数据契约：不改 `CreationDraft`、批量/隐私字段、Provider 或 Prompt Library 存储；触屏只隐藏首页选项视觉入口。
- 凭据与日志：不新增外部传输或凭据读取。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| 首页 composer | Figma 652×170，固定动作顺序 | Figma 紧凑单行动作 | Figma 299×170，动作顺序相同 | 隐藏未出现在设计节点的首页扩展动作 |
| 对话 composer | Figma 426×170，保留模型/Skill/插件/动作 | 同上 | 手机保持可滚动/overlay | 不改既有对话可达性 |
| 设置导航 | 桌面左侧连续分类 | 同上 | 底部横向滑块 | 移动端不再使用左侧高列表 |
| 工作区导航 | 默认 70px 收起侧栏，展开 291px 并推动工作区，工具条 244×50 | 平板沿用 70px/291px 两个 shell 状态 | 手机顶栏和底栏按断点收缩 | 手机抽屉仍按窄屏降级规则处理 |
| 提示词库 | 文件菜单入口 | 文件/应用功能菜单入口 | 应用功能菜单入口 | 删除重复快捷按钮 |

## 生命周期与恢复

- 仅修改源码与浏览器测试/变更记录；不迁移用户数据，不改 localStorage/IndexedDB schema。
- 失败恢复：Vite HMR/刷新后按 `data-runtime-mode=development` 与 1421 端口核对；必要时重新构建 preview。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 首页快捷按钮不存在，菜单入口有效 | Vite dev 1421、Playwright | DOM 与菜单对话证据 |
| AC-2 | 首页 390/834/1920 输入控件和 Figma 顺序可达 | Playwright + DOM bounds | screenshot + bounding boxes |
| AC-3 | 对话输入功能未被首页变更影响，且尺寸与节点一致 | Playwright 对话 smoke | DOM/interaction |
| AC-4 | 设置底部滑块和移动顶栏可用 | Playwright 390 | DOM bounds + screenshot |
| AC-5 | 侧栏开关、画布工具条和对话入口稳定 | workspace smoke | geometry + interaction |

## 风险和决策

- 可自主解决的技术决定及依据：用节点几何覆盖旧 CSS，删除 Home-only shortcut 的 JSX；保留 draft 字段和菜单入口以避免破坏提交链路。
- 待用户决定的产品语义：首页隐藏的批量/隐私是否需要新的入口；本任务不自行添加。
- 规范冲突、外部依赖与阻断范围：Figma 完整 Landing 页面节点不可用；当前 settings 节点与旧浏览器截图在强调色/系统控件上有差异。
- 侧栏状态：开关图标按用户指定的左小右大几何实现，展开态填充左侧小框；对应资源为 `public/design/figma/sidebar-expand.svg` 与 `sidebar-collapse.svg`。
- 明确未承诺的能力：不宣称完整 Landing 逐像素还原，不宣称真实 Tauri 系统托盘能力。
