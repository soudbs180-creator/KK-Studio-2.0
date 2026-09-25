# UI 规范索引（唯一入口）

> 本文件是 **UI 规范唯一入口**。任何 UI 相关问题先到这里，再跳到**唯一承载该主题的文件**。
> **设计原则：一件事只有一处定义。** 任何文件都不得复制另一文件里的数值、规则或清单；
> 需要引用时写「见 `xxx.md` §n」，不写第二份。

---

## 1. 文件分层

状态只有三种：**现行**（可改，唯一权威）、**只读**（历史/证据，禁改）、**机器可读**（由代码或画布生成，禁用）。

### 1.1 现行（唯一权威，改这里）

| 文件 | 唯一负责主题 | 不要在这里定义什么 |
|---|---|---|
| [`UI_INDEX.md`](./UI_INDEX.md) | 索引、裁决规则、改病例 | 任何数值 / 规则正文 |
| [`UI_RULES.md`](./UI_RULES.md) | **零件规则**：状态机、控件档位、图标、字号、间距、圆角、层级、对齐、交互约束、画布控件、门禁 | 数值取值表（属 Token）、页面布局 |
| [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md) | **页面类型**：A1–A9 布局结构、组件形态、交互方式、三态、路由决策树 | 零件档位（属 UI_RULES） |
| [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md) | **数值**：三层 Token 架构、字阶 9 档、控件五族、间距双标尺、圆角 9 档、层级/阴影/z-index | 交互规则、页面布局 |
| [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) | **颜色与基础组件**：语义色表、8 种强调色、状态色配对、组件用法表、三档响应式、创作输入框契约 | 字阶 / 间距 / 圆角数值（属 DESIGN_TOKENS） |
| [`UI_SPEC.md`](./UI_SPEC.md) | **运行与验证**：运行来源核对、设计读取流程、浏览器验证、完成标准 | 任何样式数值或交互规则 |

### 1.2 只读归档（禁改，仅溯源）

| 文件 | 内容 | 去向 |
|---|---|---|
| [`archive/ui-history/UI-STANDARDS-2026-09.md`](./archive/ui-history/UI-STANDARDS-2026-09.md) | 原 UI-STANDards §0–§13 全部历史专项 | 现行条款已并入 UI_RULES |
| [`archive/ui-history/UI-ALIGNMENT-2026-09.md`](./archive/ui-history/UI-ALIGNMENT-2026-09.md) | 原 UI-ALIGNMENT 交互核对记录 | 现行条款已并入 UI_RULES |
| [`archive/ui-history/UI-SPEC-2026-09-10-11.md`](./archive/ui-history/UI-SPEC-2026-09-10-11.md) | 原 UI_SPEC 日期流水账 | 现行流程保留在 UI_SPEC |
| [`archive/ui-history/FRONTEND-SPEC-2026-09.md`](./archive/ui-history/FRONTEND-SPEC-2026-09.md) | 原 FRONTEND-SPEC 交互与几何记录 | 现行契约已并入 UI_RULES |
| `archive/progress-before-consolidation-*.md` | 整合前进度 | 原样只读 |

### 1.3 机器可读（由代码/画布生成，手写无效）

| 文件 | 生成方式 | 说明 |
|---|---|---|
| `src/styles/tokens.css` / `tokens.json` | Ardot 画布变量候选导出，在线回读尚未核实 | **未导入运行态**；已知与现行色表/外壳值冲突，见本次 [`架构核对`](./changes/2026-09-24-ui-regression/architecture-audit.md) |
| `src/styles/archetypes.css` / `archetypes.json` | 手写候选，必须随 UI_ARCHETYPES.md 同步 | **未导入运行态**；是 UI_ARCHETYPES 的候选代码形态 |
| `src/styles/global.css` | 手写，颜色主题真源 | 新增颜色只能进这里 |
| `src/styles/ui-tokens.css` | 当前运行态的手写 token 层 | 目标是兼容别名层；尚未迁移，不得声称已经只包含映射 |

---

## 2. 冲突裁决规则（谁赢）

多份文件给出不同数值时，按下列顺序裁决，**不要自行挑一个改**：

1. **画布 > 文档**：Ardot `Design System`（fileId `728457371665311`）变量是最终真源。
   任何文档与画布数值冲突 → 以画布为准，并回写文档。
2. **已核实的机器可读 > 手写文档**：完成画布回读与色表核对后，`tokens.css` / `tokens.json` 才可覆盖 Markdown 中的数值。当前候选未达到此条件，不进入运行态。
3. **现行 > 历史**：本章 §1.1 覆盖 §1.2。
4. **同层冲突未决 → 停在这，报给用户**，不在文档里各写一套。

### 2.1 已裁决的冲突（本次收敛）

| 主题 | 旧冲突 | 裁决 | 依据 |
|---|---|---|---|
| 字阶 | DESIGN-SYSTEM 1.3 的 5 级（11/12/14/16/24）vs DESIGN_TOKENS v2.0 的 9 档（11…48） | **以 DESIGN_TOKENS 9 档为准**；DS 1.3 字阶作废，仅历史可查 | 9 档包含 5 级全部字号，且对齐 KK-Type 变量组 |
| 控件高度 | UI_SPEC 7 档（20/24/28/32/36/40/44）vs UI_RULES 4 档（28/32/40/44），且两表参数已漂移 | **v3.0 按族分档**：`icon`/`button`/`field`/`chip`/`shell` 五族共用封闭高度轴 20/24/28/32/40/44 | `DESIGN_TOKENS.md` §4；归位方案 `UI_RULES.md` §10.2 |
| 圆角 | DS 1.3 五档 vs DESIGN_TOKENS 九档 | **以 DESIGN_TOKENS 九档 + 嵌套公式为准** | 九档含五档，且解决嵌套同值问题 |
| 颜色 | `global.css` / `ui-tokens.css` / `tokens.css` 三套 | `global.css` 当前为运行颜色真源；`tokens.css` 的冲突颜色暂不接线，`ui-tokens.css` 别名化待同步 | §1.3 |

### 2.2 仍未决（待用户拍板，勿私自改）

- **越界值归位**：`UI_RULES.md` §10.2 的映射表已定，但执行会改变实际渲染尺寸（视觉变更），
  需确认后才改代码。
- **画布变量同步**：新档位体系需要把 `KK-Control` 变量组从 4 档扩到 5 族 18 档，
  才能走"画布 → 导出 → tokens.css"的正路。不扩的话，档位只活在文档里，代码仍用 `--ui-*`。
- **候选值冲突**：外壳、菜单项和候选次级文字色与当前运行态冲突；逐项证据见 [`架构核对`](./changes/2026-09-24-ui-regression/architecture-audit.md)。

---

## 3. 新增功能的标准流程（改病例）

```
① 定类型  →  ② 取布局  →  ③ 选零件  →  ④ 取数值  →  ⑤ 验证
```

| 步 | 查哪里 | 产出 |
|---|---|---|
| ① 定类型 | [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md) §3 路由决策树 | A1–A9 之一，或"新类型申请" |
| ② 取布局 | [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md) §2 类型表 + `src/styles/archetypes.css` | 容器 / 栅格 / 列宽 |
| ③ 选零件 | [`UI_RULES.md`](./UI_RULES.md) §1 状态机、§7 组件契约 | 用哪个组件、什么档位 |
| ④ 取数值 | [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md) + `tokens.css` | 字号 / 间距 / 圆角 / 层级 |
| ⑤ 验证 | [`UI_SPEC.md`](./UI_SPEC.md) 浏览器验证 + [`UI_RULES.md`](./UI_RULES.md) §9 自查清单 | `npm run ui:check` + 同状态截图 |

**红线**：①–④ 任一步跳过 → 产出的界面就是"又一次自创风格"。

---

## 4. 更新规则（防止再次漂移）

1. **改数值**：先在画布改变量 → 重新导出 `tokens.css` / `tokens.json` → 再改 `DESIGN_TOKENS.md`。
   禁止在下游手写覆盖。
2. **改规则**：只改 `UI_RULES.md` / `UI_ARCHETYPES.md`。其他文件**只改引用，不复制内容**。
3. **发现旧文件里有规则**：不要就地更新，把它移进本文 §1.2 的归档目录，并在原处留指针。
4. **引用一律用相对路径 + § 号**，禁止写裸数值（"圆角 10" 可以，"圆角 12" 不行）。
5. **禁止**用"这页看起来需要 30px"作为新增档位的理由——先补规则再改界面。

---

## 5. 速查

| 我要… | 去 |
|---|---|
| 查某个组件多高多圆角 | `UI_RULES.md` §7 组件契约 + `DESIGN_TOKENS.md` §4 档位表 |
| 查该选哪个档（族 / 档位选择） | `UI_RULES.md` §2.1 选档四问 |
| 查某个旧尺寸该归到哪一档 | `UI_RULES.md` §10.2 归位映射表 |
| 查嵌套圆角怎么算 | `UI_RULES.md` §4.2 嵌套公式 |
| 查某颜色在浅色下是什么 | `DESIGN-SYSTEM.md` §颜色与主题 |
| 查强调色有几种 | `DESIGN-SYSTEM.md` §8种强调色 |
| 查这个页面该做成什么类型 | `UI_ARCHETYPES.md` §3 决策树 |
| 查某个界面的历史测量（Figma 原稿坐标） | `archive/ui-history/` |
| 查改动后怎么验 | `UI_SPEC.md` §浏览器验证 |
| 查这次改动会不会违反门禁 | `UI_RULES.md` §8 禁止清单 |

---

## 6. 变更记录

| 日期 | 版本 | 内容 |
|---|---|---|
| 2026-09-22 | v1 | 建立本索引；UI-STANDARDS / UI-ALIGNMENT / UI_SPEC 现行条款并入 UI_RULES v2.0；历史正文归档 |
