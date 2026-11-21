# KK Studio UI 规范索引

本文件是 DESIGN.md 的 UI 专项索引。现行可见设计见下方 Pen 入口，历史 Figma 四页留作既有基线的溯源。

- `505:13071`：业务规则与状态矩阵；
- `505:13430`：审查问题与修复记录；
- `505:13731`：UI 基础规范；
- `505:14180`：页面类型模板配置。

它们位于 Figma 文件 `0nU0A7pq6eyjwfwm1TtWkO`。旧版页面草稿、历史 A1–A9
类型、旧字号表和旧 CSS 只作为归档证据，按下方冲突裁决使用。

## 当前 Pen 与本地交付

KK Design 当前认可的 Pen 页面和组件是可见布局、图标和状态的来源。新增或改动可见 UI 时，在本次变更包的 ui-map.yaml 登记现行 Pen 节点、路由、改动文件、共享依赖的 Git blob 和各适用平台证据。新建交付包中的 ui-map.yaml 按映射登记现行节点、源码和公共依赖的 Git blob。适用平台在同包 verification.md 使用平台和映射 ID 组成的独立小节，用证据文件一行引用同包 evidence 下的平台收据 JSON。映射中的 SHA-256 校验该文件，收据内的版本绑定由 uiEvidenceFingerprint 按 Pen 回读、路由、运行定位和映射的 Git blob 生成。现有 delivery 检查会拒绝旧交付包、过期的代码指纹与缺失的平台证据。评审通过 Pen MCP 验证节点，同时核对实际构建及证据文件。同步进度和受阻项记入同包 ui-tasks.json。旧 Figma 素材和截图的历史说明按原时点保留。

## 1. 当前唯一承载文件

本表是 UI 规则的**完整**映射。列出的每一份现行文件都在本表内；新增 UI 规范文件必须同步本表，否则以本表为准视为未生效。

### 1.1 文档层（规范性 Markdown）

| 主题 | 唯一文件 | 说明 |
| --- | --- | --- |
| 全局设计概览与机器生成 token 投影 | [`DESIGN.md`](../DESIGN.md) | 全局阅读入口，引用本表的专项规则；数值仍由 tokens.css 生成 |
| 零件规则、操作约束、对齐和反馈 | [`UI_RULES.md`](./UI_RULES.md) | 不定义页面类型 |
| 五种页面模板和选型 | [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md) | 不重复定义零件尺寸 |
| 数值（尺寸/字阶/间距/圆角）索引 | [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md) | 索引层，数值真值在 `tokens.css` |
| 颜色、主题与基础组件 | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) | 主题与基础组件用法 |
| 运行与验证（改动后如何确认生效） | [`UI_SPEC.md`](./UI_SPEC.md) | 浏览器验证与完成标准 |
| 前端工程基线（技术栈、弹窗、供应商连接） | [`FRONTEND-SPEC.md`](./FRONTEND-SPEC.md) | 只管工程约束，不管外观 |
| 业务状态、事务、审查问题、验证范围 | [`changes/2026-09-29-figma-ui-governance/spec.md`](./changes/2026-09-29-figma-ui-governance/spec.md) | 本次治理的业务和验收基线 |
| 浏览器验证证据 | [`changes/2026-09-29-figma-ui-governance/verification.md`](./changes/2026-09-29-figma-ui-governance/verification.md) | 只记录可复现证据 |

### 1.2 运行层（唯一真值在代码）

| 主题 | 唯一文件 | 说明 |
| --- | --- | --- |
| 运行时 token | [`src/styles/tokens.css`](../src/styles/tokens.css) | `--kk-*` 唯一语义源 |
| 兼容别名和共享状态类 | [`src/styles/ui-tokens.css`](../src/styles/ui-tokens.css)、[`src/styles/ui-governance.css`](../src/styles/ui-governance.css) | 不得新增第二套规则 |
| 运行时模板注册表 | [`src/domain/pageTemplates.ts`](../src/domain/pageTemplates.ts)、[`src/styles/archetypes.json`](../src/styles/archetypes.json) | 只有 list/grid/detail/timeline/gallery |

### 1.3 已合并存根（不承载现行规则，禁止更新）

| 文件 | 已并入 | 原文快照 |
| --- | --- | --- |
| [`UI-STANDARDS.md`](./UI-STANDARDS.md) | `UI_RULES.md` + `DESIGN_TOKENS.md` + `DESIGN-SYSTEM.md` | [`archive/ui-history/UI-STANDARDS-2026-09.md`](./archive/ui-history/UI-STANDARDS-2026-09.md) |
| [`UI-ALIGNMENT.md`](./UI-ALIGNMENT.md) | `UI_RULES.md` + `DESIGN-SYSTEM.md` | [`archive/ui-history/UI-ALIGNMENT-2026-09.md`](./archive/ui-history/UI-ALIGNMENT-2026-09.md) |

这两份只保留章节去向表供历史引用跳转。**不要更新它们**——更新会漏改，因为现行规则只读 1.1 表中的文件。

## 2. 冲突裁决

1. 业务状态先于界面；预校验、积分冻结、任务创建和资产写入不得被 UI 绕过。
2. 当前用户设计与已确认反馈 → 现行 Pen 节点与变体 → 注册 tokens 和共享组件。历史 Figma 用于追溯；Pen 缺项登记在本次映射，已有功能继续消费现行令牌和组件。
3. 共享组件先于页面实例；断点只能改变布局位置和容器宽度，不能复制内部尺寸。
4. 一个页面只有一个一级模板和一个 Primary；新功能必须从五种模板中选型。
5. 无法裁决时记录为“待产品确认”，不得靠局部视觉猜测闭合。

本轮裁决来源见 [用户规格](changes/2026-10-14-ui-consolidation/spec.md) 与 [ADR-017](architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md)。Atelier 截图是视觉参考，图内文字不是新的行为授权。规则仍按 §1 的唯一文件维护；原图片、Figma 节点与旧验证保留当时含义。

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

1.3 表中的两份存根属于本节范畴：它们留在原路径只为让历史章节引用不失效，
权威正文一律回到 1.1 表。
