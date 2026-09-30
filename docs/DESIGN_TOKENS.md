# KK Studio 运行时 Token 索引

2026-09-30 更新。设计裁决从 [UI_INDEX](UI_INDEX.md) 开始，以新版 Figma
四页治理基线为准。[历史 v2 表](archive/ui-history/DESIGN-TOKENS-2026-09-28.md)
保留溯源，不能覆盖当前运行时。

## 唯一数值源

[`src/styles/tokens.css`](../src/styles/tokens.css) 是实际加载的 `--kk-*` 数值源。
[`ui-tokens.css`](../src/styles/ui-tokens.css) 只提供兼容别名，
[`ui-governance.css`](../src/styles/ui-governance.css) 提供共享状态类。
`tokens.json` 是历史导出快照，未被应用加载，不作为现行数值依据。

| 角色 | 当前 token |
| --- | --- |
| 控件高度 | `--kk-control-h-sm/md/lg`：24 / 32 / 40 |
| 图标图形 | `--kk-icon-glyph-sm/md/lg`：16 / 20 / 24 |
| 标准控件圆角 | `--kk-radius-control`：8 |
| 菜单圆角 | `--kk-radius-menu`：10 |
| 已注册面板外壳 | `--kk-radius-panel`：20 |
| 字体 | Caption 12/16；Body 14/20；Subtitle 16/24；Title 20/28；Display 26/32 |

页面实例消费语义或组件 token。外壳几何必须先注册；断点只改变布局和容器宽度。
交互规则见 [UI_RULES](UI_RULES.md)，页面选型见 [UI_ARCHETYPES](UI_ARCHETYPES.md)。
新增数值必须同时说明来源和实际使用者，并通过 `npm run ui:check` 与浏览器验证。

## 主题与组件

主题、强调色和基础组件用法见 [DESIGN-SYSTEM](DESIGN-SYSTEM.md)。
本次更新没有在线改写 Ardot 或 Figma；工程证据不能代替外部设计文件同步与用户视觉验收。
