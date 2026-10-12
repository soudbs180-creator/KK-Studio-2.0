# Intent：输入焦点与次级选中态收敛

- Task ID：TASK-UI-FOCUS-20261010
- 状态：IMPLEMENTED
- 日期与提出者：2026-10-10，用户
- 请求来源：用户反馈首页/对话输入框紫色外圈影响观感，要求浅色中性高亮，并要求检查同类 UI 问题。
- 用户授权范围与依据：用户回复“开始吧”，授权按已确认的短设计实现。
- 关联账本、spec、plan：无新增产品功能；UI_INDEX、UI_RULES、DESIGN-SYSTEM、DESIGN_TOKENS。

## 用户原意

输入文字时输入框周围的紫色高亮过于夸张，普通选择也不需要强烈颜色；相似的 UI 状态应一起处理，重点状态才使用醒目颜色。

## AI 工程转译

为输入类控件建立独立的主题中性弱焦点层级，保留按钮和关键状态的醒目焦点/强调色；将首页和对话 Composer、搜索、设置、对话控制、阶段表单以及已审计的次级选中态统一到相同层级，不改变提交、菜单、连接和生成业务行为。

## 目标与非目标

- 预期结果：输入框聚焦只显示细的浅色中性边界，次级选择不再整块高饱和，Primary/关键状态仍清晰可识别。
- 包含范围：运行时 token、全局输入焦点、Composer/搜索/设置/对话/阶段表单、Provider 连接项、评论区选择、插件节点和连接目标叠加态，以及对应浏览器断言和规范记录。
- 明确不包含：竞品品牌色复制、生成/Provider/协作能力、新的交互流程、Tauri 发布包和用户现有安装包替换。
- 受影响平台/模块：共享 Web/Desktop UI 源码；本轮未宣称 Desktop WebView2 验收。
- 已有实现和规范来源：`docs/UI_INDEX.md`、`docs/UI_RULES.md`、`docs/DESIGN-SYSTEM.md`、`src/styles/tokens.css`、`src/styles/composer.css`。

## 验收条件

| ID   | 用户可观察结果                                                | 技术证据/检查                                                                              | 适用平台            |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| AC-1 | 首页和对话输入聚焦时不再出现 2px 紫色外圈                     | `tests/browser/input-contract.spec.ts`：390/834/1440 均断言 1px 且绑定弱焦点 token         | Web/Desktop 共享 UI |
| AC-2 | 搜索、设置和普通表单输入焦点层级与 Composer 一致              | `design-system-pages.spec.ts`、`design-system.spec.ts` 通过；computed style/对比度断言通过 | Web                 |
| AC-3 | 次级选择和选中节点不整块使用醒目 accent，关键连接状态仍可辨认 | `task-workbench.css`、`plugin-nodes.css`、`canvas-actions.css` 样式审查及 UI 标准检查      | Web/Desktop 共享 UI |
| AC-4 | 业务提交、菜单和状态行为不变                                  | Composer/input-contract 全量 9/9；类型、lint、治理和格式检查                               | Web/Desktop 共享 UI |

## 假设、风险和决策

- FACT（直接证据）：Composer 的原焦点规则为 2px 紫色 outline；UI 规则要求选择态优先使用描边/selection token。
- INFERENCE（假设及风险）：中性弱焦点需要满足键盘可见性，因此保留 1px outline 并由设计系统浏览器测试验证对比度。
- UNKNOWN / CONFLICT：当前设计系统插件卸载 fixture 在本工作树仍有 2 个超时；与本次 CSS 改动无代码路径关系，保持未验证。
- AI 自主决定的技术事项及理由：新增独立弱焦点 token，避免把全局强 focus ring 改成低对比而影响 Primary/键盘操作；连接目标保留 accent，仅降低与选中态叠加时的第二层 ring。
- 必须由用户决定的产品语义/范围事项：无；最终视觉舒适度仍需用户在运行版本中验收。
- 外部条件、费用或不可逆动作及已有授权：无；未访问外部 Provider、账号或发布系统。
- 不在本次范围的问题与账本 ID：Desktop fresh release、Tauri WebView2、插件 fixture 超时及其他 UI 细节，按现有任务状态保留。
