# KK Studio UI 运行与验证规范

> 本文件只管 **"改动之后怎么确认它真的生效"** ——运行来源、设计读取、浏览器验证、完成标准。
> 样式与交互**规则**在 [`UI_RULES.md`](./UI_RULES.md)，**数值**在 [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md)。
> 入口见 [`UI_INDEX.md`](./UI_INDEX.md)。
> 2026-09-10 / 09-11 的日期流水账原文见 [`archive/ui-history/UI-SPEC-2026-09-10-11.md`](./archive/ui-history/UI-SPEC-2026-09-10-11.md)。

---

## 1. 现行基准锚点

| 主题 | 现行出处 |
|---|---|
| 颜色 / 基础组件 | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) 1.3 |
| 字阶 / 控件与专项尺寸 | [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md) |
| 创作输入框契约 | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) §创作输入框（1.3） |
| 三档响应式 | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) §三档尺寸、图标与换行 |
| 零件 / 交互 / 对齐规则 | [`UI_RULES.md`](./UI_RULES.md) |
| 页面类型 | [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md) |

**冲突处理**：设计原文快照存在旧值时，以最新一次用户指定节点为准，并在验证记录里写明覆盖关系。
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
项目 / 生成 / 保存状态纳入 `CanvasHud` 流式布局，与任务入口和导航共同占用可用宽度，**不能在同一角落分别 absolute 定位**。20%–400% 画布点阵/网格保持可见，低比例使用分级格距；100% 原始相位保留。折叠保留业务与草稿状态、清除不可见弹层；同一触发器再次点击关闭。Escape 只关闭最上层并回焦；菜单转弹窗使用稳定入口；Modal 从内部拖到背景不得误关闭。

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

证据目录约定：`docs/evidence/<主题>-<日期>/`。

---

## 7. 变更记录

| 版本 | 内容 |
|---|---|
| v2.0 | 按 `UI_INDEX.md` 收敛：删除 2026-09-10 / 09-11 日期流水账（原文归档），改为引用现行基准锚点；保留运行核对、设计读取、复用入口与浏览器验证 |
