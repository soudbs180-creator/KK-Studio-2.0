# Figma 同步与组件 Token 化规范

本文件是「Figma → 本地 Token → 组件」同步链路与组件 Token 化的**唯一规范**。根 [AGENTS.md](../AGENTS.md) 的 `D-*` 条款引用本文件；视觉数值不在本文件定义，数值真值永远在当前 Figma。登记入口见 [UI_INDEX](UI_INDEX.md)。

## 1. 真值链（单向，不可反转）

```text
Figma 01 页 Variables / Text Styles / Effect Styles   ← 唯一设计真值
   │ npm run figma:audit:pull（FIGMA_TOKEN 只从环境读取）
   ▼
docs/reference/figma-snapshots/<source>--<label>.json  ← 原始快照（只读证据）
   │ npm run tokens:export -- --snapshot <快照>
   ▼
design/tokens/figma.tokens.json                         ← DTCG 规范化快照（入库、可 diff）
   │ npm run tokens:css（生成，不手改）
   ▼
src/styles/tokens.figma.css → src/styles/tokens.css     ← 运行时唯一注册处（--kk-*）
   │ npm run design:sync（现有，CSS → YAML）
   ▼
DESIGN.md YAML 投影                                     ← 派生视图
   ▼
组件 CSS / TSX                                          ← 只能 var(--kk-语义/组件)
```

- **D-SYNC-01**：方向只能自上而下。禁止先改 CSS/组件再回填 Figma 当依据；禁止手改生成文件（`figma.tokens.json`、`tokens.figma.css`、`DESIGN.md` YAML）。
- **D-SYNC-02**：同一个值只能有一个注册处。`src/styles/tokens.json`（Ardot 历史来源）已退役，不得恢复为任何运行时或工具输入。
- **D-SYNC-03**：Figma 读取失败（无权限、节点失效、桌面端未选中图层）时记录缺口与 `BLOCKED` 原因，暂停依赖该设计的本地 UI 修改；不得套用旧本地值并宣称已同步。
- **D-SYNC-04**：首个真实快照被采纳前，`tokens.css` 仍为人工映射区；采纳后，Figma 已覆盖的变量必须迁入生成区，人工区只保留 Figma 未覆盖的纯工程 token（必须标注 `/* eng-only: 原因 */`）。

## 2. 三层 Token 模型

| 层 | Figma 集合 | CSS 形态 | 谁能消费 | 允许的取值 |
|---|---|---|---|---|
| Tier 1 Primitive | `primitive` | `--kk-gray-900`、`--kk-space-4` | 只限 `tokens*.css` 内部 | 字面值 |
| Tier 2 Semantic | `semantic`（模式：dark / light） | `--kk-surface-container`、`--kk-text-secondary` | 全部业务代码 | 引用 Tier 1 |
| Tier 3 Component | `component` | `--kk-<组件>-<部件>-<属性>[-<状态>]` | 对应组件 | 引用 Tier 2（必要时 Tier 1），**禁止字面值** |

- **D-TOKEN-01 分层**：高层只能引用低层；Tier 1 不得引用 Tier 2/3，Tier 2 不得引用 Tier 3。`tokens.css` 的 `:root` 必须按 Tier 1 → Tier 2 → Tier 3 分区，分区之外不得出现声明。
- **D-TOKEN-02 业务禁用原始层**：`src/components/**`、`src/features/**`、页面 CSS 不得直接 `var()` Tier 1。
- **D-TOKEN-03 命名机械可逆**：Figma 变量路径去掉首段集合名后，`/` 换成 `-`、加 `--kk-` 前缀，即为 CSS 变量名。例：`component/button/primary/bg/hover` ⇄ `--kk-button-primary-bg-hover`。只允许小写字母、数字和 `-`；脚本 `scripts/design-tokens/naming.mjs` 是唯一转换实现，禁止人工翻译。
- **D-TOKEN-04 状态后缀固定**：`default`（省略）、`hover`、`active`、`selected`、`disabled`、`focus`；业务态用 `loading`、`error`、`success`。不得发明同义词（如 `pressed`、`on`、`checked` 作后缀）。
- **D-TOKEN-05 主题与密度**：主题只切换 Tier 2 的取值（`[data-theme]`、`[data-accent]`），密度只切换尺寸语义（`[data-density]`）；Tier 3 不得按主题重复定义。

## 3. 组件 Token 化完成定义（DoD）

一个共享组件只有同时满足下列各项，才可在映射表中标为 `SYNCED`：

1. 已在 [`design/figma-component-map.json`](../design/figma-component-map.json) 登记：稳定 ID、Figma `fileKey` + `nodeId`（有则加 `componentKey`）、本地路径、token 前缀、状态、核验日期。
2. 拥有自己的 Tier 3 token 块（前缀与映射表 `tokens` 一致），且块内只有 `var()` 引用。
3. 该组件的 CSS/TSX 中，颜色、圆角、间距、字号、字重、行高、阴影、z-index、动效时长与缓动全部为 `var(--kk-*)`；行内 `style` 只允许传入运行时动态几何（拖拽坐标、画布缩放等）。
4. Figma 变体属性 ⇄ React props ⇄ `data-*` 属性一一对应，名称相同（如 Figma `size=sm` ⇄ `size="sm"` ⇄ `data-size="sm"`）。
5. 六态（default / hover / active / selected / disabled / focus）全部消费同一族 token；不适用状态在映射表 `notes` 写明 N/A 与原因。
6. 浅色/深色、各强调色与 390 / 1099 / 1920 宽度下的同状态截图证据，满足后才可推进到 `RUNTIME_VERIFIED`。

## 4. 同步状态（映射表 `status` 字段）

| 机器值 | 含义 | 进入条件 |
|---|---|---|
| `DESIGN_PENDING` | 设计待修 / 待核验 | 新登记、Figma 源变化或缺失 |
| `FIGMA_READY` | Figma 源、组合上下文与适用状态已回读核验 | 有回读日期与节点 |
| `LOCAL_PENDING` | 待本地同步 | Figma 就绪、本地尚未迁移 |
| `SYNCED` | 本地已按 §3 第 1–5 项完成 | 门禁全绿 |
| `RUNTIME_VERIFIED` | 同状态浏览器证据通过 | `evidence` 指向可复核证据 |

Figma 源变化后，受影响条目退回 `DESIGN_PENDING`，保留旧证据的日期与范围。只有 `FIGMA_READY` 及之后的条目允许修改对应本地 UI。

## 5. 门禁（`npm run tokens:check`，已并入 `ui:check`）

| 检查 | 失败条件 | 存量 |
|---|---|---|
| 分层 | 违反 D-TOKEN-01；Tier 3 含字面值；分区外声明 | 棘轮 |
| 原始层泄漏 | 业务文件 `var()` 引用 Tier 1（D-TOKEN-02） | 棘轮 |
| 漂移 | `figma.tokens.json` 存在时，同名 CSS 变量取值与快照不同或缺失 | 棘轮 |
| 映射表 | schema 不合法、路径不存在、token 前缀未注册、`RUNTIME_VERIFIED` 缺证据 | 严格 |
| 历史来源 | `src/styles/tokens.json` 重新出现 | 严格 |

`scripts/check-ui-standards.mjs` 另外负责：颜色字面量（含 `global.css`，不再整体豁免）与裸 `px` 数量棘轮。

**棘轮规则**：存量记在 `config/design-token-baseline.json` 与 `config/ui-legacy-baseline.json`，只允许下降。清理后运行 `npm run tokens:tighten` / `node scripts/check-ui-standards.mjs --tighten` 收紧基线；任何人不得为了通过门禁上调基线、扩大豁免或关闭检查。合流时若上游合法新增了 token 文件结构，必须在 review 中写明原因并单独提交基线变化。

## 6. 工作流

1. 读当前 Figma 目标节点（MCP `get_design_context` / `get_variable_defs`，或 `figma:audit:pull`），记录 fileKey、nodeId、读取时间。
2. 设计缺失或冲突 → 先在 Figma 修改并回读；不在代码中定稿。
3. 变量有变化 → 拉快照 → `tokens:export` → `tokens:css` → `design:sync`，审查 diff。
4. 组件迁移 → 更新映射表状态 → 只用 Tier 2/3 token 实现。
5. `npm run typecheck && npm run lint && npm test && npm run ui:check`，UI 改动另按 [UI_SPEC](UI_SPEC.md) 做同状态浏览器验证。


## 7. 双轨并行研发契约（Dual-Track UI & Function Protocol）

为支持多 Agent 在不同平台（Cursor / Claude / Web）无缝并行推进，且在「上下文丢失」后依然能完全基于仓库事实自主恢复，确立以下双轨并行契约：

```mermaid
flowchart TD
    User["PO / 设计师 (在 Figma 推敲视觉并注明白话功能)"]
    User --> Gate{"设计与AI绘图先行门禁<br/>(Figma Co-Design & PO Review Gate)"}
    
    subgraph 轨道A：视觉与呈现 [Track UI]
        Gate -->|"Figma 视觉就绪"| UI1["读取 Figma 节点与 Tokens"]
        UI1 --> UI2["构建纯呈现组件 TSX + CSS<br/>(绑定 data-figma-node，暴露事件 Props)"]
        UI2 --> UI3["记录至 ui-motion.md"]
    end

    subgraph 轨道B：功能与业务 [Track Logic]
        Gate -->|"解析按钮功能语义"| Logic1["编写业务 Hook / API 适配器"]
        Logic1 --> Logic2["底层出图/模型调用/状态流转验证"]
        Logic2 --> Logic3["记录至 memlog.md"]
    end

    UI3 & Logic3 --> Merge["容器层组装合流 (Container / Page)<br/>UI Props ⇄ Logic Hook"]
    Merge --> Verify["自动化门禁 + 视觉核验 (SYNCED)"]
```

### 7.1 Figma 原生注解规约（面向 PO 与多 Agent 识别）
用户在 Figma 选中按钮、组件或弹窗时，在右侧 **`Description`** 或 **`Dev Mode Annotation`** 中使用标准大白话注明三要素：
- **`功能`**：点击后的业务动作（如：`触发后台出图，调用 sub2api 网关` 或 `仅本地切换侧边栏展开`）。
- **`表现`**：交互状态（如：`按钮内转菊花 Loading，置灰不可点，错误边框变红`）。
- **`状态`**：`READY`（已定稿可做）/ `DRAFT`（仅供视觉参考未定）/ `TODO`（代码有该功能但 Figma 待补图）。

### 7.2 上下文断层防护（Context-Loss Resilience）
任何 Agent 在上下文清空或换新平台时，**严禁凭空盲写**，按以下固定链条恢复：
1. 查阅 [`docs/governance/ai-memory/ui-motion.md`](governance/ai-memory/ui-motion.md) 当前切片的最新交接；
2. 查阅 [`design/figma-component-map.json`](../design/figma-component-map.json) 获取各组件的 Figma `nodeId` 与同步状态；
3. 按照组件标注的 `data-figma-node`，通过 Figma MCP 回读最新视觉树与 Description，瞬时接续开发。
