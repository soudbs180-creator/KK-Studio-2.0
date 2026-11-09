# Plan

1. 在 `tokens.css` 登记不在 4px 网格上的尺寸，组件层只引用变量。
2. 抽出 `InlineSelect` 和 `SettingsStepper`，登记到 `design/figma-component-map.json`。
3. 设置页消费这些控件，并清掉被替换的步进器和下拉外观规则。
4. 按 spec 改首页、数量、顶栏、侧栏、项目库、提示条和画布底栏。画布底栏只保留 `.canvas-toolbar` 上的一条宽度规则。
5. 跑类型检查、lint、单元测试和 UI 门禁。用 1421 上的页面做 1440×1000 与 390 的计算样式和截图。
