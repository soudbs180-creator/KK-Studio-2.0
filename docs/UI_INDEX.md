# KK Studio UI 规范索引（新版 Figma 四页基线）

本文件是 UI 规则入口。新版 Figma 四份治理页面拥有最高裁决权：

- `505:13071`：业务规则与状态矩阵；
- `505:13430`：审查问题与修复记录；
- `505:13731`：UI 基础规范；
- `505:14180`：页面类型模板配置。

它们位于 Figma 文件 `0nU0A7pq6eyjwfwm1TtWkO`。旧版页面草稿、历史 A1–A9
类型、旧字号表和旧 CSS 只作为归档证据，不能覆盖这四页。

## 1. 当前唯一承载文件

| 主题 | 唯一文件 | 说明 |
| --- | --- | --- |
| 业务状态、事务、审查问题、验证范围 | [`docs/changes/2026-09-29-figma-ui-governance/spec.md`](./changes/2026-09-29-figma-ui-governance/spec.md) | 本次治理的业务和验收基线 |
| 零件规则、操作约束、对齐和反馈 | [`UI_RULES.md`](./UI_RULES.md) | 不定义页面类型 |
| 五种页面模板和选型 | [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md) | 不重复定义零件尺寸 |
| 运行时 token | [`src/styles/tokens.css`](../src/styles/tokens.css) | `--kk-*` 唯一语义源 |
| 兼容别名和共享状态类 | [`src/styles/ui-tokens.css`](../src/styles/ui-tokens.css)、[`src/styles/ui-governance.css`](../src/styles/ui-governance.css) | 不得新增第二套规则 |
| 运行时模板注册表 | [`src/domain/pageTemplates.ts`](../src/domain/pageTemplates.ts)、[`src/styles/archetypes.json`](../src/styles/archetypes.json) | 只有 list/grid/detail/timeline/gallery |
| 浏览器验证 | [`docs/changes/2026-09-29-figma-ui-governance/verification.md`](./changes/2026-09-29-figma-ui-governance/verification.md) | 只记录可复现证据 |

## 2. 冲突裁决

1. 业务状态先于界面；预校验、积分冻结、任务创建和资产写入不得被 UI 绕过。
2. Figma 四页先于历史文档；`tokens.css` 先于任何局部 CSS 字面量。
3. 共享组件先于页面实例；断点只能改变布局位置和容器宽度，不能复制内部尺寸。
4. 一个页面只有一个一级模板和一个 Primary；新功能必须从五种模板中选型。
5. 无法裁决时记录为“待产品确认”，不得靠局部视觉猜测闭合。

## 3. 新功能流程

`读业务状态 → 选页面模板 → 取共享 token/组件 → 实现空/加载/错误态 → 浏览器验证`

提交前至少执行：

- `node scripts/check-ui-standards.mjs`；
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`；
- 受影响的单元和 Playwright 测试；
- 在 390、1099、1920 宽度检查文本、图标、侧栏和主操作。

## 4. 历史文件

`docs/archive/`、`docs/archive/ui-history/` 和历史 changes 目录仅用于追溯。若
历史文件与四页治理基线冲突，以本索引和治理 spec 为准，并在新变更记录中写明
裁决原因。
