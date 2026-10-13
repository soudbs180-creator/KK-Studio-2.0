# KK Studio 运行时 Token 索引

2026-10-14 更新。设计裁决从 [UI_INDEX](UI_INDEX.md) 开始；本页索引当前组件角色，不维护第二份可加载的数值表。[历史 v2 表](archive/ui-history/DESIGN-TOKENS-2026-09-28.md) 保留溯源。

## 唯一数值源

[tokens.css](../src/styles/tokens.css) 声明全部 --kk-* 语义值；[ui-tokens.css](../src/styles/ui-tokens.css) 仅承接兼容别名，[ui-governance.css](../src/styles/ui-governance.css) 提供共享状态类。tokens.json 是历史导出快照。

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
| 设置外壳 | --kk-settings-width、--kk-settings-nav-width；分组导航、列表与详情 |
| 喜欢/标签面板 | --kk-collection-panel-width/height：360 / 480；FloatingCollectionPanel，受可视窗口限制、不随画布缩放 |
| 任务弹层 | --kk-task-popover-width/height/min-height；任务浮层与 HUD |
| 字体与间距 | --kk-font-*、--kk-line-*、--kk-space-*；文字层级与 4px 间距网格 |

数值的实际使用者、默认/hover/pressed/selected/disabled/focus 状态须消费同一角色。断点可改变容器、排列和宽度，不复制第二套语义；新几何先注册 token 再使用。交互规则见 [UI_RULES](UI_RULES.md)，颜色与组件用法见 [DESIGN-SYSTEM](DESIGN-SYSTEM.md)。

本轮没有修改在线 Figma 文件；代码和文档不能冒充外部设计同步或用户视觉验收。
