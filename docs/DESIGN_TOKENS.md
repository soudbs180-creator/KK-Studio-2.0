# KK Studio 运行时 Token 索引

> 权威设计系统与 Token 规范已全面对齐 **[Google Stitch DESIGN.md Specification](https://stitch.withgoogle.com/docs/design-md/specification)**，完整规范见 [**`DESIGN.md`**](../DESIGN.md)。

设计裁决从 [UI_INDEX](UI_INDEX.md) 开始；本页索引当前组件角色，不维护第二份可加载的数值表。[历史 v2 表](archive/ui-history/DESIGN-TOKENS-2026-09-28.md) 保留溯源。

## 唯一数值源

[tokens.css](../src/styles/tokens.css) 声明全部 --kk-* 语义值；[ui-tokens.css](../src/styles/ui-tokens.css) 仅承接兼容别名，[ui-governance.css](../src/styles/ui-governance.css) 提供共享状态类。tokens.json 是历史导出快照。

根 [DESIGN.md](../DESIGN.md) 的 YAML 是当前 CSS 的生成投影：标准角色、全部声明及作用域、源 SHA-256（UTF-8、LF 规范化，兼容 Windows/Linux 换行）和生成路径归属。运行 `npm run design:sync` 更新、`npm run design:check` 检查漂移；未知 YAML 和人工正文保留，不把投影当作第二数值源。预览与导出见 [UI_SPEC](UI_SPEC.md#designmd-与独立预览)。

| 角色 | 当前 token 与使用者 |
| --- | --- |
| 控件高度 | --kk-control-h-sm/md/lg：24 / 32 / 40；共享按钮和设置控件 |
| 图标图形 | --kk-icon-glyph-sm/md/lg：16 / 20 / 24；UiIcon |
| 胶囊动作 | --kk-button-radius 引用 --kk-radius-full；--kk-model-capsule-max-width：260，超出上限的长模型名才省略 |
| 方形圆角控件 | --kk-radius-control：8；输入、上传及 IconButton |
| 中性主动作 | --kk-button-primary-bg/hover/text；深浅主题分别配对 |
| 强调状态 | --kk-accent、--kk-accent-soft、--kk-text-accent；默认绿色、显式其他颜色兼容 |
| 弱键盘焦点 | --kk-focus-ring-subtle、--kk-focus-width-subtle、--kk-focus-offset-subtle；输入聚焦提示 |
| 菜单与面板 | --kk-radius-menu、--kk-radius-panel；不复制局部圆角 |
| 设置外壳与接入导航 | --kk-settings-width（1120）、--kk-settings-compact-width（960）、--kk-settings-height（680）、--kk-settings-nav-width（208）、--kk-settings-method-width（160）；2026-10-15用户密度反馈，SettingsPanel按分类消费，手机分级导航保留 |
| 手机画布屏幕编辑器 | --kk-canvas-screen-editor-width/bottom/max-height；CanvasComposerShell 与 canvas-composer-screen.css，固定屏幕容器受窗口和安全区限制，节点草稿与动作保持同源 |
| 屏幕编辑器层级 | --kk-z-canvas-editor：高于 dropdown，低于浮动喜欢/标签面板；编辑器仍在画布 covered/inert 边界内 |
| 画布菜单层级 | --kk-z-canvas-menu：HUD普通入口及缩放/背景菜单高于屏幕编辑器，低于喜欢/标签面板；入口和展开后使用同一层级，卡片动作避让实际矩形；临时可用高度限制短屏滚动，颜色入口采用32px/8px共享控件 |
| 喜欢/标签面板 | --kk-collection-panel-width/height：360 / 480；FloatingCollectionPanel，受可视窗口限制、不随画布缩放 |
| 浮动面板层级 | --kk-z-floating-panel/active：高于画布工具栏、canvas-editor 和 canvas-menu，低于 overlay、modal、popover；活动面板在同类面板之上 |
| 任务弹层 | --kk-task-popover-width/height/min-height；任务浮层与 HUD |
| 字体与间距 | --kk-font-*、--kk-line-*、--kk-space-*；文字层级与 4px 间距网格 |

数值的实际使用者、默认/hover/pressed/selected/disabled/focus 状态须消费同一角色。断点可改变容器、排列和宽度，不复制第二套语义；新几何先注册 token 再使用。交互规则见 [UI_RULES](UI_RULES.md)，颜色与组件用法见 [DESIGN-SYSTEM](DESIGN-SYSTEM.md)。

本轮没有修改在线 Figma 文件；代码和文档不能冒充外部设计同步或用户视觉验收。
