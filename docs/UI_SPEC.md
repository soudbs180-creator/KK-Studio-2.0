# KK Studio UI 运行与复用规范

## 完成标准

UI 的实现链路固定为：

`最新 Figma Frame → Design Tokens → Shared Components → Actual Source → Browser Verification`

“代码已修改”“测试已通过”或“Figma 已读取”都不是视觉完成的证据。完成记录必须能回答：浏览器访问的 URL 和端口、它是 development/preview/Tauri 哪种运行模式、当前 route、route 实际 import 的组件文件、源码是否进入当前运行产物，以及同状态浏览器的 DOM 矩形和截图是否变化。

## 运行来源核对

1. 从 `package.json`、`vite.config.ts`、`src-tauri/tauri.conf.json` 和启动脚本确认启动命令与端口。
2. 通过浏览器地址、页面 `<script>`、`data-runtime-entry` 和 `data-runtime-mode` 记录实际加载来源。Vite development 应显示 `/src/main.tsx` 与 `/@vite/client`；production preview 应显示 `/assets/index-*.js`；Tauri 使用 `frontendDist: ../dist`，源码变更后必须重新 build。
3. 必须确认当前运行端口是预期端口：Vite 开发态默认 `127.0.0.1:1421`，`vite.config.ts` 配置 `strictPort: true`。
4. 从 `src/main.tsx` 开始沿 import 和 `App.tsx` 的 route 分支追到实际页面组件，检查旧版页面、重复组件、未引用 diff 和 monorepo 其他 package。
5. 1421（Vite dev）、1423（Playwright preview）等端口必须在证据中明确区分；旧端口或旧窗口不能被当作当前源码验证。

## 设计读取与对照

每次视觉修改都要重新读取用户提供的 node-specific Figma Frame 的 design context；不可使用历史缓存或只凭截图估算。记录 frame 尺寸、层级、Auto Layout、padding、gap、尺寸、字体、行高、颜色、边框、圆角和状态。对照顺序是 Figma、当前源代码、当前浏览器实际效果，三者必须使用同一状态和视口。

同一部件有历史记录与最新 Frame 冲突时，以本次用户指定节点的最新读取为准，并在验证记录写明覆盖关系。2026-09-10 的范围是 `404:28667`（Workspace）、`410:67357`（Workspace 收纳）和 `410:59708`（Landing）；旧 `1:2` 与历史尺寸仍用于来源追溯，不能覆盖这些最新节点。

## 复用与 tokens

颜色、间距、字号、行高、圆角、边框、控件高度和图标槽位通过 `src/styles/global.css`、`src/styles/ui-tokens.css` 与已有 shared components 消费。两份样式均由 `src/main.tsx` 全局导入，不能依赖进入某一 route 才提供共享令牌。相同语义使用同一层级；Figma 指定的特殊几何在部件样式内保留来源注释，不能为了统一而抹掉原稿分工。已有相同功能组件必须复用；不得为一个未接入 route 的旧页面复制第二套实现。

| 范围                    | 现有唯一入口与复用方式                                                                                        | 验证要求                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 颜色、边框              | `global.css` 语义背景/文字/边框与 `ui-tokens.css` 状态色、边框宽度                                            | 深色按 Figma；浅色作为工程补充单独标注                                                                      |
| 间距、字体、行高        | `ui-tokens.css` 的 gap、font、line-height 层级；特殊 Frame 数值保留来源                                       | 检查 computed style 和实际文字矩形，不仅检查 token 声明                                                     |
| 圆角、控件高度、图标    | `ui-tokens.css` 尺寸层级、`UiIcon.tsx`、Figma 导出资产；工具栏复用 `ToolbarIcon.tsx`                          | 区分可见图形、图标槽位和命中区域                                                                            |
| Panel、Sidebar、Toolbar | `ConversationPanel.tsx`、`Sidebar.tsx`、`CanvasToolbar.tsx`，布局复用 `useSidebarLayout`、`useCanvasViewport` | 展开/收起、窄屏及有无聊天面板使用同状态矩形验证                                                             |
| Modal、Dropdown         | `Modal.tsx` 与 `useDismissible.ts`；添加节点复用 `AddNodeMenu.tsx`，已有各领域菜单继续消费共享行为            | Escape、外部点击、键盘移动、关闭回焦和 disabled 原因                                                        |
| Button、Input           | 共享 `.ui-button` 与原生 button/input/textarea；设置复用 `SettingsControls.tsx`，现有领域输入区保留真实逻辑   | 普通按钮默认 32px，紧凑/标准/Figma 专项尺寸分别消费对应层级，不全局强制相同高度                             |
| Tabs、Selected          | 现有 tablist/tab 及 `aria-selected`；可切换分类使用真实状态与 `aria-pressed`                                  | 点击后的可见 selected 必须与状态一致；语义标签仍需验证键盘行为                                              |
| Tooltip                 | 目前复用原生 `title`，图标同时提供可访问名称；没有自定义 Figma tooltip 组件                                   | 原生提示外观由浏览器控制，不能报告为 Figma tooltip 已还原；需要自定义稿时先读状态再补现有控件的共享提示实现 |

共享按钮已定义 hover、active、pressed、disabled 和 focus 的表现；disabled 不应用 hover 强调。页面专用按钮、输入、菜单与 tabs 仍需逐项浏览器检查，不能据共享规则推断所有控件已验收。异步控件按实际能力覆盖 loading、success、error、cancel 和离线状态；未支持的模式必须禁用并解释，未接后端的行为明确标注 Prototype。

## 浏览器验证

源码修改后重新启动实际项目，必要时清理 `node_modules/.vite`、`dist` 并重建，但不得删除用户数据或工作区修改。至少验证桌面和窄屏的布局、sidebar、toolbar、panel、间距、对齐、字体、图标、控件高度与状态交互，并保存同状态 DOM/截图。`pnpm run typecheck`、`pnpm run build` 和适用的 UI/screenshot tests 通过后，仍需报告任何尚未与 Figma 对齐的部分。

## 2026-09-10 actual runtime and current design contract

Required chain: Figma -> Design Tokens -> Shared Components -> Actual Source -> Browser Verification. Current frames in 0nU0A7pq6eyjwfwm1TtWkO: Workspace 404:28667, collapsed Workspace 410:67357, Landing 410:59708. Read fresh design context, descendants, states and motion. Historical 1:2 measurements cannot override them.

At 1920x1080: expanded rail 291; collapsed rail 70; content (291,45,1619,1025) or (70,45,1840,1025); panel (1430,61,470,998); panel composer (1450,844,426,170); textarea (1463,857,400,64); actions (1463,977,400,24); text pills height 22; toolbar (719,998,294,50). SidebarProjectEntry is reused for nested projects. Landing/conversation share the complete composer-plus.svg export.

App.tsx owns shell stylesheet order. Component imports execute first; repeating a CSS import later does not reorder it. Load workspace/responsive before sidebar/conversation, then verify actual stylesheet order and computed values. An opaque panel must compute to rgb(22,22,22), not a transparent color-mix.

Design system: global.css owns colors/fonts/shell; ui-tokens.css owns spacing, radii, typography/line-height, border, icon and control tiers. Reuse Sidebar, TopBar, CanvasToolbar, ConversationPanel, Modal, SettingsControls, CatalogPanel, UiIcon and ToolbarIcon. Generic buttons use .ui-button; input, dropdown, tabs, selected/pressed, disabled and focus retain semantic colors and shared focus tokens. Native title tooltips are an engineering supplement until a source tooltip state is read. Source-specific 22px and 38.586px controls must not be forced into the generic 32px tier.

Source sidebar motion: width 263 to 38 over the first 300ms of a 2000ms looping design timeline; text alpha easing cubic-bezier(0.5,0,0.5,1). The product applies it to the user's collapse action, not a repeating timer. This trigger adaptation is an engineering supplement. Reduced motion disables it.

Web development uses 1421 and /src/main.tsx. Production UI regression builds dist then serves isolated 1423 with reuseExistingServer=false. Tauri development uses devUrl 1421; release embeds ../dist and needs a rebuilt executable. A Vite build alone cannot validate Desktop. The launcher must rebuild stale releases or refuse to start them.

Completion evidence must name URL/port/process/mode/app/active state/import chain, viewport, screenshots, computed geometry/colors and browser errors. Verify landing/workspace/collapsed, narrow screens, hover/selected/focus/disabled, menus and retained business interactions. Separate typecheck/build/tests from visual acceptance. If the rendered screen did not change, investigate imports/caches/process before further CSS. Preserve uncommitted work and user data.

Evidence: docs/evidence/ui-runtime-2026-09-10/. Figma sample chat, application empty chat, populated local demo canvas and native window controls are distinct states. Do not fabricate replies/accounts or remove existing content merely to manufacture pixel equality. Outstanding differences stay in the delivery report.

## 2026-09-10 final runtime verification amendment

- Web runtime repaired and visibly verified on a fresh development process at http://127.0.0.1:1421/ (PID 16112). Latest measured contracts and before/after evidence are recorded in docs/changes/2026-09-10-ui-runtime-diagnosis/verification.md.
- Typecheck/build, 20 unit tests, 96 browser tests (no retries), UI standards and formatting passed. Tauri release rebuilt; freshness is current. Native visual acceptance remains open.
- User-approved exception: retain the collapsed search button and its keyboard/focus contract. This supersedes any earlier note proposing to hide the search control to imitate the static collapsed Frame.
- Current source authority: Workspace 404:28667, collapsed Workspace 410:67357, Landing 410:59708. Page 0:1 shared variants were read live; unnamed variant numbers are not semantic hover/selected definitions.
- Full-file Figma acceptance remains open for same-content states, broader modal/asset/settings variants and native window verification. Never turn a passed build or screenshot existence into a blanket visual-completion claim.

## 2026-09-11 precise frame and collapse contract

The fresh user-specified frames 404:28667 and 410:67357 supersede earlier task/HUD placement. At 1920×1080, task positions are (321,72,93,30) and (100,72,93,30). The task stays exactly 30px from the changing inner frame left edge. The toolbar remains (719,998,294,50) in both rail states, independent of chat visibility. With chat open, navigation remains visible at (1138,72,281,31.109), ending 11px before the panel's x=1430 edge; the map control therefore remains clickable beside the panel. With chat closed, navigation returns to (1562,72,281,31.109) and reopen stays at (1859,79,18,18).

The fresh collapsed search node 448:472 is now confirmed in the current source. Its 26px box is at (22,942), with settings at (22,982) and account at (22,1022). Expanded search/toggle boxes are (204,75,26,26) and (245,75,26,26). Use complete Figma containers or stroke-inclusive exported bounds when sizing icons, not smaller nominal path bounds.

Keep the app background opaque #161616 through rounded corners and shell gaps. The canvas dot field uses the global source phase (first center 11,13, pitch24) while the sidebar changes its crop. Project rows retain source widths 263/231/263 and heights29 during expansion; prevent mid-motion text reflow without clipping project menus vertically. Brand reveal waits until the moving toggle clears its area. This staging is an engineering refinement; source navigation width and text alpha still use the 300ms timeline.

Left/right toggles remain independent and preserve drafts. Closing chat returns focus only if focus has not already moved into the canvas. Group actions use the source 20×21 icon containers; current project management remains reachable by right-click or Shift+F10 and supports initial focus, arrow keys, Home/End and Escape. Multi-page creation is disabled with a Prototype explanation.

Current comparison and measured acceptance scope: docs/changes/2026-09-11-frame-accuracy/verification.md and docs/evidence/frame-accuracy-2026-09-11/comparison.html. Source example chat/account/empty canvas, application initial content and native OS titlebar remain distinct states. Precise anchor verification does not imply full-file pixel equality.
