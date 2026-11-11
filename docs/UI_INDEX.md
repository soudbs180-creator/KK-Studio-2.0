# KK Studio UI 规范索引

本文件是本地 UI 规范的**唯一导航与 Figma 五页映射入口**。**UI 设计真值在用户指定的当前 Figma Design System 与目标页面；本地文档和运行时 tokens 均从它派生。** 开工顺序由根 [`AGENTS.md` §五](../AGENTS.md#五-figma-全面同步与组件-token-化d-) 与 [`FIGMA-SYNC.md`](./FIGMA-SYNC.md) 规定：先在 Figma 完成或回读目标设计，再按单向管线同步到本地。

## Figma 权威来源与五页结构

当前权威文件：[KK Studio · 最新 UI 全量编辑稿 · 2026-10-20 / 01 · 设计规范](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/KK-Studio?node-id=91-2)，文件 key 为 `ZiadpErDoFweCjG3uHjkM3`：
- **五页职责**：`91:2`（01 · 设计规范）、`91:4`（02 · 图标与品牌）、`91:3`（03 · 组件与交互）、`2:47`（04 · 桌面页面与交互）、`91:11`（05 · 手机页面与交互）。每次 UI 任务必须读取实际目标节点、主题/视口/状态和读取时间；仅登记文件链接不算完成设计读取。
- **阶段校准与审计证据索引**（本索引不堆放带日期进度流水账，详情查阅对应交付包）：
  - [当前Figma本地同步与验证边界](changes/2026-11-05-figma-local-sync/verification.md)：UI-004，当前节点、源码、生产浏览器和Desktop证据分别登记。
  - [2026-10-28 手机聊天布局与 03 只读审计](changes/2026-10-28-figma-sync-governance/mobile-chat-layout.md)、[03 审计清单](changes/2026-10-28-figma-sync-governance/audit-03.md)、[本轮 spec](changes/2026-10-28-figma-sync-governance/spec.md)、[plan](changes/2026-10-28-figma-sync-governance/plan.md) 与 [验证](changes/2026-10-28-figma-sync-governance/verification.md)
  - [2026-10-25/26 04-05 返工规格](changes/2026-10-25-figma-04-05-rework/spec.md) 与 [验证](changes/2026-10-25-figma-04-05-rework/verification.md)
  - [2026-10-25 控件可读性修复记录](changes/2026-10-25-figma-control-readability/verification.md)

本地文档按 01 页规范章节与 03 页母版索引组织映射（具体数值见 [DESIGN_TOKENS](DESIGN_TOKENS.md#figma-目标与本地映射)）：

| Figma 章节                                                             | node ID      | 本地承载                                                                            |
| ---------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| 01 · 色彩调色板 / Color Palette                                        | `546:21`     | `DESIGN-SYSTEM.md`                                                                  |
| 02 · 排版层级 / Typography                                             | `546:134`    | `DESIGN_TOKENS.md`、`UI_RULES.md`                                                   |
| 03 · 间距比例 / Spacing Scale                                          | `546:156`    | `DESIGN_TOKENS.md`                                                                  |
| 04 · 圆角比例 / Border Radius                                          | `546:181`    | `DESIGN_TOKENS.md`                                                                  |
| 05 · 层级与深度 / Elevation & Depth                                    | `546:184`    | `DESIGN-SYSTEM.md`、`UI_RULES.md`                                                   |
| 06 · 图标与控件 / Icons & Components                                   | `546:187`    | `DESIGN-SYSTEM.md`、`UI_RULES.md`                                                   |
| 07 · 响应式行为 / Responsive Behavior                                  | `597:67456`  | `DESIGN_TOKENS.md`、`UI_SPEC.md`                                                    |
| 08 · Figma ↔ 本地编号与同步契约 / Mapping Contract                     | `1510:41557` | 本文 §3.1；逐项来源与状态放入当前变更记录                                           |
| 09 · 视觉与动效细则 / UI Mechanics                                     | `1514:90390` | `DESIGN_TOKENS.md`、`UI_RULES.md`、`src/styles/tokens.css`、`src/styles/motion.css` |
| 10 · 资源、编组与交互语义 / Resource, Grouping & Interaction Semantics | `1761:277`   | `UI_RULES.md`、`UI_SPEC.md`                                                         |
| 11 · 使用场景与本地实现协议 / Scenarios & Local Protocol               | `2000:273`   | `UI_INDEX.md`、`UI_RULES.md`、`DESIGN_TOKENS.md`、`src/styles/tokens.css`           |
| 12 · 状态、动效与骨架屏 / State, Motion & Skeleton                     | `2001:273`   | `UI_RULES.md`、`DESIGN_TOKENS.md`、`src/styles/tokens.css`、`src/styles/motion.css` |
| 03 / 00 · 按使用场景查找 · 母版索引                                    | `2002:41259` | `UI_INDEX.md`、`UI_RULES.md`                                                        |
| 03 / 00B · 本地代码对位 / 按功能查找唯一母版（145 `componentKey`）     | `2022:41388` | `UI_INDEX.md`、`UI_RULES.md`                                                        |
| 03 / 00C · 交互回归与本地迁移验收清单                                  | `2028:41424` | `UI_INDEX.md`、`UI_SPEC.md`                                                         |

2026-10-23 在线回读的当前文件为五页：`91:2` 01 设计规范、`91:4` 02 图标与品牌、`91:3` 03 组件与交互、`2:47` 04 桌面页面与交互、`91:11` 05 手机页面与交互。此前单列的 `91:5` 不再作为当前页面入口。每次 UI 任务还须读取实际目标节点、主题/视口/状态和版本或读取时间；仅登记文件链接不算完成设计读取。

旧文件 `0nU0A7pq6eyjwfwm1TtWkO` 的 `505:13071`、`505:13430`、`505:13731`、`505:14180` 在本次在线读取均不存在，退出现行来源。旧页面、字号表和 CSS 仅作追溯。文档已按新规范更新基础设计目标，运行时 CSS 和具体业务页面尚未全面迁移，不能据此宣称本地 UI 已同步。

## 1. 当前唯一承载文件

本表是 UI 规则的**完整**映射。列出的每一份现行文件都在本表内；新增 UI 规范文件必须同步本表，否则以本表为准视为未生效。

### 1.1 文档层（规范性 Markdown）

| 主题                                     | 唯一文件                                                                                                             | 说明                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 全局设计概览与机器生成 token 投影        | [`DESIGN.md`](../DESIGN.md)                                                                                          | Figma 派生说明与专项导航；YAML 由运行时 CSS 生成，不证明 Figma 同步 |
| Figma 同步管线与组件三层 Token 化规范    | [`FIGMA-SYNC.md`](./FIGMA-SYNC.md)                                                                                   | 单向同步链路、机械可逆命名、组件 Token 化 DoD 与棘轮门禁            |
| 零件规则、操作约束、对齐和反馈           | [`UI_RULES.md`](./UI_RULES.md)                                                                                       | 不定义页面类型                                                      |
| 已实现页面模板和选型映射                 | [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md)                                                                             | 五种模板是实现集合，实际结构以当前 Figma 页面为准                   |
| 数值（尺寸/字阶/间距/圆角）索引          | [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md)                                                                             | Figma 变量/样式到运行时 token 的目标映射与未迁移差异                |
| 颜色、主题与基础组件                     | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)                                                                             | 主题与基础组件用法                                                  |
| 运行与验证（改动后如何确认生效）         | [`UI_SPEC.md`](./UI_SPEC.md)                                                                                         | 浏览器验证与完成标准                                                |
| 前端工程基线（技术栈、弹窗、供应商连接） | [`FRONTEND-SPEC.md`](./FRONTEND-SPEC.md)                                                                             | 只管工程约束，不管外观                                              |
| 业务状态、事务、审查问题、验证范围       | [`changes/2026-09-29-figma-ui-governance/spec.md`](./changes/2026-09-29-figma-ui-governance/spec.md)                 | 本次治理的业务和验收基线                                            |
| 浏览器验证证据                           | [`changes/2026-09-29-figma-ui-governance/verification.md`](./changes/2026-09-29-figma-ui-governance/verification.md) | 只记录可复现证据                                                    |

### 1.2 运行层（Figma 设计的本地实现）

| 主题                 | 唯一文件                                                                                                                       | 说明                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| 运行时 token         | [`src/styles/tokens.css`](../src/styles/tokens.css)                                                                            | `--kk-*` 唯一运行时注册处，设计取值来自 Figma |
| 组件与母版同步映射表 | [`design/figma-component-map.json`](../design/figma-component-map.json)                                                        | Figma 节点 ↔ 本地组件 ↔ Token 前缀 ↔ 五态同步状态 |
| 兼容别名和共享状态类 | [`src/styles/ui-tokens.css`](../src/styles/ui-tokens.css)、[`src/styles/ui-governance.css`](../src/styles/ui-governance.css)   | 不得新增第二套规则                            |
| 运行时模板注册表     | [`src/domain/pageTemplates.ts`](../src/domain/pageTemplates.ts)、[`src/styles/archetypes.json`](../src/styles/archetypes.json) | 只有 list/grid/detail/timeline/gallery        |

### 1.3 已合并存根（不承载现行规则，禁止更新）

| 文件                                   | 已并入                                                  | 原文快照                                                                                     |
| -------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`UI-STANDARDS.md`](./UI-STANDARDS.md) | `UI_RULES.md` + `DESIGN_TOKENS.md` + `DESIGN-SYSTEM.md` | [`archive/ui-history/UI-STANDARDS-2026-09.md`](./archive/ui-history/UI-STANDARDS-2026-09.md) |
| [`UI-ALIGNMENT.md`](./UI-ALIGNMENT.md) | `UI_RULES.md` + `DESIGN-SYSTEM.md`                      | [`archive/ui-history/UI-ALIGNMENT-2026-09.md`](./archive/ui-history/UI-ALIGNMENT-2026-09.md) |

这两份只保留章节去向表供历史引用跳转。**不要更新它们**——更新会漏改，因为现行规则只读 1.1 表中的文件。

## 2. 冲突裁决

1. 业务状态先于界面；预校验、积分冻结、任务创建和资产写入不得被 UI 绕过。
2. 当前用户意图 → 当前已确认 Figma Design System 与目标页面 → 本地派生规范 → tokens/共享组件/页面实现。新反馈先落实到 Figma，再向本地同步；实现、旧规范和旧截图不能反向覆盖设计。
3. 共享组件先于页面实例；断点只能改变布局位置和容器宽度，不能复制内部尺寸。
4. 页面结构与组件选型以当前 Figma 为准；现有五种模板是本地已实现集合，不能作为拒绝新设计的依据。需要扩展时先完成 Figma 模板，再同步注册表、共享组件与本地文档。
5. 无法裁决时记录为“待产品确认”，不得靠局部视觉猜测闭合。

先前裁决来源见 [用户规格](changes/2026-10-14-ui-consolidation/spec.md) 与 [ADR-017](architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md)，保留其当时范围，视觉条目需按当前 Figma 重新核对。设计系统与页面实例矛盾时先在 Figma 消解，再更新本地；安全、数据和无障碍约束仍有效。截图文字不是新的行为授权。

## 3. 新功能流程

`读业务契约和本地规范 → 读取当前 Figma → 在 Figma 完成目标页面/组件/状态 → 回读并登记设计来源 → 同步本地规范与 token 映射 → 共享组件/页面实现 → 同状态运行验证`

本地同步沿用 Figma 的概念、命名和规范章节组织，按 §1 的文件职责落位；视觉规则、token 值或模板与 Figma 冲突时更新派生内容并记录替代依据，不保留两套现行视觉标准。设计未定义的状态或断点先补在 Figma，不在代码中自行定稿。纯工程条目保留本地承载。

`npm run design:sync` 的现有作用仍是 **CSS → DESIGN.md YAML**，只同步运行时投影；执行前须先完成 Figma → 本地 token 的映射。它不读取或修改 Figma，`design:check` 通过也不证明设计一致。

提交前至少执行：

- `node scripts/check-ui-standards.mjs`；
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`；
- 受影响的单元和 Playwright 测试；
- 在 390、1099、1920 宽度检查文本、图标、侧栏和主操作。

### 3.1 编号、平台归属与同步记录

设计来源：[01 / 08 · 编号与同步契约](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/KK-Studio?node-id=1510-41557)，2026-10-23 在 Figma 创建、补充并截图核验。以下是该规则的本地投影，不代表 04、05 或本地 UI 已完成。

- 优先复用已有功能编号、动作键和页面状态 ID；缺少设计映射编号时使用 `KK-<归属页>-<领域>-<三位序号>`，如 `KK-04-CANVAS-001`。编号分配后永久保留，页面改名/排序不重编，删除后不复用。已有 `FEAT-*`、动作键和快捷键 ID 保持原语义。
- 每项必须登记稳定编号、已有动作键、Figma 文件 key、页面与场景节点、源母版/变体、平台归属、主题/视口、适用状态、本地文件/组件/定位方式、核验日期、证据和同步状态。多个实例共用一个语义编号时逐一列出实例；不同业务动作即使长得相同，也不能合成一个编号。
- Figma 节点 ID 必须连同文件 key 保存；失效时记录旧→新替代关系，不能根据数字相似度配对。`data-node-id` 同时存在历史设计锚点和运行时画布对象用途；禁止批量替换，更不能重编 `CanvasNodeFrame` 的 `item.id`。
- 01 定义规则/变量，02 管图标，03 管基础与组合母版，04 管桌面组合/交互，05 是手机端与网页手机端共用的手机 UI 目标。共用源保持同一引用；网页缩窄按桌面→平板→手机适配，不另建手机网页设计。现有 `mobile/` 已有 `react-native-web` 入口，平台适配与业务能力可以不同，不能据此维护两套手机 UI。修改共享源须回查既有引用；手机独立优化暂停时只做规则一致性检查。
- 默认、悬浮、按下、持续选中、键盘焦点和禁用逐态核对；不适用状态标记 N/A 并给出原因。纯触控操作不能依赖 hover 提示；加载、错误、成功等业务态单列。浅色/深色以及弹窗、输入框、工具栏等容器场景分别核验，不用单个截图替代。
- 母版继承验收包含目录样例、完整组合内部的嵌套实例和页面实例，不得只统计页面直系INSTANCE。实际修改并恢复公共本体与单态配置，分别检查布局参数、可见底板/向量和展示边界；仅有属性名或图标跟随不能证明组件完整可用。
- 每项依次为「设计待修 → FIGMA_READY → LOCAL_PENDING → SYNCED → RUNTIME_VERIFIED」。只有该项的 Figma 源、组合上下文及适用状态核验后才允许对应本地 UI 修改；规则页写完、实例可找到母版、静态检查通过均不代表达到 FIGMA_READY。源设计发生变化后，受影响记录退回待核验，保留此前证据的日期与范围。
- 先整理 04：页面框架 → 画布/对话输入 → 菜单/弹窗/面板 → 任务/选择状态。边修边登记，逐项交付；05 后续单独检查触控、导航、布局与交互差异。当前记录见 [2026-10-23 规则与 04 核查](changes/2026-10-23-figma-04-mapping/verification.md)。

当前控件类型以用户2026-10-26纠正为准：只有标题页签940:24897使用无底色、同字色同字重的单一细底线；普通按钮、持久选择和容器内选择组2538:48403不使用标题下划线。素材库732:37005的16个完整状态、参数/模型能力/Agent分类已先在Figma纠正，再同步本地样式。局部运行通过不代表01→05整体或原生已验收，详见[当前规格](changes/2026-10-25-figma-04-05-rework/spec.md)。

## 4. 历史文件

`docs/archive/`、`docs/archive/ui-history/` 和历史 changes 目录仅用于追溯。若
历史文件与当前 Figma 冲突，按 §2 裁决，并在新变更记录中写明来源、替代范围与原因；历史证据不改写为当前同步结果。

1.3 表中的两份存根属于本节范畴：它们留在原路径只为让历史章节引用不失效，
权威正文一律回到 1.1 表。
