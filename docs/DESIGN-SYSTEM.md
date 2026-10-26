# KK Studio Design System

> 设计真值来自当前 Figma Design System；本文件按其 Color Palette、Elevation & Depth、Icons & Components 章节派生，当前来源与同步流程见 [UI_INDEX](UI_INDEX.md)。设计文档更新不表示运行时已全面迁移。

设计裁决由 [UI_INDEX](UI_INDEX.md) 路由；[DESIGN.md](../DESIGN.md) 是派生概览与运行时投影。Google DESIGN.md 只约束交换格式，不定义本项目的颜色、组件和布局。

全局概览与机器生成 token 索引见根 [DESIGN.md](../DESIGN.md)。Mobbin/getdesign 仅提供独立分析参考，不覆盖当前暗色/绿色语义；主题、组件、运行验收仍由本索引的专项文件承载。

## 01 · 色彩调色板 / Color Palette

语义颜色从 Figma 变量/样式映射到唯一运行时注册处 [tokens.css](../src/styles/tokens.css)。[global.css](../src/styles/global.css) 与 [ui-tokens.css](../src/styles/ui-tokens.css) 承接主题状态和旧名称映射，页面不建立第二套调色板。

Dark / Light 使用根节点 data-theme；data-accent 与原有偏好身份保持。default 的语义改为绿色，已显式选择的其他颜色保留。普通主要动作在深色主题使用浅色中性表面、浅色主题使用深色中性表面；Primary 是层级而非强调色同义词。状态色同时提供文字/图标，浅色与深色下均核验文字对比。

`546:21` 定义默认绿色、蓝、黄、粉、橙、紫、白七组实际配色，默认与绿色同值；焦点随强调色切换，与选中状态分开。错误文字消费 `on-error`，危险填充消费 `error`；普通信息保持中性，不自行定义固定蓝色信息态。主题色和强调色设置独立，错误/警告/成功不随强调色改义。

## 05 · 层级与深度 / Elevation & Depth

`546:184` 按 Flat → Outlined → Floating → Modal 分层：普通内容无额外阴影；分隔描边 1px；菜单阴影 x/y/blur 为 0/8/24、Black 16%；模态为 0/16/48、Black 24%，遮罩示意为 background 72%。页面内容低于非模态浮层，非模态浮层低于遮罩和模态。复用现有层级角色，并验证焦点边界和关闭回焦。

## 06 · 图标与控件 / Icons & Components

- Primary / Secondary / Tertiary / Danger 共用语义尺寸、间距和状态。文字动作使用胶囊、按内容扩展；常规文字完整显示，超出容器上限才省略并保留完整名称。可见文字和图标整体居中。
- 上传与 IconButton 采用方形圆角命中区；上传是可执行的文件选择动作，加载/失败有反馈。
- 输入过程保持克制；键盘 focus-visible 按当前 Figma 焦点角色可见，与选中态分开。IME、增长高度、语音和附件行为继续复用 [ComposerTextarea](../src/components/ComposerTextarea.tsx)。
- 图标复用 [UiIcon](../src/components/UiIcon.tsx) 或原有 Figma 资产，图形与命中区分开。
- 字阶、图标/字重配对及尺寸目标见 [DESIGN_TOKENS](DESIGN_TOKENS.md#figma-目标与本地映射)。标准图文按钮为高40、字号16/500、行高24、图标16、描边1.25、gap8、水平padding16；紧凑与触控命中区分别按目标变体核对。
- 生成入口共用 [uiGovernance](../src/domain/uiGovernance.ts) 的可用性谓词；未配置、离线或无效输入有真实原因。
- 模型选择按 [当前批准规格](changes/2026-10-15-kk-unified/spec.md) 固定为渠道、搜索筛选、模型三排，不增加供应商下钻；参数随实际执行模型和操作能力显示，推荐默认值，各模型草稿切换保留。生成数量与数据模式仍属于各生成操作，不据此宣称对应实现已完成。
- 设置按分组导航、列表与详情的密度选择二栏或三栏。窄屏保留完整内容，原生 Mobile 的布局与触控验收独立。
- 共享弹层保持键盘导航、Escape、关闭与回焦；喜欢/标签屏幕面板和数据职责见 [UI_RULES](UI_RULES.md)。

尺寸索引见 [DESIGN_TOKENS](DESIGN_TOKENS.md)，页面选型见 [UI_ARCHETYPES](UI_ARCHETYPES.md)，运行证据见 [UI_SPEC](UI_SPEC.md)。

## 验收边界

当前源码与构建不是视觉完成证据。Web development、production preview 和 Tauri release 分别核验实际入口、bundle、computed style、同状态截图及真实操作；旧截图不证明当前候选。响应式 Web 不证明原生 Mobile 已实现。

本轮默认绿、按钮、输入、面板、预设和使用记录的源码候选见 [本轮验证](changes/2026-10-14-ui-consolidation/verification.md)。功能与任务状态仍分别由注册表和账本决定；真实外部模型、Hosted、安装器与用户验收不从 fixture 推导。
