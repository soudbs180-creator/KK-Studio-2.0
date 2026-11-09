# 设置页层级与说明收敛设计

日期：2026-11-10
任务：TASK-SETTINGS-INFO-HIERARCHY-20261110

## 意图

让设置页恢复与 Figma 04 桌面稿一致的阅读顺序：左侧三层分类导航，右侧单一内容轴；模型接入、网络与 CLI 的内部结构按“标题行 → 控件组 → 次级操作”呈现。长说明从常驻正文移到标题后的可访问 info 提示，减少视觉噪声和误操作。

## 目标

- 保留现有 11 个设置入口、三层导航、业务字段、状态和路由兼容。
- 统一模型接入、网络、Gemini/Codex/CodeBuddy CLI 子页的标题、组间留白和卡片层级。
- 只将超出单行且属于解释性内容的长说明收进可键盘聚焦、悬浮/聚焦可见的 info 提示；短说明继续直接显示。
- 复用现有 `UiIcon`、CSS token 和已有卡片/控件，不新增依赖。
- 在桌面与窄屏设置浏览器用例中验证无横向溢出、标题可见、提示可访问、现有交互不回归。

## 非目标

- 不更改 provider、OAuth、CLI、Gemini 登录、模型探测或网络连接行为。
- 不删除字段、导航项、错误原因、禁用原因或真实状态文本。
- 不在本轮重建 Figma 组件库、改变 token 真值或修改非设置页。

## 约束与事实

- Figma 文件 `ZiadpErDoFweCjG3uHjkM3`，当前设置面板 `47:185`、通用页 `47:184`；Figma 内容区左右 padding 为 24/40，组间约 24、组内约 12，正文内部滚动。
- 模型接入/CLI 当前稿使用单一内容轴、16px 外层间距和 44px 说明卡；长操作说明采用说明卡或折叠，不重复包裹额外大卡片。
- 现有代码入口为 `SettingsPanel` → `SettingsSidebar` / `SettingsSections`；`SettingsSectionData.description` 是长说明的主要来源。
- 主 checkout 有大量既有未提交改动，本任务只在独立 worktree 完成。
- 现有 `UiIcon` 已提供 `circle-help`，项目没有统一 Tooltip，提示组件应限制在 settings 范围并满足键盘/ARIA。

## 方案

1. 最小收敛：只把顶层长说明改为 info 提示并统一间距。改动最小，但模型接入/网络/CLI 内部仍可能有重复层级。
2. **统一重排（选定）**：在方案 1 基础上，统一模型接入、网络、CLI 子页的标题行、说明归位、控件组卡片和间距；不动数据/业务契约。这样解决用户指出的层级复杂和拥挤，回归范围仍集中在设置模块。
3. 先只修 Figma：先改母版再同步代码。设计闭环较完整，但无法及时改善当前本地页面，且会增加 Figma 写入风险。

## 实现边界

- 新增一个 settings 内部的 `SettingsInfoHint`（或等价最小组件），接收纯文本说明，输出按钮式 `circle-help` 图标、`aria-describedby` 和 `role=tooltip` 内容；hover/focus 打开，Escape/失焦关闭，移动端可点击切换。
- `SettingsSections`：顶层说明按长度阈值与语义分类，短说明继续可见，长说明放到标题行；network 继续保留现有“使用说明”折叠入口，但标题行与内容区间距统一。
- `ModelAccessSettings`、`ConnectionSettings` 及 CLI 相关组件：保留行为和现有选择器/标签，重排为一致的 section heading 与 card group；把重复的大段说明迁移到 heading info，保留安全/错误/状态信息在正文。
- `settings.css`：只用现有 `--kk-*` token；统一外层组间约 `--kk-space-5`、组内约 `--kk-space-3`，避免额外硬编码；提示层不遮挡焦点和操作。
- 测试：补充/更新设置单测和浏览器断言，验证长说明不再常驻、info 提示可访问且原有字段/导航/连接状态仍可见。

## 验收

- `npm run typecheck`、`npm run lint`、相关 settings 单测和浏览器用例通过。
- 1200/1099/390 宽度设置页无横向溢出，内容区可滚动，标题和主要控件不重叠。
- 长说明在鼠标悬浮与键盘聚焦时可见；短说明仍可直接阅读；关闭设置、切换分类、CLI/模型表单交互不变。
- 记录 Figma 节点、代码路径、截图/DOM 证据和未覆盖的真实 Provider/Desktop 边界。
