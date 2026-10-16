---
version: alpha
name: "KK Studio Design System"
specification: "https://stitch.withgoogle.com/docs/design-md/specification"

# ==============================================================================
# 1. COLORS SECTION
# ==============================================================================
colors:
  # Base surfaces
  background: "#0a0a0a"
  surface: "#161616"
  surface-container: "#1a1a1a"
  surface-container-high: "#202020"
  surface-container-highest: "#292929"
  surface-hover: "#262626"
  surface-active: "#333333"

  # Light theme alternative
  surface-light: "#ffffff"
  background-light: "#f6f6f6"
  surface-container-light: "#ffffff"

  # Neutral text & icon hierarchy
  text-primary: "#ffffff"
  text-secondary: "#a3a3a3"
  text-tertiary: "#737373"
  text-muted: "#525252"
  text-on-accent: "#0a0a0a"
  text-light-primary: "#171717"
  text-light-secondary: "#525252"

  # Borders & Outlines
  border-default: "#262626"
  border-subtle: "#1f1f1f"
  border-strong: "#404040"
  border-focus: "#22c55e"

  # Brand & Accent (Default Green, Multi-accent capability)
  accent: "#22c55e"
  accent-hover: "#4ade80"
  accent-soft: "#86efac"
  accent-surface: "rgba(34, 197, 94, 0.12)"

  # Semantic States
  error: "#ef4444"
  error-surface: "rgba(239, 68, 68, 0.12)"
  warning: "#f59e0b"
  warning-surface: "rgba(245, 158, 11, 0.12)"
  success: "#22c55e"
  success-surface: "rgba(34, 197, 94, 0.12)"
  info: "#3b82f6"
  info-surface: "rgba(59, 130, 246, 0.12)"

  # Neutral Actions
  button-primary-bg: "#ffffff"
  button-primary-text: "#0a0a0a"
  button-primary-hover: "#e5e5e5"
  button-secondary-bg: "#202020"
  button-secondary-text: "#ffffff"
  button-secondary-hover: "#292929"
  button-secondary-border: "#262626"

# ==============================================================================
# 2. TYPOGRAPHY SECTION
# ==============================================================================
typography:
  font-family-sans: "Inter, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif"
  font-family-mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

  display:
    fontFamily: "{typography.font-family-sans}"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: "-0.4px"

  title-lg:
    fontFamily: "{typography.font-family-sans}"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: "-0.2px"

  title-md:
    fontFamily: "{typography.font-family-sans}"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: "0px"

  body-lg:
    fontFamily: "{typography.font-family-sans}"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: "0px"

  body-md:
    fontFamily: "{typography.font-family-sans}"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: "0px"

  body-sm:
    fontFamily: "{typography.font-family-sans}"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: "0px"

  caption:
    fontFamily: "{typography.font-family-sans}"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: "0.2px"

  code:
    fontFamily: "{typography.font-family-mono}"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: "0px"

# ==============================================================================
# 3. SPACING & GRID SECTION (4px Baseline Grid)
# ==============================================================================
spacing:
  hair: 2px
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 20px
  xl: 24px
  2xl: 32px
  3xl: 40px
  4xl: 48px

# ==============================================================================
# 4. SHAPES / BORDER RADIUS
# ==============================================================================
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  control: 8px
  md: 8px
  menu: 10px
  card: 12px
  panel: 16px
  modal: 20px
  pill: 9999px
  full: 9999px

# ==============================================================================
# 5. BREAKPOINTS & VIEWPORT TOPOLOGY
# ==============================================================================
breakpoints:
  mobile-max: 767px
  tablet-min: 768px
  tablet-max: 1199px
  desktop-min: 1200px
  wide-min: 1600px
  # Vertical height thresholds
  height-short: 640px
  height-compact: 720px

# ==============================================================================
# 6. ELEVATION & DEPTH (Z-Index Hierarchy)
# ==============================================================================
elevation:
  level-0: "none"
  level-1: "0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.24)"
  level-2: "0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)"
  level-3: "0 12px 28px rgba(0, 0, 0, 0.65), 0 4px 8px rgba(0, 0, 0, 0.4)"
  modal-shadow: "0 24px 48px rgba(0, 0, 0, 0.8), 0 8px 16px rgba(0, 0, 0, 0.6)"

z-index:
  canvas-base: 1
  canvas-edges: 2
  canvas-nodes: 5
  canvas-hud: 15
  drawer-scrim: 39
  sidebar-rail: 40
  topbar: 41
  sidebar-drawer: 42
  floating-panel: 45
  modal: 50
  popover: 60
  tooltip: 70

# ==============================================================================
# 7. COMPONENT TOKENS
# ==============================================================================
components:
  control-height-sm: 24px
  control-height-md: 32px
  control-height-lg: 40px
  control-height-touch: 44px

  button-primary:
    background: "{colors.button-primary-bg}"
    color: "{colors.button-primary-text}"
    hoverBackground: "{colors.button-primary-hover}"
    borderRadius: "{rounded.control}"
    paddingX: "{spacing.base}"
    fontWeight: 600

  button-secondary:
    background: "{colors.button-secondary-bg}"
    color: "{colors.button-secondary-text}"
    hoverBackground: "{colors.button-secondary-hover}"
    border: "1px solid {colors.button-secondary-border}"
    borderRadius: "{rounded.control}"
    paddingX: "{spacing.base}"

  input:
    background: "{colors.surface-container}"
    border: "1px solid {colors.border-default}"
    borderRadius: "{rounded.control}"
    color: "{colors.text-primary}"
    focusBorder: "1px solid {colors.border-focus}"
    minHeight: "{components.control-height-lg}"
    paddingX: "{spacing.md}"

  card:
    background: "{colors.surface-container}"
    border: "1px solid {colors.border-default}"
    borderRadius: "{rounded.card}"
    padding: "{spacing.base}"

  modal-dialog:
    background: "{colors.surface}"
    border: "1px solid {colors.border-default}"
    borderRadius: "{rounded.modal}"
    maxWidth: "min(1120px, calc(100vw - 32px))"
    maxHeight: "min(840px, calc(100dvh - 32px))"
    boxShadow: "{elevation.modal-shadow}"

  # Dual-Track Convergence Components
  pill-composer:
    background: "{colors.surface-container}"
    border: "1px solid {colors.border-default}"
    borderRadius: "{rounded.pill}"
    minHeight: 48px
    paddingX: "{spacing.base}"
    shadow: "{elevation.level-2}"

  bottom-sheet:
    background: "{colors.surface}"
    borderTop: "1px solid {colors.border-default}"
    borderRadiusTop: "{rounded.modal}"
    handleWidth: 36px
    handleHeight: 4px
    handleColor: "{colors.border-strong}"
    maxHeightCompact: "40dvh"
    maxHeightMedium: "60dvh"
    maxHeightLarge: "85dvh"

  mobile-bottom-nav:
    height: 56px
    background: "{colors.surface}"
    borderTop: "1px solid {colors.border-subtle}"
    iconSize: 22px
    activeColor: "{colors.accent}"
    inactiveColor: "{colors.text-secondary}"

  canvas-mini-map:
    width: "min(100%, 360px)"
    height: 220px
    borderRadius: "{rounded.card}"
    background: "{colors.background}"
    border: "1px solid {colors.border-subtle}"
---

# Overview

本文档严格对齐 **[Google Stitch DESIGN.md Specification](https://stitch.withgoogle.com/docs/design-md/specification)**，是 **KK Studio 2.0** 整个产品所有界面、组件、卡片、浮层与跨端布局的**单一权威真实源（Single Source of Truth）**。

KK Studio 2.0 是一款面向 AI 多模态（图像、文本、工作流、Agent）的高性能创作工作台。设计系统的核心原则是：
1. **单一真实源**：所有样式与交互规范收敛于本标准，严禁在页面或组件中硬编码孤立颜色、绝对宽度或任意断点。
2. **全端自适应弹性（Width & Height Resilience）**：不仅在电脑、平板、手机等不同物理设备间平滑切换，更要保证用户在拖拽拉伸窗口宽度与高度时，界面布局、卡片流、操作按钮永不被截断、永不被遮挡。
3. **触控与桌面双通道保障**：移动端触控目标严格不小于 `44px × 44px`，桌面端保持精准的 4px 基准栅格与高密度信息架构。
4. **意图透明与对比度合规**：满足 WCAG 2.1 AA 级对比度要求，暗色调为主沉浸创作，亮色调作为完整备用模式。

---

## Colors & Semantic Themes

调色板采用三层映射模型：`PRIMITIVE（原始数值） → SEMANTIC（语义角色） → COMPONENT（组件消费）`。

* **中性表面系统（Surface Scale）**：
  * 应用底色（`background` / `#0a0a0a`）：最暗底层，沉浸式无限画布基座；
  * 卡片与容器（`surface` / `#161616`、`surface-container` / `#1a1a1a`）：提供视觉分层；
  * 悬停与激活（`surface-hover` / `#262626`、`surface-active` / `#333333`）：交互即时反馈。
* **主要动作与层级（Neutral Primary）**：
  * 主要执行按钮（Primary Button）默认采用高对比度中性反色（暗黑主题下使用浅白高光 `#ffffff`，文字为 `#0a0a0a`），确保核心操作优先级最高。
* **品牌与强调色（Accent）**：
  * 默认品牌色为高饱和翡翠绿（`#22c55e`），作为任务完成、选中态高亮与激活焦点环。
* **状态语义色**：
  * 成功（`success` / `#22c55e`）、警告（`warning` / `#f59e0b`）、错误（`error` / `#ef4444`）、信息（`info` / `#3b82f6`），均配套 `*-surface` 弱背景色（12% 透明度），保证在暗黑环境下柔和且辨识度清晰。

---

## Typography Hierarchy

采用现代无衬线西文字体族与清晰的中文字体回退链：`Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`。代码与 Token 数据消费专用等宽字族。

| 角色 | 字体尺寸 | 行高 | 字重 | 语义用途 |
|---|---|---|---|---|
| **Display** | 26px | 32px | 700 (Bold) | 首页大标题、关键欢迎语、重点看板 |
| **Title-LG** | 20px | 28px | 700 (Bold) | 弹窗标题、模块大分类标题 |
| **Title-MD** | 16px | 24px | 600 (Semibold) | 侧边栏大组、卡片主标题、列表项主要文字 |
| **Body-LG** | 14px | 20px | 600 (Semibold) | 强调正文、按钮文字、模型标签胶囊 |
| **Body-MD** | 14px | 20px | 400 (Regular) | 核心阅读正文、设置项说明、消息气泡内容 |
| **Body-SM** | 12px | 16px | 400 (Regular) | 辅助说明、状态标签、附属元数据 |
| **Caption** | 11px | 14px | 500 (Medium) | 底部角标、快捷键提示、微缩参数值 |
| **Code** | 12px | 18px | 400 (Mono) | 代码块、JSON 参数、日志流水、Hash 校验值 |

**溢出省略规则**：所有标题与单行文本容器均强制配置：
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
min-width: 0;
```
多行正文使用 `overflow-wrap: anywhere; word-break: break-word;`，杜绝任何长字符串或无空格 URL 撑破容器。

---

## Layout & Responsive Breakpoints

系统分为三大基础断点形态与垂直高度断点：

```
[Mobile: 0px ~ 767px]   [Tablet: 768px ~ 1199px]   [Desktop: 1200px ~ 1599px]   [Wide: 1600px+]
         ↑ 底部 Rail               ↑ 紧凑 Rail/浮层抽屉            ↑ 展开/收起固定 Rail        ↑ 宽屏多列并排
```

### 1. 电脑端 Desktop (>= 1200px)
* 侧边栏为 72px 紧凑 Rail，支持展开为 240px 完整侧栏。
* 画布与右侧对话面板（ConversationPanel）支持分栏平铺展示，互不遮挡。
* 内容卡片采用 3 ~ 4 列流式网格，间距 16px ~ 24px。

### 2. 平板端 Tablet (768px ~ 1199px)
* 侧边栏默认以 72px 紧凑 Rail 展示；点击展开时以抽屉（Drawer）形式浮动在画布上层，点击遮罩（Scrim）自动收起，避免强行挤压有限的画布宽度。
* 对话面板转为右侧滑出抽屉（Slide-in Drawer），宽度限制为 `min(400px, calc(100% - 16px))`。
* 所有可交互按钮与图标热区保证最小 `44px × 44px` 触控尺寸。
* 内容卡片自适应为 2 列流式网格。

### 3. 手机端 Mobile (< 768px)
* 侧边栏在顶部保留极简 Header（包含 Logo、项目名称切换与设置入口），主体转换为底部导航栏（Bottom Navigation Bar，高度 56px）。
* 顶部导航栏高度通过 `calc(56px + env(safe-area-inset-top, 0px))` 自动避让刘海与灵动岛；底部通过 `env(safe-area-inset-bottom, 0px)` 避让系统横条。
* 弹窗转换为底部抽屉（Bottom Sheet），带圆角抓手条，支持下滑手势关闭。
* 所有卡片采用单列全宽（`100%`），图片卡片遵循 `16:9` 或自适应比例，杜绝横向滚动溢出。

---

## Mobile & Desktop Dual-Track Unified Specification (双端同构统一设计规范)

项目同时支持**桌面端工作台（Tauri 客户端 / 宽屏 Web）**与**移动端触控客户端（React Native / 移动 Web / 手机端）**。双端并非相互割裂，而是**各展所长、互补搭配、同源同构**：

### 核心定位与搭配策略（Desktop Canvas vs Mobile Chat Complementary Strategy）
* **💻 电脑端（客户端 / 桌面端）**：
  * **主形态**：**无限画布（Infinite Canvas）**。充分发挥大屏幕和鼠标键盘的生产力优势，擅长多节点网状漫游、多图拼贴、节点引脚连线、高级参数配置与精细化创作。
  * **辅形态**：右侧伴随式会话抽屉（ConversationPanel），辅助下发复杂多模态指令。
* **📱 手机端（移动端 / 触控端）**：
  * **主形态**：**流式会话聊天（Chat-Centric）**。遵从手机单手握持最舒适的操作习惯，以对话为主导：
    1. **聊天流直接显示图片**：全面对齐市面优秀体验（如 ChatGPT、Claude、Midjourney、豆包），在对话消息气泡中直接图文混排渲染高清生成图片，支持生成进度骨架屏、点击全屏放大预览（Lightbox）、一键设为主体参考图、变体重绘与下载；
    2. **资源库（Asset Library / Gallery）**：手机底栏一键直达，随时随地查看历史生成了什么优秀作品并浏览收藏；
    3. **排队与任务页（Task Queue & Activity）**：手机底栏一键直达，实时查看正在排队的任务状态、执行耗时、进度条与重试/取消；
  * **辅形态**：提供轻量拓扑小地图（CanvasMap），供在手机上速览多节点关系，无需在小屏上痛苦拖拽连线。
* **🔗 跨端无缝搭配**：
  * 用户在手机端随时随地聊天生成图片、查看排队进度与资源库；
  * 回到电脑端打开同一项目，手机端生成的所有图片与素材自动作为节点平铺在无限画布上，供大屏继续深度编排与扩展。

### 1. 双端共享基石（Shared Foundation: Reusable Core）

| 共享维度 | 统一规范与实现 | 双端表现 |
| :--- | :--- | :--- |
| **色彩与层级** | `background` (#0a0a0a)、`surface` (#161616)、`card` (#1a1a1a)、`accent` (#22c55e) | 电脑端与手机端保持完全一致的高对比暗黑沉浸质感与翡翠绿品牌高光 |
| **任务状态机** | 统一 9 状态：`draft`、`queued`、`running`、`succeeded`、`failed`、`cancelled`、`quarantined`、`reconciling`、`unknown` | 双端共享同一套状态徽章、动效与错误恢复交互逻辑 |
| **参考图片槽位** | 统一 5 槽位：`主体`、`风格`、`材质`、`构图`、`Mask` | 桌面端卡片引脚与手机端 Pill 胶囊共享同一色彩与引用语义 |
| **资产与项目模型** | `Asset`、`Derivative`、`Project` 实体契约 | 同一项目在电脑端与手机端打开具有一致的素材索引与历史流水 |
| **排版与栅格** | 4px 节奏网格（4, 8, 12, 16, 24, 32px）与 Display ~ Caption 字体阶梯 | 保证跨平台视觉韵律严整一致 |

### 2. 双端优势融合架构（Merged Cross-Platform Patterns）

#### A. 输入交互融合：结构化编辑器与药丸悬浮输入（Pill Composer）
* **电脑端（Desktop/Web）**：
  * **形态**：多行结构化创作输入栏（ConversationComposer），支持 `@` 提及素材卡片、`/` 呼出斜杠指令菜单、展开多行长文编写；
  * **操作**：键盘回车发送，`Shift+Enter` 换行，底部并列模型选择胶囊与生图尺寸快捷选项。
* **手机端（Mobile Native / 窄屏 Web）**：
  * **形态**：浮动药丸输入框（Floating Pill Composer），高度 48px，左右内嵌快捷加号（添加素材）与模型胶囊；
  * **键盘与视口避让**：输入框悬浮于底部安全区（`env(safe-area-inset-bottom)`）之上；软键盘弹出时，通过 `KeyboardAvoidingView` 平滑顶起，绝对不遮蔽上层最近生成的图片。
  * **参数调整**：点击模型胶囊或参数药丸，自底向上滑出半屏 Sheet，手指轻轻点选模型与采样步数，点选即生效。

#### B. 覆盖层与弹窗融合：三段式弹窗与底部弹性抽屉（Bottom Sheet）
* **电脑端（Desktop/Web）**：
  * **形态**：居中 Modal（最大宽度 `min(1120px, 100vw - 32px)`，最大高度 `min(840px, 100dvh - 32px)`）；
  * **骨架**：固顶 Header + 内部滚动 Body + 固底 Footer。
* **手机端（Mobile Native / 窄屏 Web）**：
  * **形态**：自适应底部抽屉（Bounded Bottom Sheet），分为四档高度比例：
    * `compact`（40% 屏高）：模型快速切换、参数微调、快捷提示词选择；
    * `medium`（60% 屏高）：资产素材选择器、引脚槽位设置；
    * `large`（85% 屏高）：项目创建、ComfyUI 远程工作流配置、详细任务日志；
    * `full`（100% 屏高）：全局系统设置与账号管理。
  * **手势**：顶部带有 36px × 4px 抓手指示条（Drag Handle），支持向下滑动手势平滑收起，点击背衬遮罩（`rgba(0,0,0,0.4)`）关闭。

#### C. 工作台融合：自由无限画布与双模态手机视口（Canvas vs Feed & CanvasMap）
* **电脑端（Desktop/Web）**：
  * **形态**：2D 无限平移缩放画布，鼠标滚轮缩放、空格拖动画布、框选多节点、引脚拖拽连线。
* **手机端（Mobile Native / 窄屏 Web）**：
  * **双模态无缝切换**：
    1. **画廊会话流模式（Feed & Paintings Mode，默认）**：以高质量瀑布流展示生成作品，单手大拇指快速上下刷阅，轻触图片卡片直接放大进入 Lightbox，长按图片调出快捷动作（设为参考图、变体重绘、下载）；
    2. **画布全景地图模式（Canvas Map Mode）**：将桌面端的无限连线网格收敛为轻量小地图（CanvasMap），单指平移、双指捏合缩放，直观纵览多节点上下游拓扑，点击任意小节点立即平滑定位并呼出详情 Sheet。

#### D. 触控与人体工学融合（Thumb-Zone & Ergonomics）
* **电脑端**：以精准光标与快捷键（`Space`, `Ctrl+Z`, `Ctrl+Enter`）为中心，按钮尺寸为 24px/32px/40px；
* **手机端**：以单手大拇指热区为核心：
  * 底部固定 56px 导航栏（首页、画廊、创作、设置），核心动作沉底；
  * 所有触控按钮最小命中面积严格维持在 **`44px × 44px`（iOS）/ `48px × 48px`（Android）**，文本链接与小图标外层均包裹至少 8px 的内边距扩大触控靶心；
  * 严格遵守安全区域避让（`SafeAreaView` / `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`）。

### 3. 双端核心组件映射矩阵（Cross-Platform Component Mapping Matrix）

| 功能概念 | 电脑端（Desktop / Web） | 手机端（Mobile / App） | 共享契约与逻辑 |
| :--- | :--- | :--- | :--- |
| **主导航架构** | 72px 侧边 Rail（展开 240px 侧栏） | 顶部极简 Header + 底部 56px 导航 Rail | 路由映射与页面鉴权逻辑 100% 同构 |
| **创作输入框** | `ConversationComposer`（多行，展开式） | `PillComposer`（药丸悬浮栏，内嵌模型胶囊） | 输入内容解析、结构化 Prompt 编译逻辑完全共用 |
| **设置与配置面板** | 左右分栏居中 Modal (`width: 960px`) | `Sheet`（大型底部抽屉，85% 屏高） | 表单字段验证与存储 Schema 完全共用 |
| **创作画布** | `CanvasWorkbench`（原生无限漫游画布） | `CanvasMap`（迷你节点拓扑小地图）+ 画廊瀑布流 | 节点坐标数据、连线依赖与卡片状态 100% 同构 |
| **生图结果浏览** | 节点卡片内展示，支持就地连线操作 | `PaintingsGallery`（瀑布流卡片，点击唤起 Sheet） | 图像加载优化、缩略图生成与高清预览器共用 |
| **素材/附件引用** | 弹窗选择 + 拖拽进画布直接转为节点 | 底部 Sheet 选图 + 自动绑定槽位胶囊 | 5 类槽位（主体/风格/材质/构图/Mask）规则一致 |
| **操作反馈与通知** | 右上角悬浮 Toast 消息 | 顶部平滑下拉浮条 / 居中淡入 Toast | 成功、警告、错误三色语义令牌完全一致 |

---

## Dynamic Window & Viewport Adaptation (Width & Height Resilience)

市面上最优秀的桌面客户端与 Web 工作台（如 Figma、Linear、Notion、Google Stitch）的核心设计，在于**不依赖固定像素，而是建立双向弹性视口机制**：

### 1. 宽度自适应（Dynamic Width Adaptation）
* **流式网格（Fluid Grid Without Media Queries）**：
  卡片网格禁止写死列数，一律采用：
  ```css
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  ```
  在 1920px 分辨率下呈现 5 列，在 1366px 呈现 4 列，在 1024px 呈现 3 列，在 768px 呈现 2 列，在手机上自动变为 1 列。无需繁复的 JS 计算，完全由 CSS 引擎原生自适应流式排版。
* **容器最大宽度限制**：
  设置面板、弹窗、表单对话框统一采用 `width: min(100% - 32px, 1120px);`，始终确保在窗口极端缩小时留有 16px 外边缘呼吸感。

### 2. 高度自适应与矮屏防护（Dynamic Height & Short Screen Resilience）
当用户手动缩小客户端窗口高度（例如笔记本 1366×768 分屏、竖向拉低窗口到 500px，或移动端横屏）时，传统的固定高度弹窗会溢出，导致底部“保存/确认/取消”按钮被截断在视口之外。

**本标准强制推行三段式弹窗/面板布局骨架**：
```css
.modal-shell {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
  overflow: hidden;
}
.modal-header {
  flex: 0 0 auto; /* 固定顶部，不被压缩 */
}
.modal-body {
  flex: 1 1 auto;
  overflow-y: auto; /* 内容溢出自动滚动 */
  overscroll-behavior: contain;
  min-height: 0; /* 允许 flex item 收缩到 0 以下 */
}
.modal-footer {
  flex: 0 0 auto; /* 固定底部操作区，始终可见 */
  position: sticky;
  bottom: 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
}
```

* **矮屏紧凑模式（`@media (max-height: 640px)`）**：
  * 间距自动由 24px/16px 压缩至 12px/8px；
  * 首页 Hero 大横幅自动缩减高度或折叠，优先将 Prompt 输入框提升至视口中心；
  * 设置面板最大高度自适应为 `calc(100dvh - 16px)`，侧边分类导航支持独立内滚动。

### 3. 画布视口弹性（Canvas Viewport Resilience）
* 无限画布监听视口容器尺寸变化，保证当用户拖拽窗口边缘缩放时，中心锚点坐标系平滑调整，不发生突发跳动。
* 浮动 HUD（`canvas-hud`）与底部控制栏（`canvas-toolbar`）使用：
  ```css
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 24px);
  ```
  保证无论窗口拉多宽或压多窄，核心工具栏始终处于正下方居中位置，并在极窄窗口下自动转换为左右滑动。

---

## Elevation, Depth & Z-Index Governance

为防止界面各层级相互重叠或遮挡，严格实行统一的 Z-Index 梯队：

| 层级 | Z-Index | 对应组件与元素 |
|---|---|---|
| **Layer 0 (Canvas)** | 1 ~ 4 | 无限画布网格背景、连线层、编组区域 |
| **Layer 1 (Nodes)** | 5 ~ 9 | 图片卡片节点、文本创作节点、参考图卡片 |
| **Layer 2 (Actions)** | 10 ~ 14 | 节点悬浮操作栏（`.node-actions`）、引脚连线点（`.port`） |
| **Layer 3 (HUD)** | 15 ~ 29 | 画布悬浮 HUD、缩放控制器、底部生图工具栏 |
| **Layer 4 (Overlays)** | 30 ~ 39 | 侧边栏遮罩（`.sidebar-scrim`）、画布全屏覆盖层 |
| **Layer 5 (Chrome)** | 40 ~ 44 | 顶部标题栏（TopBar）、侧边栏固定 Rail、移动端底部导航 |
| **Layer 6 (Drawers)** | 45 ~ 49 | 对话抽屉、收藏夹侧边抽屉、任务侧栏 |
| **Layer 7 (Modals)** | 50 ~ 59 | 统一 Modal 对话框、设置面板、资产管理弹窗 |
| **Layer 8 (Popovers)** | 60 ~ 69 | 下拉模型选择菜单、右键上下文菜单、用户账号气泡 |
| **Layer 9 (Tooltips)** | 70 ~ 99 | 快捷键悬浮提示、操作说明 Tooltip、全局 Toast 告警 |

**防遮挡规范（修复 TASK-131）**：
卡片下方的内联编辑器（`.creation-composer`）的 Z-Index 必须严格低于卡片连线端口与下游执行动作（保持在 Layer 1 ~ 2），且相对卡片采用正常文档流流动（`position: relative; margin-top: 8px;`），严禁用绝对定位覆盖下方的操作端口。

---

## Shapes & Radii System

圆角系统遵循人机工程学：外层容器圆角必须大于或等于内层控件圆角。

* **控件圆角（8px / `--kk-radius-control`）**：所有文本输入框、标准按钮、单选复选框、上传区域。
* **下拉菜单（10px / `--kk-radius-menu`）**：右键菜单、模型选择下拉框。
* **卡片外壳（12px ~ 16px / `--kk-radius-card`）**：资产卡片、项目预览卡片、灵感卡片。
* **面板外壳（16px ~ 20px / `--kk-radius-panel`）**：设置大面板、任务工作台、弹窗对话框。
* **药丸胶囊（9999px / `--kk-radius-full`）**：模型选择胶囊、状态标签（Tag）、头像外圈。

---

## Component Guidelines (Pages, Cards, Controls)

### 1. 页面模版（Page Templates）
* **StartPage（首页）**：
  * 上部为品牌与灵感激发（宽屏展示，矮屏与移动端折叠）；
  * 中部为核心创作输入区（Composer），无论屏幕多窄，均以 `width: 100%` 流式展开；
  * 下部为历史任务与灵感流，通过流式网格自适应呈现。
* **CanvasWorkbench（画布工作台）**：
  * 占满整个剩余视口（`flex: 1 1 auto; height: 100%; width: 100%;`）；
  * 顶部 HUD 与底部 Toolbar 居中对齐；
  * 手机端切换为紧凑屏幕编辑器，确保软键盘弹出时不遮蔽提示词输入框。
* **CatalogPage（资产库 / 项目管理）**：
  * 顶部 Toolbar（搜索、筛选、新建按钮）在宽屏下单排展开，在移动端自动换行堆叠；
  * 卡片区采用 `repeat(auto-fill, minmax(min(100%, 280px), 1fr))`。

### 2. 卡片设计（Cards）
* 所有卡片均自带 1px 细微内描边（`border: 1px solid var(--border-default)`），在暗黑模式下凸显边缘；
* 卡片悬停提升（Hover Elevation）：微弱上浮 `transform: translateY(-2px);` 搭配 `box-shadow: var(--elevation-level-2);`；
* 封面缩略图严格固定宽高比（如 `16 / 9` 或 `1 / 1`），使用 `object-fit: cover`，防止图片比例失真。

### 3. 操作控件（Controls）
* 按钮尺寸分为三档：
  * `sm` (24px / 图标 16px)：紧凑工具栏、标签删除；
  * `md` (32px / 图标 20px)：常规界面按钮、操作选项；
  * `lg` (40px / 图标 20px)：主执行动作、表单提交按钮；
  * `touch` (44px)：移动端与平板端所有点击命中区基准。

---

## Do's and Don'ts

### ✅ DO
* **DO**：始终使用语义令牌（如 `var(--bg-surface)`、`var(--text-primary)`），严禁在业务组件中直接硬编码 Hex 色值。
* **DO**：卡片网格始终使用 `repeat(auto-fill, minmax(min(100%, 280px), 1fr))` 实现真流式布局。
* **DO**：所有弹窗与抽屉必须提供三段式弹性高度约束（Header + Scrollable Body + Footer），保障矮屏可用性。
* **DO**：移动端与平板端交互元素必须保证至少 `44px × 44px` 触控面积。
* **DO**：文本单行容器必须增加 `min-width: 0; text-overflow: ellipsis;`，防止撑爆父容器。

### ❌ DON'T
* **DON'T**：绝对不要在全局或组件中写死固定宽度（如 `width: 1120px` 而不带 `max-width: 100%`）。
* **DON'T**：绝对不要使用 `100vh` 代替 `100dvh`，以避免移动端软键盘或浏览器工具栏遮蔽内容。
* **DON'T**：绝对不要在画布节点上使用过高的 Z-Index 导致遮挡系统级弹层或下拉菜单。
* **DON'T**：绝对不要忽略 `@media (max-height: 640px)` 的矮屏环境测试。
* **DON'T**：绝对不要随意引入未在 DESIGN.md 中注册的新字体尺寸或杂乱圆角。
