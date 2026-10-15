# KK Studio UI 运行与验证规范

> 本文件只管 **"改动之后怎么确认它真的生效"** ——运行来源、设计读取、浏览器验证、完成标准。
> 样式与交互**规则**在 [`UI_RULES.md`](./UI_RULES.md)，**数值**在 [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md)。
> 入口见 [`UI_INDEX.md`](./UI_INDEX.md)。
> 2026-09-10 / 09-11 的日期流水账原文见 [`archive/ui-history/UI-SPEC-2026-09-10-11.md`](./archive/ui-history/UI-SPEC-2026-09-10-11.md)。

---

## 1. 现行基准锚点

| 主题 | 现行出处 |
|---|---|
| 颜色 / 字阶 / 基础组件 | [DESIGN-SYSTEM](./DESIGN-SYSTEM.md) |
| 输入、胶囊按钮与方形上传 | [UI_RULES](./UI_RULES.md)、[DESIGN-SYSTEM](./DESIGN-SYSTEM.md) |
| 响应式与屏幕面板 | [DESIGN_TOKENS](./DESIGN_TOKENS.md)、[UI_RULES](./UI_RULES.md) |
| 零件 / 交互 / 对齐规则 | [`UI_RULES.md`](./UI_RULES.md) |
| 页面类型 | [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md) |

**冲突处理**：按 [UI_INDEX](UI_INDEX.md#2-冲突裁决) 的当前用户反馈与来源顺序裁决，在验证记录说明旧断言为何更新；截图内文字不是行为授权。
历史日期章节中的坐标测量**只作来源追溯**，不覆盖现行规则。

---

## 2. 实现链路与完成标准

固定链路：

```
用户 Design System + 页面来源 → 语义 Tokens → 共享组件 → 实际源码 → 浏览器验证
```

"代码已修改""测试已通过""Figma 已读取"**都不是视觉完成的证据**。完成记录必须能回答：

- 浏览器访问的 URL 和端口；
- 它是 development / preview / Tauri 哪种运行模式；
- 当前 route；
- route 实际 import 的组件文件；
- 源码是否进入当前运行产物；
- 同状态浏览器的 DOM 矩形和截图是否变化。

**行为层面**（交互补充，现行）：
项目 / 生成 / 保存状态纳入 `CanvasHud` 流式布局，与任务入口和导航共同占用可用宽度，**不能在同一角落分别 absolute 定位**。画布背景按 [canvasViewport](../src/domain/canvasViewport.ts) 的现行缩放契约验证，历史几何测量不覆盖当前要求。折叠保留业务与草稿状态、清除不可见弹层；同一触发器再次点击关闭。Escape 只关闭最上层并回焦；菜单转弹窗使用稳定入口；Modal 从内部拖到背景不得误关闭。

---

## 3. 运行来源核对

1. 从 `package.json`、`vite.config.ts`、`src-tauri/tauri.conf.json` 和启动脚本确认启动命令与端口。
2. 通过浏览器地址、页面 `<script>`、`data-runtime-entry` 和 `data-runtime-mode` 记录实际加载来源。
   Vite development 应显示 `/src/main.tsx` 与 `/@vite/client`；production preview 应显示 `/assets/index-*.js`；
   Tauri 使用 `frontendDist: ../dist`，源码变更后必须重新 build。
3. 确认当前运行端口是预期端口：Vite 开发态默认 `127.0.0.1:1421`（`strictPort: true`）。
4. 从 `src/main.tsx` 沿 import 和 `App.tsx` 的 route 分支追到实际页面组件，检查旧版页面、重复组件、未引用 diff。
5. 1421（Vite dev）/ 1423（Playwright preview）等端口必须在证据中明确区分；**旧端口或旧窗口不能被当作当前源码验证**。

---

## 4. 设计读取与对照

每次视觉修改读取用户本次指定的设计来源。页面几何 / 图层 / 变量仍需对应的在线节点上下文；
**PDF 无法证明的属性明确标"未知"**。记录 frame 尺寸、层级、Auto Layout、padding、gap、尺寸、字体、行高、颜色、边框、圆角与状态。

对照顺序是 **Figma（或 Ardot）→ 当前源代码 → 当前浏览器实际效果**，三者必须使用同一状态和视口。

---

## 5. 复用与 tokens 唯一入口

样式与组件的两个全局样式表由 `src/main.tsx` 导入，**不能依赖进入某一 route 才提供共享令牌**。
相同语义使用同一层级；Figma 指定的特殊几何在部件样式内保留来源注释，不能为了统一而抹掉原稿分工。
已有相同功能组件必须复用，**不得为一个未接入 route 的旧页面复制第二套实现**。

| 范围 | 唯一入口与复用方式 | 验证要求 |
|---|---|---|
| 颜色、边框 | `global.css` 语义背景/文字/边框；`ui-tokens.css` 状态色、边框宽度 | 深浅均按设计系统；可访问性修正逐项记录 |
| 间距、字体、行高 | `ui-tokens.css` 的 gap / font / line-height 层级；特殊 Frame 数值保留来源 | 检查 computed style 和实际文字矩形，不仅检查 token 声明 |
| 圆角、控件高度、图标 | `ui-tokens.css` 尺寸层级、`UiIcon.tsx`、Figma 导出资产；工具栏复用 `ToolbarIcon.tsx` | 区分可见图形、图标槽位和命中区域 |
| Panel、Sidebar、Toolbar | `ConversationPanel.tsx` / `Sidebar.tsx` / `CanvasToolbar.tsx`；布局复用 `useSidebarLayout`、`useCanvasViewport` | 展开/收起、窄屏及有无聊天面板用同状态矩形验证 |
| Modal、Dropdown | `Modal.tsx` 与 `useDismissible.ts`；添加节点复用 `AddNodeMenu.tsx` | Escape、外部点击、键盘移动、关闭回焦和 disabled 原因 |
| Button、Input | 共享 `.ui-button` 与原生 button/input/textarea；设置复用 `SettingsControls.tsx` | 普通按钮默认 32px，紧凑/标准/Figma 专项尺寸分别消费对应层级，不全局强制相同高度 |
| Tabs、Selected | 现有 tablist/tab 及 `aria-selected`；可切换分类使用真实状态与 `aria-pressed` | 点击后的可见 selected 必须与状态一致 |
| Tooltip | 复用原生 `title`，图标同时提供可访问名称 | 原生提示外观由浏览器控制，不能报告为自定义 tooltip 已还原 |

异步控件按实际能力覆盖 loading / success / error / cancel / 离线；未支持的模式必须禁用并解释，
未接后端的行为明确标注 Prototype。

---

## 6. 浏览器验证

源码修改后重新启动实际项目，必要时清理 `node_modules/.vite`、`dist` 并重建，
**但不得删除用户数据或工作区修改**。至少验证桌面和窄屏的布局、sidebar、toolbar、panel、间距、对齐、字体、图标、控件高度与状态交互，并保存同状态 DOM / 截图。

`npm run typecheck`、`npm run build` 和适用的 UI / screenshot tests 通过后，**仍须报告任何尚未与设计源对齐的部分**。

**报告规则**
- 分开列：类型检查 / 构建 / 测试 vs 视觉验收。
- 如果渲染结果没有变化，先查 import、缓存和进程，再继续调 CSS。
- 保留未提交的工作和用户数据。
- 不得把"构建通过"或"截图存在"当作整站视觉完成的结论。

新运行日志、截图、报告和产物放到容器 output/<task>/，在交付包记录相对入口、源 SHA、运行模式与 hash。已审历史 docs/evidence 原件保持；仅经审阅的最小摘要或稳定回归夹具进入仓库，不提交整套重复输出。

---

## 7. 变更记录

| 版本 | 内容 |
|---|---|
| v2.0 | 按 `UI_INDEX.md` 收敛：删除 2026-09-10 / 09-11 日期流水账（原文归档），改为引用现行基准锚点；保留运行核对、设计读取、复用入口与浏览器验证 |

## 本轮 UI 契约复证

检查 390/1099/1920 宽度、深浅主题、默认与显式强调色、常规与长文字、pointer/keyboard/IME、离线/失败/取消。按钮文字完整居中、上传方形圆角、输入弱焦点和顶部喜欢/标签均需实际 DOM 与命中证据。

喜欢与标签分别验证位置恢复、同时打开/单独关闭、键盘移动与回焦；缩放和平移只影响画布世界，不改变面板屏幕尺寸。旧收藏映射“收藏”标签，取消后重载不复活；32 个普通标签与额外兼容收藏互不截断。图片/视频上传验证原节点 ID、世界坐标和归档回执。

搜索的四分类、类型/标签过滤和资源库分页分别覆盖。使用记录不把演示、估算或未知 Token 当成真实消耗；预设禁用态与官网/密钥/文档跳转按平台验证。390px 浏览器属于响应式 Web，Native Mobile、真实模型和安装包另记。

体积证据按 [编码规范](engineering/CODING-STANDARDS.md#依赖与体积预算) 执行。规则变更需独立审查与 AI 场景复核；未运行或失败项按实际状态记录，不能用更新测试名称消除有效行为断言。

## DESIGN.md 与独立预览

根 [DESIGN.md](../DESIGN.md) 提供全局设计概览、专项规范链接和由当前 tokens.css 生成的 YAML。UI_INDEX 继续路由各主题唯一承载文件；CSS 仍是唯一数值源。

| 命令 | 用途 |
| --- | --- |
| `npm run design:sync` | 从当前 CSS 同步生成角色、完整作用域与源 hash，保留人工正文、未知 YAML 和注释 |
| `npm run design:check` | 只读检查 YAML、引用、章节和 CSS 漂移；失败不改文件 |
| `npm run design:lint` | 固定版本 Google DESIGN.md 官方校验 |
| `npm run design:diff -- <before.md> <after.md>` | 显式比较两份文档的语义差异，不假设未跟踪文件已在 Git 中 |
| `npm run design:export` | 输出 DTCG JSON 到 stdout；扩展中的原始 CSS 作用域仍保留在源文档 |
| `npm run design:spec` | 查看所用 alpha 格式与规则 |
| `npm run design:dev` | 独立开发预览，固定 1421，编辑器修改后自动刷新 |
| `npm run design:build` | 类型检查并构建独立预览到 .tmp/design-md-preview |
| `npm run design:preview` | 重建后在 1423 预览；修改源文件后需重新构建 |
| `npm run test:design` | 定向单测、构建与真实 Edge 预览回归 |

预览 import 链为 design/preview/index.html → main.tsx → 当前 tokens/global/ui-tokens/ui-governance、SettingsControls、UiIcon 与 DESIGN.md 原文。它不读写产品 storage、不调用 Provider，示例反馈只在页内存中生效；文档中的 HTML 以文字显示、不执行。

1421/1423 与产品验证共用固定端口，必须串行，不杀其他任务的进程或复用旧 server。预览 Playwright 使用现有独占分配器、统一 Edge 防护参数，报告、trace 和截图位于同一次新建 test-results/design-md/<run-id>/；不清空旧证据。

验证主题、全部强调色、密度、字阶、语义尺寸、默认/hover/active/selected/disabled/focus、开关边缘、键盘及连续 resize，并保存实际入口和同状态 DOM/截图。预览通过只证明共享角色在此工具中的表现；全页面、Desktop/Web、四渠道真实选择、异步持久化和外部模型必须另有产品链证据，不能升级为 REAL 或整站 UI 完成。
