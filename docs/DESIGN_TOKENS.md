# KK-Studio-2.0 · UI Token 体系 v2.0

> **权威来源**：Ardot 画布 `Design System 设计系统`（fileId `728457371665311`）。
> 本文与 [`src/styles/tokens.css`](../src/styles/tokens.css)、[`src/styles/tokens.json`](../src/styles/tokens.json) 由画布变量导出，数值完全对齐，是人 / AI / 代码三方共读的**单一事实来源**。
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

**封闭高度轴（全站仅此 6 个数值）**：`20 · 24 · 28 · 32 · 40 · 44`
任何控件高度必须落在轴上；轴外值只允许"冻结值"（见 §4.6）。

### 4.1 F1 图标控件族 `icon`（纯图标，无文字）

| 档位 | 边长 | 图标 | 内距 | 圆角 | **唯一场景** |
|---|---|---|---|---|---|
| `icon-xs` | 20 | 12 | 4 | `full`(999) | 画布跟随操作、迷你图标钮 |
| `icon-sm` | 24 | 12 | 6 | `full`(999) | 密集行内图标钮、composer 辅助图标 |
| `icon-md` | 28 | 16 | 6 | `full`(999) | 悬浮条图标钮（桌面） |
| `icon-lg` | 32 | 16 | 8 | `full`(999) | 标准图标钮、工具栏 |
| `icon-xl` | 40 | 16 | 12 | `full`(999) | 画布大工具、大工具条 |

> **几何自洽约束**：图标族必须满足 **`边长 = 图标 + 2 × 内距`**，上表内距全部由此式反解，不是独立取值。
> 校验：12+4×2=20 · 12+6×2=24 · 16+6×2=28 · 16+8×2=32 · 16+12×2=40 —— 五档全部整除。
>
> **图标尺寸必须取自 `UI_RULES` §2.2 的 `glyph-sm/md/lg`（12 / 14 / 16），不得自造。**
> 图形尺寸的封闭约束在 §2.2，本族只负责"给这个图形多大的框、留多少边"。
> 旧表 `icon-xl` 直接写 20 属于**越层取值**（20 不是任何 `glyph` 档），已修正。
>
> **内距不套用 §5.1 间距刻度**：这里的内距是图形容器内的**光学留白**，由几何公式决定；
> §5.1 管的是块级内容的 padding 与元素间距，两者职责不同，不要拿 §5.1 来校验这一列。
>
> **圆角统一为 `full`(999)**：图标钮是图形容器而非矩形容器，圆形是它的默认形态。
> 旧表里「32 处从圆形突变为 10」属于判据缺失，已消除。

### 4.2 F2 文本按钮族 `button`（有文字、可执行动作）

| 档位 | 高度 | 图标 | 字号 | 内距 | 圆角 | 间隙 | **唯一场景** |
|---|---|---|---|---|---|---|---|
| `button-sm` | 28 | 14 | 12 | 10 | 8 | 6 | 表格行内、列表内嵌、密集筛选 |
| `button-md` | 32 | 16 | 13 | 12 | 10 | 6 | **默认按钮**、与输入框同排、侧栏操作 |
| `button-lg` | 40 | 16 | 14 | 16 | 10 | 8 | **主行动**、对话框主/次、Toolbar |
| `button-xl` | 44 | 16 | 14 | 20 | 10 | 8 | 触屏主操作、登录 CTA、危险图标钮 |

> **图标尺寸同样受 `UI_RULES` §2.2 `glyph-*` 三档（12 / 14 / 16）约束**，
> 与 §4.1 同一条硬约束：旧表 `button-lg` / `button-xl` 写 20 属越层取值，已收敛为 `glyph-lg` 16。
> 若某处确实需要 >16 的图形，按 §2.2 属于**例外**（同头像 / Logo），须单列评审，不得直接写进档位表。

> **button 族高度不由几何决定**：带文字时宽度随文字伸缩，高度只取轴上数值；
> 因此「内距」列是**左右内距**，不与 §5.1 刻度互套，也不与 `icon` 族的几何反解互套（见 §4.7 规则 9）。
> **纯图标按钮请走 `icon` 族**，不要塞进 button 族——这是最常见的族错判。

### 4.3 F3 表单控件族 `field`（Input / Select / Textarea）

| 档位 | 高度 | 字号 | 图标 | 内距 | 圆角 | **唯一场景** |
|---|---|---|---|---|---|---|
| `field-sm` | 28 | 12 | 14 | 10 | 8 | 行内筛选、紧凑搜索 |
| `field-md` | 32 | 13 | 16 | 12 | 10 | **默认 Input / Select / Textarea** |
| `field-lg` | 40 | 14 | 16 | 16 | 10 | 设置页主输入、触屏输入框 |

### 4.4 F4 标注控件族 `chip`（Badge / Chip / Tag / 胶囊按钮）

| 档位 | 高度 | 字号 | 内距 | 圆角 | **唯一场景** |
|---|---|---|---|---|---|
| `chip-xs` | 20 | 11 | 6 | `full`(999) | 状态徽标、计数、角标 |
| `chip-sm` | 24 | 12 | 8 | `full`(999) | 文件标签、桌面药丸按钮 |
| `chip-md` | 28 | 13 | 10 | `full`(999) | 过滤器、胶囊按钮紧凑档 |

> **高度由 `min-height` 强制**，不依赖文字盒——胶囊高度必须独立于内容，否则一加文字就变形。
> 「内距」列是**左右内距**。
> **圆角称 `full` 不称 `pill`**：`pill` 只是俗名，token 名是 `radius-full`（999），全文统一用 `full`。
>
> 三档的字号与内距**逐档递增且互不重复**。旧表 `chip-sm` / `chip-md` 同为"字号 12 + 内距 10"、
> 只差高度——这与 §4.1 `icon-xs` / `icon-sm` 是**同一个病**（用高度一个维度分档），已一并修正。

### 4.5 F5 外壳族 `shell`（只定外壳，不定义控件高）

| 契约 | 值 |
|---|---|
| Toolbar 外壳 | 50（内部控件取 `button-lg` 40） |
| 悬浮条 | 内容 + 4 内距（内部控件取 `icon-md` 28） |
| MenuItem | 32 |
| Submenu 子项 | 28 + 缩进 16 |
| CanvasHud 右侧组间距 | 8 |
| 抽屉 / 面板命中放大 | 44（仅粗指针，不改控件本体尺寸） |

> **为什么 MenuItem / Submenu 归 `shell` 而不是 `button`**
> 归族问的是「**高度由谁决定**」，不是「能不能点」。MenuItem 的可点击性来自菜单容器，
> 行高由菜单外壳统一给定，因此是外壳契约。若将来出现「高度不由容器定、且带文字的可点行」，
> 才改归 `button` 族——判据是容器归属，不是交互能力。

### 4.6 冻结值（原稿 1:1 复刻，不参与档位收敛）

这几个值是设计源指定的**来源几何**，改动视同破坏还原，单独命名、单独登记：

| 冻结名 | 值 | 来源 | 允许 |
|---|---|---|---|
| `shell-nav-row` | 31.109 | Figma 导航组 281×31.109 | 只用于该导航组，不得扩散 |
| `--ui-icon-nav` | 10 | 导航组图标的来源几何 | 不进 `icon` 族档位，只用于该导航组 |
| `asset-card-slot` | 40.924 | asset 卡测量值 | 只用于 asset 卡，不得扩散 |
| `logo-*` | 11 / 30 / 63.141 | 品牌位 | 属品牌位，不进图标层级 |

> **`shell-nav-row` 31.109 与 `--ui-control-h-nav` 31px 是同一事物**：后者是前者取整到整数像素的**运行值**。
> 二者都**不动**，不做归位——此前 §10.2 建议把 `--ui-control-h-nav` 归 `button-md` 32，是对冻结值的误判，已撤回。

> **冻结值表是冻结值的唯一真源**。任何被称为"冻结"的值都必须出现在本表，
> 否则冻结与归位的边界会重新模糊（这正是 2026-09-25 复核修掉的漏洞）。

### 4.7 规则

1. **族由控件形态决定，不由页面决定**："这页像需要 30px" 不构成跨族取值。
2. **每档内部的 `高度 + 内距 + 图标 + 字号 + 圆角 + 间隙` 必须整组取用**，禁止只改高度。
3. **同一容器内的同类控件必须同档**——跨档即缺陷（"同一按钮两种大小"的唯一判定标准）。
4. 图标 + 文字同处一容器 → 必须自动布局 + 交叉轴居中，图标框**禁止 `layout: none`**。
5. 主按钮 = `accent` 填充 + `on-accent` 文字；**同屏主按钮 ≤ 1**。
6. 开关 / 展开类**容器定位必须固定**（自动布局 + 固定侧宽）；绝对定位导致展开跳位属 bug。
7. **触屏主操作 = `button-xl`(44)，或命中放大到 44 的 `icon-xl`(40)**（放大按 §4.5，不改本体尺寸）。
   `icon-lg`(32) 及以下一律**没有**触屏主操作资格。
8. 新增档位需评审后入册；**禁止为单个页面新增档位**。
9. **内距在三族之间含义不同，禁止互套**：`icon` 内距是几何反解值（§4.1）；
   `button` 内距是左右内距，随文字宽度伸缩（§4.2）；`field` / `chip` 见各自小节。
10. **档位参数必须整组自洽**：只调高度而不重算其余参数，即视为参数不自洽，评审不通过。

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

> ⚠️ **本表当前是"设计态"规范，不是可运行的事实**
> `src/main.tsx` 只 import 了 `global.css` 与 `ui-tokens.css`；`tokens.css`（即本表对应的实现）
> **从未被引入**。因此本表列出的 `--kk-*` token **在运行时尚不存在**，照抄会导致样式全部回退。
>
> **接线代价已查明**（2026-09-25 实测）：
> - `tokens.css`（138 个变量）与 `ui-tokens.css`（110 个变量）**重叠数为 0**——前缀 `--kk-` / `--ui-` 完全不同，
>   接线不会引发布名冲突。
> - 唯一影响面：`archetypes.css` 用的是 `var(--kk-*, 字面量fallback)` **单回退**写法，
>   接线后这些声明改从 `tokens.css` 取值，可能与原 fallback 字面量不同 → **接线后必须逐屏比对**。
>
> 完整方案与风险清单见 [`UI_INDEX.md`](./UI_INDEX.md) §2.2。

组件一律消费左侧 token，**不许再自己拼 Tier 1**。

**本表不再自行维护数值**——「组件 → 档位」的对应关系是本表的唯一职责，档位数值只在 §4 出现一次。
下表「档位」列即为到 §4 的指针。
**token 列给的是 §8 的规范名**；代码现名若不同，在括号中一并标出（Tier 3 未接线，代码名为现状参考）。

| 组件 | 档位（→ §4） | 取哪些 token |
|---|---|---|
| Button standard | `button-md` 32 | `--kk-button-h/-px/-gap/-font/-icon/-radius` |
| Button compact | `button-sm` 28 | `--kk-button-compact-h/-px/-font/-icon` |
| Input | `field-md` 32 | `--kk-input-h/-px/-gap/-font/-icon/-radius`，底色 `bg-input`，聚焦 `focus-ring` |
| Select | `field-md` 32 | `--kk-select-h/-px/-font/-icon/-radius`，面板 `--kk-select-menu-radius` |
| IconButton | `icon-md` 28（共 5 档，见 §4.1） | `--kk-icon-h-{xs,sm,md,lg,xl}`（代码现名 `--kk-icon-button-h/-lg/-xl`），圆角 `radius-full` |
| MenuItem | `shell` MenuItem 32 | `--kk-shell-menu-item`（代码现名 `--kk-menu-item-h`，代码现值 36px 越界，见下），`Indent` `--kk-menu-indent` 16，圆角 `radius-menu` |
| Badge / Chip | `chip-xs` 20 | `--kk-badge-h` 20，字号 caption 11 |
| Capsule | `chip-md` 28 | `--kk-capsule-h` 28，圆角 `radius-full` |
| Card | `shell` — | `--kk-card-pad`，`--kk-card-radius` |
| Toolbar | `shell` Toolbar 50 | `--kk-toolbar-h` 50，底色 `bg-surface`，底部 1px `border-subtle` |

**当前已知越界（代码侧待归位，归位方案见 [`UI_RULES.md`](./UI_RULES.md) §10.2）**

| token | 代码现值 | 应取值 | 说明 |
|---|---|---|---|
| `--kk-menu-item-h` | `36px` | `32px` | 36 不在封闭高度轴上；§4.5 shell 族 MenuItem 已定义为 32 |

**历史重灾区，务必自检**：Input、IconButton、Toolbar、二级菜单（Submenu）。

---

## 8. 变量映射速查

**档位 token 的族前缀规范（2026-09-25 补，消 `lg` 同名歧义）**

v3.0 分族后，`icon-lg` / `button-lg` / `field-lg` 的档位后缀相同但分属三族，
若沿用单组 `control-h-lg` 命名，三个族会指向同一个 token——这是必须掐掉的歧义。约定如下：

| 族 | token 命名 | 示例 |
|---|---|---|
| `icon` | `--kk-icon-h-<档>` | `--kk-icon-h-lg` = 32 |
| `button` | `--kk-button-h-<档>` | `--kk-button-h-lg` = 40 |
| `field` | `--kk-field-h-<档>` | `--kk-field-h-md` = 32 |
| `chip` | `--kk-chip-h-<档>` | `--kk-chip-h-sm` = 24 |
| `shell` | `--kk-shell-<契约名>` | `--kk-shell-menu-item` = 32 |

画布侧：`KK-Control` 变量组须**按族拆成 5 个组**，沿用单组 `control-<档>` 命名不再扩展。

**接线状态提醒**：下表的 `--kk-*` 当前尚未接入运行时（见 §7 警示），接前先看 `UI_INDEX.md` §2.2。

| 语义 | Ardot 引用 | CSS | JSON |
|---|---|---|---|
| 应用底 | `$:KK-Semantic:bg-app` | `--kk-bg-app` | `kk.semantic.color.dark.bg-app` |
| 输入底 | `$:KK-Semantic:bg-input` | `--kk-bg-input` | `kk.semantic.color.dark.bg-input` |
| 主文字 | `$:KK-Semantic:text-primary` | `--kk-text-primary` | `kk.semantic.color.dark.text-primary` |
| 强调主色 | `$:Accent:accent` | `--kk-accent` | `kk.semantic.accent.default.accent` |
| 强调浅底 | `$:Accent:accent-soft` | `--kk-accent-soft` | `kk.semantic.accent.default.accent-soft` |
| 组件间距 | `$:KK-Spacing:space-4` | `--kk-space-4` | `kk.primitive.space.4` |
| 容器节奏 | `$:KK-Layout:layout-gutter-md` | `--kk-layout-gutter-md` | `kk.semantic.layout.gutter-md` |
| 控件档高 | `$:KK-Control`（须拆为 5 族组，见上文） | 见上文族前缀表 | `kk.semantic.control.*` |
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

**控件档位**（v3.0 按族分档；旧清单的"28/32/40/44 四档"已作废）
- [ ] **族**选对了吗？按 `UI_RULES` §2.1 选档四问走一遍，落在 `icon`/`button`/`field`/`chip`/`shell` 之一？
- [ ] 高度落在封闭轴 **20 / 24 / 28 / 32 / 40 / 44** 之一？（**不是**旧的 28/32/40/44 四档）
- [ ] 该档的内边距 / 图标 / 字号是**整组取用**的，没有只改高度？
- [ ] **图标尺寸取自 `UI_RULES` §2.2 的 `glyph-sm/md/lg`（12 / 14 / 16），没有自造？**
- [ ] `icon` 族满足 **`边长 = 图标 + 2 × 内距`**？
- [ ] 相邻两档的参数是否真的不同？（若只差高度 → 那是"用高度分档"，档位冗余，须重做）
- [ ] 图标 + 文字容器已自动布局 + 交叉轴居中？
- [ ] 同屏主按钮 ≤ 1 个？展开/切换有无跳位？
- [ ] 触屏主操作用的是 `button-xl`(44) 或命中放大到 44 的 `icon-xl`(40)？

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

画布新增 / 扩充变量组：`KK-Type`（字族 / 字重 / 字距 / 大字号）、`KK-Border`、`KK-Elevation`（z-index）、`KK-Spacing`（hair 2）、`KK-Radius`（xs 4 / sm 8 / lg 16）、`KK-Control`（控件档位 v3.0：**5 族 18 档**，取值见本文 §4）、`KK-Layout`（容器节奏 / 侧栏 / 面板 / 工具条）、`KK-Semantic`（阴影色 / 遮罩）。
