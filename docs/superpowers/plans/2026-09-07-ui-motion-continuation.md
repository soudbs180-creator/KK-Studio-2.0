# UI、动效与持续推进实施计划

> **For agentic workers:** 使用 superpowers:executing-plans 在本任务内逐项执行。保持串行写入，不另起重复任务。每个复选项对应可核查动作，功能状态只写 docs/PROGRESS.md。

**Goal:** 按用户最新 Figma 完成前端 UI、交互和动效校对，并让中断后的下一轮能从真实证据继续。

**Architecture:** 沿用 D:\\kk-studio-next 中现有 React 组件、画布状态及 CSS 令牌。先固定画板与状态对应关系，再逐个界面修正；定期续跑读取磁盘账本，不依赖上一次回答是否完整输出。

**Tech Stack:** React 18、TypeScript strict、Vite 7、CSS、npm、Node 24.20.0、Playwright + Edge。

**Spec:** ../../FRONTEND-SPEC.md、../../UI-ALIGNMENT.md、../../reference/replan-2026-09-07/INDEX.md。

## 全局约束

- 新工程 D:\\kk-studio-next；D:\\kk-studio 只读，保留旧实现和用户数据。
- 用户 Figma 文件 0nU0A7pq6eyjwfwm1TtWkO 是 UI 权威；先 UI、前端交互、可编辑补充稿，再后端。
- 不恢复旧 Plate 同步或重新创建被清理的卡。
- 每个可见控件有真实行为或清楚的禁用原因，不伪造生成、保存或连通成功。
- 密钥不进入浏览器持久化、日志和截图；数据边界保留类型与 Zod 校验。
- 当前工作树含上一任务未提交的实现。先看 diff 再增量修正，不 reset、不覆盖、不将遗留内容冒认成本轮新增。
- 1920×1080、1440×900、768×1024、390×844 均需浏览器验收；构建通过不能证明 Figma 一致。
- 动效数据必须区分关键帧、原型交互和工程补充；空 motion 响应不能被说成已还原原稿动画。
- 本计划 extend 原前端纠偏范围，替代 2026-09-06-frontend.md 的执行顺序；旧计划保留供追溯。

## 每轮恢复入口

在 PowerShell 中使用：

```powershell
Set-Location -LiteralPath 'D:\\kk-studio-next'
$env:PATH = 'D:\\tools\\node-v24.20.0-win-x64;' + $env:PATH
Get-Content -LiteralPath 'AGENTS.md'
Get-Content -LiteralPath 'docs\\PROGRESS.md'
Get-Content -LiteralPath 'docs\\UI-ALIGNMENT.md'
git status --short
git log -3 --oneline
```

先确认本轮目标文件没有其它活跃任务写入。每轮选择下面一个可交付单元，不重复搭壳、不重新跑完已完成的调研。每完成一项就写入 PROGRESS：改了什么、来源节点、检查命令和结果、剩余问题、下一个文件/动作。

## Task 1：恢复可信基线和设计索引

**Files:** docs/PROGRESS.md、docs/UI-ALIGNMENT.md、docs/reference/replan-2026-09-07/、docs/evidence/replan-2026-09-07/、tests/browser/frontend.spec.ts。

**Interfaces:** 输入为 Figma 真实工具结果与当前工作树；输出为每个页面的 nodeId、来源截图、设计上下文、动效结果及明确的差异清单。

- [x] 读取上一任务错误，区分额度不足、网络压缩失败和 Figma 认证问题。
- [x] 保存继承的部分浏览器报告，修正三个文件的格式，再运行完整验证。
- [x] 用真实 DOM 命中结果定位旧拖动测试落到 sidebar 的问题；保留位移、连线和输入防误拖断言，从可见图片预览开始拖动。
- [x] 在用户确认连接后重新调用 Figma，确认 253:563 为圆点，父级视频模块为 170:8490，父画板为 170:1029。
- [x] 缓存视频模块、喜欢收藏页、画布导航的设计上下文、PNG 和递归 motion 返回。
- [ ] 后续视觉修改前，按索引读取其它页面的具体子节点。整页 1:2 只返回稀疏元数据时，继续读取子节点，不再次向上下文灌入整页网格。

## Task 2：画布导航与主工作台

**Files:** src/components/canvas/CanvasNavigation.tsx、src/components/canvas/useCanvasControls.ts、src/components/canvas/canvasModel.ts、src/components/Canvas.tsx、src/styles/interaction.css、src/styles/workspace.css、tests/browser/ui-motion.spec.ts、tests/browser/frontend.spec.ts、public/design/figma/。

**Interfaces:** 复用 ViewTransform、Point、现有 onArrange/onLocate；新增缩放/连线显示行为须显式声明 props，不通过 DOM 样式偷改状态。当前 resetCanvas 会重置基础节点，不能拿它充当原稿比例菜单。

- [ ] 以 100:16335 上下文核对 63×26 比例按钮、164×26 功能组和 97×140 下拉菜单；确认原稿中的缩小、放大、适应视图、50/100/200/300/400% 均对应可用行为。当前 MAX_SCALE=2 与 400% 冲突，必须同一修改中调整边界并验证。
- [ ] 接入连线显示控制并保持默认可见；背景入口先读取其相邻原型/状态节点再实现，不根据图标自行发明菜单。
- [ ] 保留整理与小地图已有行为；替换不匹配的图标时下载原始导出资源，不手绘 SVG。
- [ ] 验证缩放保留目标锚点、比例菜单不移动节点、输入中不触发快捷键、菜单 Escape 先关闭并回焦、移动端不溢出。
- [x] 在同状态的 Figma 和 Edge 截图中核对导航位置与聊天面板间距（2026-09-07 Doubao 实测：几何零偏差，证据见 navigation-fix-2026-09-07/same-state-compare.json）。不要照搬图层名字“左下角”，该节点在主稿的实际位置位于右上。

执行针对性验证：

```powershell
npm run typecheck
npm run build
& '.\\node_modules\\.bin\\playwright.cmd' test tests/browser/ui-motion.spec.ts tests/browser/frontend.spec.ts --reporter=list
```

## Task 3：图片、视频编辑器及参数状态

**Files:** src/components/nodes/CreationComposer.tsx、CreationParameters.tsx、ImageCreationNode.tsx、VideoNode.tsx、src/styles/workspace.css、src/styles/interaction.css、tests/browser/composer-fidelity.spec.ts、tests/browser/interaction-regressions.spec.ts、tests/browser/ui-motion.spec.ts。

**Interfaces:** 复用 NodeEditingProps 和现有草稿/选择状态；保留 onExtraHeightChange 对可见区域的反馈。视频原稿 170:8490：370×208 预览，590×237 编辑器；提示词、参考图、模型、参数和数量独立可操作。

- [ ] 对照 170:8490 PNG/上下文逐项核对边框、30px 圆角、提示词 10px 字体、图标、参数间隔及最新计时图标 261:514。
- [ ] 区分原稿示例内容与真实用户草稿；不灌入假的生成结果，也不删除已有上传内容。
- [ ] 读取图片与视频各自参数弹层的节点后修正控件；生成数量原稿含 1/2/4/6/8，现有 select 缺 6，按对应原稿控件补齐。
- [ ] 用现有浏览器测试覆盖选中/拖动/取消、草稿保留、参考图上传、菜单关闭顺序，以及窄屏完整编辑器可触达。

## Task 4：搜索、喜欢收藏、设置及资产页面

**Files:** src/components/CatalogPanel.tsx、SavedPane.tsx、src/styles/catalog.css、src/components/settings/、src/components/assets/、tests/browser/frontend.spec.ts、tests/browser/ui-motion.spec.ts。

**Interfaces:** 继续共用 CanvasCollectionItem 和现有 onLocate/onRename/onToggleLike/onToggleFavorite；不要另建第二份收藏状态。

- [ ] 以 156:28536 对照 900×725 外壳、80px 圆角、812×58 搜索框、六类标签、喜欢/收藏双栏及空态；真实内容多少不必伪造为原稿样例数量。
- [ ] 对照 152:28350 检查搜索结果态，逐一核对 Enter、Esc、方向键、重命名、移除和定位；不同操作不能同时触发。
- [ ] 设置读取 69:8087；资产读取 100:16574、112:17178、130:17803；只修正对应 UI 和交互，不扩展供应商服务或后端。
- [ ] 四视口检查长中文、无结果、错误恢复、滚动、关闭回焦；截图必须注明内容状态和来源节点。

## Task 5：动效证据与可编辑补充稿

**Files:** src/styles/motion.css、src/components/useDismissible.ts、相关面板组件、tests/browser/ui-motion.spec.ts、figma/code.js、figma/README.md、docs/reference/replan-2026-09-07/。

**Interfaces:** 样式只消费已有展开/选中状态；拖拽变换继续由画布控制器持有。Figma 写入保留原画板，只在独立补充区域创建可编辑图层。

- [ ] 针对有交互组件读取 reactions/variant 转换和相关 motion context；关键帧工具返回空不能排除原型状态转换。
- [ ] 现有 140ms/220ms 过渡明确登记为工程补充；若原稿有时间/曲线则按真实值替换。没有原稿动画的节点不额外编造“还原”动画。
- [ ] 检查完整打开/关闭、快速反向操作、拖动中断和 prefers-reduced-motion；录制实际运行，静态截图不算动效验收。
- [ ] 在已有 figma 插件包基础上交付资产无结果、创建主体、供应商空态三个可编辑补充画板；先读现有页面防止重复创建，写入后回读节点与截图。保留原设计和既有远端内容。

## Task 6：交付门禁和中断恢复

**Files:** docs/PROGRESS.md、docs/evidence/、README.md；当前任务的 heartbeat 自动化。

- [ ] 每轮实施后运行受影响的检查；准备完整交付时运行 npm run verify，记录真实退出码，不重复无变化的全量检查。
- [ ] 自审完整性、正确性、健壮性、结构、性能、安全、验证证据、更好方案；明确是否只完成实现或已经比对设计。
- [ ] 提供按页面/状态成对的原稿与实现截图、动效录像和剩余差异，方便用户直接审核。
- [ ] UI 未获得完整验收继续保持 Repairing / Prototype；后台仍为 Not Started。
- [ ] 每轮结束、可能压缩上下文前和外部失败后立刻写下一步到 PROGRESS。提交时只选择已审查文件，不使用 git add . 吞入上一任务改动。

## 续跑行为

每小时在当前任务中读取账本，推进一个最小交付单元。没有变化或可执行内容时保持安静；仅在里程碑、失败、重要变化或确需用户操作时通知。外部连接失败先记录原文和时间，不推断用户没有连接；同一条件不高频重试，用户说已恢复后立即重新验证。若所有剩余工作均需用户/外部条件，说明具体阻塞并暂停自动化；全部交付完成后也暂停，避免空转。

本地自动化要求电脑开机、项目可用、应用运行；它不能在退出应用或关机后继续执行。依据：[OpenAI 官方 Scheduled tasks](https://learn.chatgpt.com/docs/automations?surface=app)。

