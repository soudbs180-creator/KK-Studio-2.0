# 新版 Figma UI 治理验证记录

## 范围

验证对象是 Figma 四页基线对应的业务门禁、token、页面模板、首页/对话/设置
布局和侧栏状态。外部模型供应商、真实积分扣费和生产桌面运行不在本次 Web
原型证据范围内，页面必须继续显示未接入边界。

## 问题矩阵

| 严重程度 | 位置 | 问题与影响 | 修复 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 阻断 | 首页、画布、对话提交入口 | 未配置服务仍可能进入提交路径，产生错误能力暗示 | `uiGovernance.ts` 统一门禁；`ui-governance-state.spec.ts` | 已修复 |
| 阻断 | 页面模板配置 | 旧 A1–A9 与工作展示选型冲突，新增页面会重复造型 | 五模板注册表、grid 默认和混排约束测试 | 已修复 |
| 严重 | 首页与对话 composer | 移动/桌面尺寸、文字和控件高度不统一，造成操作错位 | `composer.css` 统一 299×170、652×170、426×170 与 24px 控件；布局 Playwright | 已修复 |
| 严重 | 侧栏与工作区 | 展开后工作区不稳定，图标状态和宽度不一致 | 70px/291px 稳定断言、Figma 侧栏资源、布局 Playwright | 已修复 |
| 严重 | 设置页 | 移动端分类占用内容区，底部滑块与顶部入口重叠 | `mobile-settings` 唯一入口和底部 rail 断言 | 已修复 |
| 严重 | 共享 token | 多套字号、控件高度和图标来源重复定义 | `tokens.css` 权威源、兼容别名层、0 项 UI 标准违规 | 已修复 |
| 一般 | 会话组件边界 | ConversationPanel 超过组件行数边界且把状态、输入和消息混在一起 | 拆出 `ConversationStatus`、`ConversationComposerRegion`、Catalog header | 已修复 |
| 一般 | 设置图标来源 | 设置页直接引入 Lucide，和 Figma 资源约束冲突 | 改用 Figma 设置 SVG；eye 图标集中进入 UiIcon | 已修复 |
| 一般 | 画布工具色 | 画布菜单有局部颜色字面量，主题切换不完整 | 增加语义渐变/阴影 token | 已修复 |
| 建议 | 旧历史文档 | UI_INDEX、UI_RULES、UI_ARCHETYPES 仍描述旧档位和九类页面 | 重写现行文档，旧内容保留在 archive | 已修复 |
| 待确认 | 真实服务 | 未连接真实供应商时不能验证真实生成和积分回执 | 保留 `service-unconfigured` 与本地原型说明 | 待产品确认 |

## 运行验证

执行命令和结果：

- `node --test tests/unit/*.test.ts`：467/467 通过。
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`：通过。
- `node node_modules/vite/bin/vite.js build`：通过；仅有既有 chunk 体积提示。
- `node scripts/check-ui-standards.mjs`：170 个文件，0 项违规。
- `node scripts/check-governance.mjs`：74 个任务，0 项违规。
- `node scripts/check-markdown.mjs`：89 个活动文件，0 项违规。
- `node scripts/check-features.mjs`：32 个功能，0 项违规。
- `node node_modules/@playwright/test/cli.js test tests/browser/figma-governance-layout.spec.ts tests/browser/ui-governance-state.spec.ts tests/browser/ui-governance-visual.spec.ts tests/browser/page-templates.spec.ts --reporter=line`：5/5 通过。
- `node node_modules/@playwright/test/cli.js test tests/browser/ui-feature-parity.spec.ts -g "Agent controls match|Agent idle hello|Agent warning hello" --workers=1 --retries=0 --reporter=line`：3/3 通过；覆盖 390、768、1920 宽度的对话轨道和 Agent 配置路径。

旧版交互用例中仍有一批断言引用旧导航命名、旧首页插件入口和旧移动侧栏入口；这些断言与四页治理基线冲突，未将它们作为新版通过标准。真实外部服务、真实积分回执和生产桌面打包仍待产品确认与独立环境验证。
