# KK-Studio-2.0 · UI Token 体系 v2.0

> **权威来源**：Ardot 画布 `Design System 设计系统`（fileId `728457371665311`）。
> [`src/styles/tokens.css`](../src/styles/tokens.css)、[`src/styles/tokens.json`](../src/styles/tokens.json) 是画布变量候选导出；在线回读尚未核实，且当前与运行色表及部分外壳值冲突，**尚未导入应用**。差异见 [`架构核对`](./changes/2026-09-24-ui-regression/architecture-audit.md)。核实前本文描述目标档位，不能把候选文件存在当作运行态已统一。
> 本文管「**数值**」；运行态与验证见 [`UI_SPEC.md`](./UI_SPEC.md)，规则与约束见 [`UI_RULES.md`](./UI_RULES.md)，索引见 [`UI_INDEX.md`](./UI_INDEX.md)。
> 改 token 必须回画布改变量后重新导出，禁止在下游手写覆盖。
>
> **本文范围（防止重复定义）**
> 全文只出现**数值表与 token 名**。规则（能不能用、用在哪）在 [`UI_RULES.md`](./UI_RULES.md)；
> 颜色语义与主题在 [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)。**禁止在别处复制本文的表。**

---

## 0. 我们从大厂学了什么（v2.0 的三处改动依据）

| 学到的方法 | 出处 | 我们之前的病 | v2.0 怎么改 |
|---|---|---|---|
| **三层 Token 架构**：原始 → 语义 → 组件，高层只能引用低层 | Brad Frost / Nathan Curtis / TDesign / Adobe Spectrum 通用做法 | 只有两层且混用，组件各自 ⇢ 直接拼原始值 ⇢ **按钮和输入框各做各的** | 新增 **Tier 3 组件层**（`--kk-button-*` / `--kk-input-*`），组件不许再自己拼值。变样式只改低层，组件代码不动 |
| **嵌套倒角公式**：`外圆角 − 内边距 = 内圆角` | Material 3 官方 Shape 规范（optical roundness） | 卡片里塞控件，圆角靠感觉调，两层圆角经常相同 → 视觉发"歪" | 圆角扩到 9 档，**规定容器内边距只用 8/16/24**，保证嵌套永远有解（见 §6） |
| **间距分两套**：组件内一套，页面/容器一套 | Shopify Polaris（20/28/56/80）、Material 3 4dp 网格 | 一个「间距刻度」既用于按钮内距又用于页面分区 → 大处不够、小处太松 | 拆出 **KK-Layout**：`layout-gutter-*` + `container-pad-*`（16/24/40 响应式），见 §5 |

其余对齐手段（8 种强调色、双主题、密度切换）沿用业界「主题在语义层替换」的通行做法。

---

## 1. 三层 Token 架构

```
Tier 1 原始层 PRIMITIVE      #161616 / 8px / 13px / 400      ← 纯数值，业务代码禁止直接消费
        ↓ 只能向下引用（禁止反向）
Tier 2 语义层 SEMANTIC       bg-surface / space-4 / control-h-md  ← 主消费层；主题·密度·强调色只改这里
        ↓
Tier 3 组件层 COMPONENT      --kk-button-h / --kk-input-h / --kk-menu-item-h  ← 组件唯一取值入口
```

**四条铁律**
1. 高层只能引用低层，**禁止反向引用**。
2. **Tier 1 禁止出现在业务代码**——出现即视为缺 Tier 2/3 定义，先补 token 再用。
3. **Tier 3 是组件的唯一入口**，同一语义的组件必须消费同一个 Tier 3 token。
4. 主题 / 强调色 / 密度切换**只允许 override Tier 2**，不许逐个组件改。

---

## 2. 层级控制（Hierarchy）

层级不能靠"随手调个灰色"来表达。四个维度，各自有刻度：

### 2.1 表面层级（4 级，必须逐级递进）
`bg-app` → `bg-surface` → `bg-card` → `bg-elevated`

- **禁止跳级**：不允许 app 上直接放 elevated。
- **同一容器内最多出现 2 级表面**。
- 选中态用 `neutral-selected`，不要用背景层级冒充选中。

### 2.2 浮起层级（阴影 3 级 + z-index 7 档）

| 层级 | token | 用途 |
|---|---|---|
| 0 | `--kk-elevation-0` | 平面卡片、列表项 |
| 1 | `--kk-elevation-1` | 悬停浮起、下拉菜单 |
| 2 | `--kk-elevation-2` | 侧栏面板、工具条浮层 |
| 3 | `--kk-elevation-3` | 弹窗、二级抽屉 |

阴影颜色随主题走（`shadow-color` / `shadow-color-strong`），**不允许写死 `rgba(0,0,0,x)`**。

| z-index token | 值 | 用途 |
|---|---|---|
| `z-base` | 0 | 默认流 |
| `z-sticky` | 10 | 表头吸顶 |
| `z-sticky-header` | 20 | 一级导航吸顶 |
| `z-dropdown` | 100 | 下拉菜单 |
| `z-overlay` | 200 | 遮罩 |
| `z-modal` | 300 | 弹窗 |
| `z-popover` | 400 | 气泡卡 |
| `z-toast` | 500 | 全局提示 |

> **禁止出现 `z-index: 9999` 之类的魔法值**，一律走 token。

### 2.3 文字层级（3 级）
`text-primary` → `text-secondary` → `text-tertiary`。
同一段区域内，**层级跨度不要超过 2 级**（primary 直接到 tertiary 视为丢失中间层）。

### 2.4 强调层级
- 强调色**只给主行动**；**同一屏主按钮 ≤ 1 个**。
- 次要 / 第三级操作走 `bg-soft`、`neutral-selected` 或文字按钮，不用强调色堆叠。

---

## 3. 文字大小（Typography）

字阶 9 档，**字号 / 行高 / 字重 / 字距四绑定，不许拆开自由组合**。

| 角色 | 字号 | 行高 | 字重 | 字距 | 典型用途 | 禁用场景 |
|---|---|---|---|---|---|---|
| caption | 11 | 14 | 400 | +0.4 | 辅助说明、分组标题、时间戳 | 正文、按钮文字 |
| body | 12 | 16 | 400 | 0 | 密集列表正文、表格单元格 | 主按钮文字 |
| base | 13 | 18 | 400 | 0 | **默认正文**、输入框、菜单项 | 标题 |
| label | 14 | 20 | 500 | 0 | 表单标签、按钮文字(lg)、Tab | 长正文 |
| title | 16 | 22 | 600 | −0.2 | 卡片 / 区块标题 | 表格单元格 |
| heading | 20 | 28 | 600 | −0.2 | 页面 / 大区块标题 | 密集列表 |
| display | 24 | 30 | 600 | −0.2 | 展示标题、空状态标题 | 表单、表格 |
| display-lg | 32 | 40 | 700 | −0.4 | **仅营销 / Hero 副标** | 产品内常规 UI |
| hero | 48 | 56 | 700 | −0.4 | **仅营销 Hero 主标** | 产品内常规 UI |

**规则**
1. **产品内 UI 字号上限 24**；32 / 48 只在营销落地页开放。
2. 字重只用 **400 / 500 / 600 / 700**，**同一屏不超过 3 种字重**。
3. **大字号配负字距**（收紧），**小号标签 / 全文大写配正字距**（放宽）。17px 以下禁止用 −0.4。
4. 字族：`Inter`（`--kk-font-sans`），代码用 `Geist Mono`（`--kk-font-mono`），中文回退 PingFang SC / Microsoft YaHei。

---

## 4. 控件档位（按族分档 · v3.0）

### 4.0 为什么要分族

**只有 4 档不够，是因为用「高度」这一个维度去表达「这是什么控件」**。
同一个 32px，可能是按钮、输入框、菜单项、图标按钮、胶囊——它们的内距、图标、字重都不该一样。
把族分开之后，**同名档位天然锁定一整组参数**，既比 4 档细，又比 7 档干净。

**目标封闭高度轴（全站仅此 6 个数值）**：`20 · 24 · 28 · 32 · 40 · 44`
任何控件高度必须落在轴上；轴外值只允许"冻结值"（见 §4.6）。

### 4.1 F1 图标控件族 `icon`（纯图标，无文字）

| 档位 | 边长 | 图标 | 内距 | 圆角 | **唯一场景** |
|---|---|---|---|---|---|
| `icon-xs` | 20 | 14 | 4 | pill | 画布跟随操作、迷你图标钮 |
| `icon-sm` | 24 | 14 | 4 | pill | 密集行内图标钮、composer 辅助图标 |
| `icon-md` | 28 | 16 | 6 | pill | 悬浮条图标钮（桌面） |
| `icon-lg` | 32 | 16 | 4 | 10 | 标准图标钮、工具栏 |
| `icon-xl` | 40 | 20 | 8 | 10 | 主操作图标钮、画布大工具 |

### 4.2 F2 文本按钮族 `button`（有文字、可执行动作）

| 档位 | 高度 | 图标 | 字号 | 内距 | 圆角 | 间隙 | **唯一场景** |
|---|---|---|---|---|---|---|---|
| `button-sm` | 28 | 14 | 12 | 10 | 8 | 6 | 表格行内、列表内嵌、密集筛选 |
| `button-md` | 32 | 16 | 13 | 12 | 10 | 6 | **默认按钮**、与输入框同排、侧栏操作 |
| `button-lg` | 40 | 20 | 14 | 16 | 10 | 8 | **主行动**、对话框主/次、Toolbar |
| `button-xl` | 44 | 20 | 14 | 20 | 10 | 8 | 触屏主操作、登录 CTA、危险图标钮 |

### 4.3 F3 表单控件族 `field`（Input / Select / Textarea）

| 档位 | 高度 | 字号 | 图标 | 内距 | 圆角 | **唯一场景** |
|---|---|---|---|---|---|---|
| `field-sm` | 28 | 12 | 14 | 10 | 8 | 行内筛选、紧凑搜索 |
| `field-md` | 32 | 13 | 16 | 12 | 10 | **默认 Input / Select / Textarea** |
| `field-lg` | 40 | 14 | 16 | 16 | 10 | 设置页主输入、触屏输入框 |

### 4.4 F4 标注控件族 `chip`（Badge / Chip / Tag / 胶囊按钮）

| 档位 | 高度 | 字号 | 内距 | 圆角 | **唯一场景** |
|---|---|---|---|---|---|
| `chip-xs` | 20 | 11 | 6 | pill | 状态徽标、计数、角标 |
| `chip-sm` | 24 | 12 | 10 | pill | 文件标签、桌面 pill 按钮 |
| `chip-md` | 28 | 12 | 10 | pill | 过滤器、胶囊按钮紧凑档 |

### 4.5 F5 外壳族 `shell`（只定外壳，不定义控件高）

| 契约 | 值 |
|---|---|
| Toolbar 外壳 | 50（内部控件取 `button-lg` 40） |
| 悬浮条 | 内容 + 4 内距（内部控件取 `icon-md` 28） |
| MenuItem | 32 |
| Submenu 子项 | 28 + 缩进 16 |
| CanvasHud 右侧组间距 | 8 |
| 抽屉 / 面板命中放大 | 44（仅粗指针，不改控件本体尺寸） |

### 4.6 冻结值（原稿 1:1 复刻，不参与档位收敛）

这几个值是设计源指定的**来源几何**，改动视同破坏还原，单独命名、单独登记：

| 冻结名 | 值 | 来源 | 允许 |
|---|---|---|---|
| `shell-nav-row` | 31.109 | Figma 导航组 281×31.109 | 只用于该导航组，不得扩散 |
| `asset-card-slot` | 40.924 | asset 卡测量值 | 只用于 asset 卡，不得扩散 |
| `logo-*` | 11 / 30 / 63.141 | 品牌位 | 属品牌位，不进图标层级 |
| `figma-canvas-composer-radius` | 30 | 用户新指定 Figma `483:588` | 只用于画布节点输入外框，不扩散到通用卡片 |

### 4.6.1 用户新指定 Figma 组件几何（2026-09-25）

这些是组件静态参考外框，不是整页位置，也不限定长文本、附件和手机触控后的实际高度。颜色、文字和点击目标仍按本文件的通用档位及 [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) 的创作输入契约执行。

| 组件 | 来源 | 参考外框 | 专项尺寸 |
|---|---|---|---|
| 首页创作输入·电脑 | [Figma `483:695`](https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=483-695) | 652 × 170 | r20、1px 边框；高度为最小值 |
| 首页创作输入·手机 | [Figma `483:753`](https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=483-753) | 306 × 170 | 306 为视觉宽度上限；触屏操作可增加高度 |
| 画布节点输入 | [Figma `483:588`](https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=483-588) | 590 × 237 | r30、1px 边框；只用于世界坐标中的节点编辑器 |
| 模型选择弹层 | [Figma `483:1042`](https://www.figma.com/design/0nU0A7pq6eyjwfwm1TtWkO/kk?node-id=483-1042) | 227 × 318 | r10、1px 边框；列表独立滚动 |

### 4.7 规则

1. **族由控件形态决定，不由页面决定**："这页像需要 30px" 不构成跨族取值。
2. **每档内部的 `高度 + 内距 + 图标 + 字号 + 圆角 + 间隙` 必须整组取用**，禁止只改高度。
3. **同一容器内的同类控件必须同档**——跨档即缺陷（"同一按钮两种大小"的唯一判定标准）。
4. 图标 + 文字同处一容器 → 必须自动布局 + 交叉轴居中，图标框**禁止 `layout: none`**。
5. 主按钮 = `accent` 填充 + `on-accent` 文字；**同屏主按钮 ≤ 1**。
6. 开关 / 展开类**容器定位必须固定**（自动布局 + 固定侧宽）；绝对定位导致展开跳位属 bug。
7. **只有 `button-xl` 及以上有资格做触屏主操作**（命中区考虑）。
8. 新增档位需评审后入册；**禁止为单个页面新增档位**。

---

## 5. 容器间距（Container Spacing）

**两套刻度，职责不重叠。**

### 5.1 组件内间距（4px 基准）
`space-hair 2` · `space-1 4` · `space-2 8` · `space-3 12` · `space-4 16` · `space-5 24` · `space-6 40`

> `space-hair 2` 只用于图标微调与内描边留白，**不用于常规间隙**。

### 5.2 页面 / 容器节奏
`layout-gutter-sm 20` · `md 32` · `lg 48` · `xl 64`

### 5.3 容器左右内边距（响应式）
`<768px → 16` · `768–1199px → 24` · `≥1200px → 40`（`--kk-container-pad`）

### 5.4 成对关系速查（不许自己挑数值）

| 关系 | 间距 | token |
|---|---|---|
| 图标 ↔ 文字 | 4（sm 档）/ 8 | `control-gap-*` |
| 标题 → 正文 | 8 | `space-2` |
| 正文段落之间 | 4 | `space-1` |
| 表单字段之间 | 16 | `space-4` |
| 卡片内部四周 | 16 | `space-4` / `--kk-card-pad` |
| 卡片 ↔ 卡片 | 20 | `layout-gutter-sm` |
| 区块 ↔ 区块 | 32 | `layout-gutter-md` |
| 大分区 ↔ 大分区 | 48 | `layout-gutter-lg` |
| 页面章节 ↔ 章节 | 64 | `layout-gutter-xl` |

**规则**
1. **容器左右内边距必须用 `--kk-container-pad`**，不许每台设备手写。
2. 同一列表的项间距**必须一致**，禁止 12 挨着 16。
3. 分区之间的间距必须**明显大于**分区内部间距（至少差一档），否则层级读不出来。

---

## 6. 倒角（Radius）

### 6.1 九档数值轴（按元素**短边**分组取档，不是按心情）

| 档 | 值 | 适用元素 |
|---|---|---|
| 0 | 0 | 表格、代码块、终端、数据密集容器 |
| **xs** | 4 | checkbox / radio / badge / tooltip / progress / 色票 |
| **sm** | 8 | chip / tag / 小尺寸控件 |
| **control** | 10 | **品牌默认**：输入框、按钮、胶囊外框、Switch 轨道 |
| **menu** | 12 | 下拉菜单、二级菜单、Toast |
| **lg** | 16 | 嵌套补偿档 |
| **panel** | 20 | 侧栏、面板、弹窗内容、底部抽屉 |
| **card** | 28 | 卡片、大容器、Hero 卡 |
| **full** | 999 | 药丸按钮、头像、状态点、圆形图标按钮 |

### 6.2 嵌套公式（Material 3 optical roundness）

> 公式本体与执行规则见 [`UI_RULES.md`](./UI_RULES.md) §4.2（规则只定义一次）。
> 本表是 **token 侧的可选内圆角档位**，供查表用。

> **内圆角 = 外圆角 − 内边距**

为了让嵌套永远落在已有的档位上，**规定容器内边距只用 8 / 16 / 24**（这三个值配合我们的圆角轴永远有解）：

| 外层 | 内边距 | 内层圆角 | 用哪个 token |
|---|---|---|---|
| card 28 | 8 | 20 | `radius-panel` |
| card 28 | 16 | 12 | `radius-menu` |
| card 28 | 24 | 4 | `radius-xs` |
| panel 20 | 8 | 12 | `radius-menu` |
| panel 20 | 16 | 4 | `radius-xs` |
| menu 12 | 8 | 4 | `radius-xs` |

**规则**
1. **嵌套的两层绝对不许用同一个圆角值**——这是最常见的"看着歪"根因。
2. 若确实需要 12 或 4 的内边距，按公式算出来的值可能落到 0 或负数 → 此时内层取 `xs 4` 或直角，**不要把 12/4 硬套公式产生 16/2 这种不在轴上的值**。
3. **信息密集容器（表格 / 数据 / 代码 / 终端）禁用 panel / card / full**，用 `sm 8` 或 `0`。
4. 描边圆角：**内描边 = 元素圆角**；**外描边（focus ring）= 元素圆角 + `border-width-focus`**。

---

## 7. 组件契约（Tier 3 取值表）

> 组件的**具体档位数值**见本文 §4（按族分档）。本表只做 token 映射。

组件一律消费左侧 token，**不许再自己拼 Tier 1**。

| 组件 | 取哪些 token |
|---|---|
| Button standard | `--kk-button-h/-px/-gap/-font/-icon/-radius` |
| Button compact | `--kk-button-compact-h/-px/-font/-icon` |
| Input | `--kk-input-h/-px/-gap/-font/-icon/-radius`，底色 `bg-input`，聚焦 `focus-ring` |
| Select | `--kk-select-h/-px/-font/-icon/-radius`，面板 `--kk-select-menu-radius` |
| IconButton | `--kk-icon-button-h` / `-lg` / `-xl`，圆角 `--kk-icon-button-radius` |
| MenuItem | 候选 `--kk-menu-item-h` 当前为 36，与 §4 高度轴冲突，画布回读前不作为新菜单的档位来源；缩进取 `--kk-menu-indent`，圆角 `radius-menu` |
| Badge | `--kk-badge-h` 20，字号 caption 11 |
| Capsule | `--kk-capsule-h` 28 / `-lg-h` 32，圆角 `radius-full` |
| Card | `--kk-card-pad`，`--kk-card-radius` |
| Toolbar | `--kk-toolbar-h` 50，底色 `bg-surface`，底部 1px `border-subtle` |

**历史重灾区，务必自检**：Input、IconButton、Toolbar、二级菜单（Submenu）。

---

## 8. 变量映射速查

| 语义 | Ardot 引用 | CSS | JSON |
|---|---|---|---|
| 应用底 | `$:KK-Semantic:bg-app` | `--kk-bg-app` | `kk.semantic.color.dark.bg-app` |
| 输入底 | `$:KK-Semantic:bg-input` | `--kk-bg-input` | `kk.semantic.color.dark.bg-input` |
| 主文字 | `$:KK-Semantic:text-primary` | `--kk-text-primary` | `kk.semantic.color.dark.text-primary` |
| 强调主色 | `$:Accent:accent` | `--kk-accent` | `kk.semantic.accent.default.accent` |
| 强调浅底 | `$:Accent:accent-soft` | `--kk-accent-soft` | `kk.semantic.accent.default.accent-soft` |
| 组件间距 | `$:KK-Spacing:space-4` | `--kk-space-4` | `kk.primitive.space.4` |
| 容器节奏 | `$:KK-Layout:layout-gutter-md` | `--kk-layout-gutter-md` | `kk.semantic.layout.gutter-md` |
| 控件档高 | `$:KK-Control:control-h-lg` | `--kk-control-h-lg` | `kk.semantic.control.comfortable.h-lg` |
| 按钮高度 | —（CSS 层派生） | `--kk-button-h` | `kk.component.button.h` |
| 层级 | `$:KK-Elevation:z-modal` | `--kk-z-modal` | `kk.semantic.elevation.z-modal` |
| 边框宽 | `$:KK-Border:border-width` | `--kk-border-width` | `kk.semantic.border.width` |

---

## 9. 变化旋钮：满足"不断演化"但不变味

**只允许扭这 4 个开关，其余一律不许改组件代码。**

| 旋钮 | 取值 | 影响范围（只 override Tier 2） |
|---|---|---|
| `data-theme` | `dark`（默认）/ `light` | 全部语义色 + 阴影色 + 遮罩 |
| `data-accent` | default / blue / green / yellow / pink / orange / purple / white | 4 个强调色 token |
| `data-density` | `comfortable`（默认）/ `compact` | 控件档位 −4px、gutter 降一档、卡片内距 16→12 |
| 断点 | `<768` / `768–1199` / `≥1200` | `--kk-container-pad` 16 / 24 / 40 |

```html
<html data-theme="dark" data-accent="default" data-density="comfortable">
```

**新增一个"形态"的正确姿势**：先在 Tier 2 加语义 token → 再在 Tier 3 加组件映射 → 最后才允许组件消费。**跳过前两步直接改组件 = 破坏一致性。**

---

## 10. 自检清单（改完 UI 逐条过）

**层级**
- [ ] 背景表面逐级递进，没有跳级？
- [ ] 同一容器内表面层级 ≤ 2 级？
- [ ] z-index 走了 token，没有 9999？

**文字**
- [ ] 字号 / 行高 / 字重 / 字距用的是**同一档的绑定组合**？
- [ ] 产品内没有出现 32 / 48？同屏字重 ≤ 3 种？

**按钮**
- [ ] 高度是 28 / 32 / 40 / 44 之一？
- [ ] 该档的内边距 / 图标 / 字号是**整组取用**的？
- [ ] 图标 + 文字容器已自动布局 + 交叉轴居中？
- [ ] 同屏主按钮 ≤ 1 个？展开/切换有无跳位？

**间距**
- [ ] 组件内用 space-*，页面用 layout-gutter-*，没串用？
- [ ] 容器左右边距走 `--kk-container-pad`？
- [ ] 分区间距至少比区内间距大一档？

**倒角**
- [ ] 取值落在九档轴上？
- [ ] 嵌套两层圆角不同值，且符合 `外 − 内边距 = 内`？
- [ ] 表格 / 代码等密集容器没用 panel / card / full？

---

## 附：新增文件与画布变量组（v2.0）

画布新增 / 扩充变量组：`KK-Type`（字族 / 字重 / 字距 / 大字号）、`KK-Border`、`KK-Elevation`（z-index）、`KK-Spacing`（hair 2）、`KK-Radius`（xs 4 / sm 8 / lg 16）、`KK-Control`（控件 4 档 × 5 参数）、`KK-Layout`（容器节奏 / 侧栏 / 面板 / 工具条）、`KK-Semantic`（阴影色 / 遮罩）。
