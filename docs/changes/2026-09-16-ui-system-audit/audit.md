# KK Studio 当前 UI 审计与漂移报告

日期：2026-09-16  
工程：`D:\kk-studio-next`  
运行态：Vite development，`http://127.0.0.1:1421/`，浏览器状态路由，初始 `active=landing`  
审计性质：只读审计；当前 worktree 为多写入者 dirty snapshot

## 先给结论

KK Studio 已经形成一套可辨认的深色创作工作台语言：黑色应用底、炭灰面板、紫色强调、Inter/YaHei 字体、紧凑工具栏、圆角卡片、右侧对话面板和带点阵的无限画布。关键画面与 Figma 结构有明显对应关系，`global.css`、`ui-tokens.css` 也已经保存了不少可复用语义。

当前最严重的问题是“有 token、没有统一组件契约”。按钮、输入、选择器、胶囊、徽标、弹层和工具栏仍主要由原生标签加页面 CSS 组合而成。审计采样到 223 个原生 `<button>`、16 个 `.ui-button` 使用点、16 个原生 `<select>`，没有集中承载 Button/IconButton/Badge/Capsule/Input/Select 的 React 组件目录。26 个 CSS 文件共约 10,364 行，`workspace.css` 约 2,542 行，导致相同语义的控件在不同页面拥有不同尺寸、圆角、间距和 overflow 行为。

另一个高风险点是固定设计坐标与窄屏行为之间缺少明确契约。桌面端通过 1920×1080 固定 surface 加缩放保持 Figma 坐标；390px 下侧栏收缩到约 61px，但 Landing composer 的工具区仍按横向密集排列，右侧控件会被裁切，Workspace 的右侧对话区也不在窄屏首屏可见。这个问题不能靠继续微调某一个按钮的像素解决，需要先定义 Fill/Hug/Min/Max/Wrap/Scroll/Truncate 的布局规则。

## A. 当前 UI Audit

### 页面和状态覆盖

| 区域 | 本轮状态 | 当前观察 |
| --- | --- | --- |
| Landing | 1440px、390px；模型弹层；模式弹层 | Hero、品牌兔子、主 composer、模型/批量/隐私/Skill 控件、灵感卡片；390px 下 composer footer 横向溢出 |
| Workspace | 1440px；右侧对话打开 | 左侧导航、点阵画布、图片/视频占位、连接线、任务按钮、缩放/小地图/工具弹层、底部工具栏、对话输入 |
| Workspace mobile | 390px | 侧栏收缩；画布可见区域变窄；对话面板未形成清晰移动层级 |
| 收纳 | 当前 Figma frame `410:67357`；运行态对应收纳/无对话状态 | 同一工作台壳层隐藏对话，点阵画布和工具仍保留 |
| 资产 | 1440px modal | 左侧目录、`画布/资产` tabs、搜索、类型/标签/时间/来源筛选、三列卡片；面板信息密度高 |
| 任务 | 1440px popover、任务工作台 | 任务列表使用固定本地 demo；工作台明确标出 `TASK WORKBENCH · PROTOTYPE` |
| 设置 | 通用、模型供应商 | 设置导航较完整；provider 页面明确浏览器 session 与桌面凭据边界 |
| 账号 | 1440px popup | 账号、UID、切换/退出、积分、订阅、主题、版本更新；需保持 Prototype/服务边界 |

代表性截图：原记录引用的 `docs/evidence/ui-audit-2026-09-16/` 不在当前树中；这些截图不作为当前交付证据。请使用当前存在的同状态记录重新采集后再恢复链接。

### 视觉语言

1. **底色和层级**：应用底接近 `#0a0a0a`，表面为 `#161616`，卡片为 `#1a1a1a`，输入为 `#1f1f1f`；边框以 `#3c3c3c` 和 `#292929` 分层。
2. **强调色**：紫色强调来自 `#635bff`，文字强调为浅紫 `#b2adff`。这组颜色在主操作、选择态和品牌交互中承担相同语义，应继续收敛到 semantic token。
3. **字体**：Inter 为英文和数字主字体，中文回退到 Microsoft YaHei/PingFang SC。实际页面同时存在 8、9、10、11、12、13、14、15、16、18、19.293 等多个字号，说明 Figma 测量值与通用层级尚未分工。
4. **圆角**：最稳定的目标体系已经写入 token：control 10、menu 12、panel 20、card 28、pill 999。页面仍存在大量 4、5、6、7、8、9、10、12、14、16、18、20 及小数圆角，需标记“语义 token”或“Figma 节点例外”。
5. **密度**：工作台倾向紧凑、低对比、工具优先；Landing composer 和卡片展示更接近大圆角营销式布局。两者可以共存，但必须由页面层级和组件变体明确区分。

### 值得保留、已经偏离和可能由 AI 延展引入的部分

**值得保留**：Workspace 的黑色点阵画布与右侧对话 rail、Landing 的主 composer、Figma 兔子品牌资源、深色 surface 层级、紫色主操作、紧凑 31/40px 控件、50px 工具栏、明确的 task workbench Prototype 标识，以及 provider 页面关于浏览器 session/桌面凭据的边界说明。这些部分已经具备产品辨识度和可追溯的 Figma/代码来源。

**已经偏离**：相同语义的按钮和选择器在不同 CSS 文件中出现不同圆角、字号和 padding；动态模型/provider/status 使用固定下限或固定宽度；Landing footer 在窄屏裁切；Toolbar 同时承载页面、画布、任务、缩放和工具动作；任务列表首屏的本地 fixture 标识弱于工作台标题。

**可能由 AI 延展引入**：重复创建原生 `<button>`/`<select>`、直接在页面 CSS 写新字号/圆角/小数间距、为新功能追加工具栏入口、绕开 `UiIcon` 直接引入图标库、用固定宽度“修正”短文案而未考虑长文案和本地化。这些是从源代码形态和 inventory 推断的生成路径，需在后续提交中用 diff 逐项确认，不把推断当作历史事实。

### 交互和状态

- 模型和模式弹层能够打开，任务、缩放、小地图、工具等 popover 有真实开关行为。
- 对话和任务状态中已有关闭、发送、取消、重试、离线等工程状态，但状态覆盖应继续以控件契约记录，而不是散落在页面 CSS/handler 中。
- `TaskPanel` 在没有 live task 时回退到固定 `PROTOTYPE_TASKS`，包括 `2026/9/5`、`50S` 和 `正在生成中`。任务工作台标题和详情有 Prototype 说明，但任务触发按钮与列表首屏不总是把“本地演示”放在最明显的位置，存在被误读为真实历史任务的风险。
- 账号 popup 展示 `YYYKK`、UID、积分等演示信息；账号、积分、订阅、版本更新和连接测试必须继续保持真实边界说明或禁用语义。
- 全局存在 focus 样式和 hover brightness 补充规则，但还需要逐组件核对键盘焦点、`aria-expanded`、`aria-pressed`、禁用原因、加载中和错误反馈。

### 响应式

1440px 下固定 1920×1080 surface 经过缩放后保持了 Figma 坐标，桌面壳层稳定。390px 下 `Sidebar` 收缩后主内容只有约 329px，Landing composer 的右侧模型、批量和其他选择控件无法完整呈现；Workspace 的聊天面板没有明确转为底部 sheet、全屏层或 More 菜单。这是信息优先级和布局规则缺失，而不是单个断点数值的问题。

### 固定宽度逐项检查

| 位置 | 当前宽度策略 | 判定 | 应采用的策略 |
| --- | --- | --- | --- |
| Landing `.start-composer` | 桌面 `1052.344px`，内部 textarea/footer `1006.742px` | 作为 1920 Figma frame 的 measured geometry 可以保留；在 390px 仅靠 `width:100%` 仍不足以解决 footer 子项溢出 | 外框 desktop fixed、窄屏 Fill；footer 采用主操作固定 + 次要项 Wrap/More；内部文本 `min-width:0` |
| Landing model picker | `width:max-content; min-width:101.727px; max-width:260px` | 方向正确，但长 provider/model 与相邻 batch 控件仍需要压力测试 | Hug + min/max + ellipsis + tooltip；操作组 `flex:0 0 auto` |
| Conversation model picker | `min-width:58px; max-width:220px`；若干 footer button `58px` | 58px 作为 icon/短标签下限可以成立，作为动态模型名的固定宽度会失衡 | `width:max-content`，保留 min/max；文字 `min-width:0`，按钮不被挤压 |
| Workspace creation/input | 多处 `590px`、`400px`、`370px` | 400×400 预览卡和 590px 输入字段是 Figma 内容基线；不能直接套到窄屏 | desktop measured fixed；viewport 不足时 Fill/Max-width 100%，内容区独立 Scroll |
| Assets modal/grid | modal `900px`，侧栏/卡片约 `232px`、`380px` | 桌面信息密度合理；需要验证窄屏筛选与三列网格是否变为单列/横向滚动 | modal `min(900px, calc(100vw - 32px))`；grid 使用 `minmax()`；筛选行 Wrap |
| Settings | panel 约 `300px`，导航/字段约 `263px`、`128px`、`100px` | 导航列可以固定，字段和 provider 名称不应被固定值限制 | 导航 rail Fixed；内容 Fill；字段 Hug + min/max；错误提示可换行 |
| Task panel/workbench | task panel 约 `196px`；任务缩略图和状态区域有固定卡片尺寸 | 卡片 preview 可固定，状态和项目名是动态文本 | preview slot Fixed；名称/status Truncate；列表 body Scroll；首屏 Prototype 标签 |

因此，审计并不把所有 fixed 值判为错误：有 Figma 证据的 desktop canvas/card/toolbar 基线可以固定；真正需要优先修复的是把固定值放在动态文字、移动端 footer 或会被挤压的动作组上。

## B. UI Drift Report

### 高优先级

| ID | 漂移 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| H1 | 组件 ownership 分散 | 223 个原生 button，`.ui-button` 仅 16 处；没有集中组件契约 | 同语义控件不可预测，AI 新增页面会继续复制差异 | 先建立 Button/IconButton/Input/Select/Badge/Capsule/Modal/Tooltip 基础层，逐页迁移 |
| H2 | 窄屏横向溢出 | 390px Landing 截图；`start-composer` desktop 宽 1052.344px，footer 控件仍按横向排列 | 关键生成操作被裁切，移动端不可完成核心任务 | 定义控制优先级；主操作保留，次要项 Wrap/Scroll/More；所有 flex 子项加 `min-width:0` |
| H3 | 固定宽度与动态文案冲突 | chat model picker `min-width:58px; max-width:220px`，多处固定宽度/小数几何 | provider、模型名、状态和本地化文本容易截断或挤压邻居 | 动态文本控件使用 Hug + Min/Max + ellipsis + tooltip，动作区 `flex:0 0 auto` |
| H4 | 检查门禁覆盖不足 | `check-ui-standards.mjs` 当前输出 115 个文件、0 项违规，但规则主要检查 token、颜色、Lucide、行数、Iconsax | “通过”不能说明排版、几何、overflow、ARIA 或 Figma parity 通过 | 扩展 lint/采样到 type/radius/spacing/geometry/overflow/ARIA/visual evidence |
| H5 | Prototype 信息层级不一致 | `TaskPanel` 固定 demo 任务；workbench 才在标题中明显标 `PROTOTYPE` | 用户可能把演示任务、积分或账号状态当成真实服务结果 | 在触发器、列表首屏和空态统一放置 Prototype/本地演示语义；真实服务接入前不伪造成功 |

### 中优先级

| ID | 漂移 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| M1 | 字体层级过多 | 11px、12px、10px 使用频繁，同时存在多个 Figma 小数值 | 视觉层级难以预测，文本密度差异大 | 保留四级 canonical type；小数只作为带节点引用的例外 |
| M2 | 间距和圆角未完全收敛 | 4/5/6/7/8/9/10/12/14/16/18/20 等重复值 | 组件间节奏不统一 | 先将新代码限制在 4/8/12/16/24/40；旧值建立迁移清单 |
| M3 | 工具栏和上下文操作层级混杂 | Workspace 同时有 task、zoom、map、tool、bottom toolbar、chat | 常用操作和低频操作争夺同一视觉层 | 按 IA level 重排，低频项进 More/context menu，主操作保留直接可见 |
| M4 | 图标来源存在双轨 | 已有 `UiIcon`，但 inventory 显示 12 个文件仍直接引用 iconsax | 线宽、尺寸、命名和可访问性难统一 | 统一通过 `UiIcon` 或项目 Figma 导出；增加静态检查覆盖多行 import |
| M5 | 面板尺寸语义重叠 | panel/menu/card 使用多个页面级定义和例外小数 | modal、popover、card 的层级边界不清 | 明确 surface contract：card 28、panel 20、menu 12、modal 使用单独层级 |

### 低优先级

| ID | 漂移 | 影响 | 建议 |
| --- | --- | --- | --- |
| L1 | 个别 Figma 测量值直接出现在 CSS | 后续维护者难判断是否可改 | 用注释记录节点 ID 和保留原因 |
| L2 | z-index 数值较多 | 新弹层可能发生遮挡 | 建立 overlay 层级 token，并以组件类型分配 |
| L3 | 旧 CSS 与页面 CSS 共同存在 | 规则来源难追踪 | 迁移后按 feature/primitive 拆分；本轮不做全量重写 |
| L4 | 部分小图标命中区域依赖外层按钮 | 键盘和触控测试成本增加 | 统一按钮尺寸和 accessible name；移动端优先 44px 命中区 |

## C. Existing UI Source of Truth

### 已确认的工程真相

运行链路是：`index.html → /src/main.tsx → src/App.tsx`。`main.tsx` 先加载 `global.css` 与 `ui-tokens.css`；`App.tsx` 按 `workspace.css → responsive.css → sidebar.css → account-popup.css → catalog-pages.css → conversation-panel.css → design-surface.css` 加载页面 CSS。根节点带有 `data-runtime-entry="src/main.tsx"`、`data-runtime-mode="development"` 和 `data-design-surface="desktop"`，可用于后续复核当前加载产物。

代码侧的重要入口：

- [main.tsx](../../../src/main.tsx:1)：React 入口和全局样式首层。
- [App.tsx](../../../src/App.tsx:159)：页面 CSS 加载顺序；[App.tsx](../../../src/App.tsx:1428)：运行态标识、壳层和 state-driven 页面切换。
- [global.css](../../../src/styles/global.css:5)：语义颜色、侧栏/对话宽度、桌面 1920×1080 surface 缩放。
- [ui-tokens.css](../../../src/styles/ui-tokens.css:53)：圆角、字体、控件高度、间距、图标和 motion token；[ui-tokens.css](../../../src/styles/ui-tokens.css:164)：现有 `.ui-button` CSS utility。
- [catalog-pages.css](../../../src/styles/catalog-pages.css:71)：Landing composer 的桌面 Figma 测量值；[catalog-pages.css](../../../src/styles/catalog-pages.css:566)：窄屏覆盖。
- [conversation-panel.css](../../../src/styles/conversation-panel.css:158)：对话 model picker 的 min/max/ellipsis 行为。
- [TaskPanel.tsx](../../../src/components/canvas/TaskPanel.tsx:11)：固定 Prototype task fixture；[TaskPanel.tsx](../../../src/components/canvas/TaskPanel.tsx:81)：live task 为空时回退到 fixture。
- [TaskWorkbench.tsx](../../../src/components/TaskWorkbench.tsx:49)：任务工作台的 Prototype 边界文案。
- [check-ui-standards.mjs](../../../scripts/check-ui-standards.mjs:27)：当前标准检查的实际范围。

### Figma 真相

当前可访问的 Figma 文件是 `0nU0A7pq6eyjwfwm1TtWkO`：

- `404:28667`：`Runtime / Workspace`，1920×1080，作为 Workspace 主 shell/canvas/chat 基线。
- `410:67357`：`Runtime / Workspace / 收纳`，1920×1080，作为无对话/收纳态基线；可读到任务按钮、隐藏对话 rail、顶部栏、底部工具栏和点阵画布结构。
- `410:67353`：卡片展示 frame。
- `458:948`：创建卡片，含 400×400 占位卡和 134×40 上传按钮。
- `458:972`：输入字段实例，含 590×237 的输入/composer 结构。
- `312:2436`：个人信息 popup，260×230，内含 236 宽操作区和积分面板。
- `410:59708`：本轮 `get_metadata` 返回 node not found，不能继续作为当前 Landing 基线；后续 Landing 改动前必须在 Figma 中重新建立当前 frame。

最佳 source of truth 是“当前 Figma frame + 工程 semantic token + 同状态浏览器证据”三者联合：Figma 定义结构与视觉目标，token/primitive 定义可复用实现，浏览器 DOM/计算样式定义真实加载结果。只看 CSS、只看 Figma 或只看构建结果都不能完成验收。

### 目前标准检查的边界

`node scripts/check-ui-standards.mjs` 本轮输出 `UI 标准检查：115 个文件，0 项违规。`。这只能证明当前脚本覆盖的 token 引用、颜色基线、Lucide 导入、组件行数和 Iconsax 规则未报错，不能证明排版、间距、圆角、固定宽度、响应式、ARIA、动效或 Figma parity 已通过。因此应把该命令定位为静态底线，而不是完整 UI gate。

## D. Proposed Design System

以下方案以现有 token 为基础，先收敛规则，再逐页迁移；不要求现在立即重画所有画面。

### Foundations

| 层 | 建议契约 |
| --- | --- |
| Semantic color | `bg-app`、`bg-surface`、`bg-card`、`bg-input`、`bg-accent`、`border-default`、`border-subtle`、`text-primary`、`text-secondary`、`text-tertiary`、`text-accent`、`text-danger`；新增颜色必须先进入语义层 |
| Typography | `caption 11/14 400`、`body-sm 12/16 400`、`label 14/20 500`、`title-sm 16/22 600`；modal/page heading 可增 `display 24/30 600`；8/9/10px 仅用于有 Figma 节点证据的 metadata |
| Spacing | canonical 为 4/8/12/16/24/40；2 只用于图标与边缘关系；5/7/9/11/13/15 等旧值保留迁移清单，不再作为新组件默认 |
| Radius | control 10、menu 12、panel 20、card 28、pill 999；4 用于分隔细节，6 用于内部紧凑 row；其他值需节点引用 |
| Border/focus | 默认 1px；键盘 focus 2px，offset 3px；disabled 使用同一语义表面并降低对比度，不用透明到看不出原因 |
| Icon | 14/16/20/26 四级 slot；保持 SVG 原始比例；优先 `UiIcon` 或项目 Figma 资源；图标不能替代 accessible name |

### Component contracts

| 组件 | 变体和尺寸 | 关键行为 |
| --- | --- | --- |
| Button | `primary/secondary/tertiary/danger`；`compact 28/32`、`standard 40`、`mobile 44` | default/hover/active/focus/disabled/loading；action text Hug，action slot `flex:0 0 auto` |
| IconButton | `ghost/secondary/danger`；外层 32/40/44，图标 14/16/20 | 必须有 `aria-label`；tooltip 不代替 label；不能裸放 20px 命中区 |
| Capsule | filter/selection/status/metadata；28/32 高，999 radius | 语义是状态或筛选，不承担主要提交；动态文本 ellipsis + tooltip |
| Badge | count/status/metadata；20/24 高 | 非交互；不承载长句；状态颜色来自 semantic token |
| Input | compact 32、standard 40；padding 8/12，radius10 | placeholder、focus、error、disabled、loading、offline 状态明确；文本容器 `min-width:0` |
| Select | Hug + min/max 或 Fill；compact/standard | provider/model 名称允许增长；超长显示省略并提供完整 title；菜单 12 radius |
| Card | 28 radius；内容 padding 16/24 | preview、creation、asset、task card 使用变体，不自行重定义圆角 |
| Panel | 20 radius；surface elevation 由 token 控制 | 明确标题、内容、footer；滚动区域独立，避免整个壳层 hidden |
| Modal | overlay、header、body、footer；桌面 max-width，移动端宽度由 viewport 决定 | Esc、outside click、focus return、loading/error/cancel；Prototype 边界放在首屏可见位置 |
| Toolbar | 50 高 Figma 基线，内控件 31/40 | 高频动作直接可见；低频动作进入 More；窄屏 Wrap 或横向 scroll，不裁切交互控件 |

## E. Layout Rules

1. **Fill**：app、workspace、canvas、侧栏 rail、panel 外框填充父容器；父容器负责 min/max，不让子组件自行猜 viewport。
2. **Fixed**：仅用于 Figma desktop surface `1920×1080`、icon slot、已验证的 modal max-width、明确的 toolbar height。固定宽度不能用于会随 provider、模型名、状态或本地化文本变化的控件。
3. **Hug**：按钮 label、badge、capsule、菜单项按内容 Hug；同时给出 min/max，避免一个长名字撑破整行。
4. **Min/Max**：动态 select/model/provider 使用 `min-width:0`、合理 min/max 和 `text-overflow:ellipsis`；需要查看完整文案时提供 title/tooltip 或详情面板。
5. **Wrap**：Landing composer footer、settings row、移动端 toolbar 在可用宽度不足时按优先级换行；主操作与输入不被次要筛选项挤走。
6. **Scroll**：资产卡片、任务列表、弹层 body、菜单超出时由内部区域滚动；横向工具区使用明确的 `overflow-x:auto` 和可见滚动 affordance，不能靠父层 `overflow:hidden` 把按钮裁掉。
7. **Truncate**：动态名称、provider、task status、asset title 使用单行省略；多行 prompt 设定 max line，并保留查看详情的路径。
8. **Flex/Grid**：flex 子项默认加 `min-width:0`；动作区 `flex:0 0 auto`；卡片网格使用 `minmax()`，不要用一组固定 400px 卡片挤压窄屏。
9. **Responsive matrix**：至少在 390、768、1440、1920 检查；桌面与 Tauri release 还要分别确认加载产物和窗口尺寸。
10. **Interaction hit area**：桌面紧凑控件最低 32px，标准控件 40px，窄屏独立触控动作 44px；24px 只允许作为更大按钮内部的 icon slot。

## F. Information Architecture

| 层级 | 内容 | 直接可见规则 |
| --- | --- | --- |
| L0 Shell | TopBar、Sidebar、全局 account/setting 入口 | 永久可见，状态清晰 |
| L1 Primary nav | Landing、项目/Workspace、收纳、Assets、Skills、ComfyUI | 只放高频目的地；选中态统一 |
| L2 Page header | 页面标题、项目名、当前状态、主动作 | 一屏只保留一个主动作层级 |
| L3 Main content | Landing composer、Canvas、Asset library、Settings content | 页面任务的主要工作区 |
| L4 Context | model、参数、zoom、map、node actions、chat actions | 与当前对象相邻；不和全局导航混在一起 |
| L5 Metadata/status | provider、prompt hash、asset id、task status、Prototype | 可读、可复制、可追溯；状态不伪装成动作 |
| L6 Rare/advanced | MCP、网络、高级、危险操作、系统/桌面专属 | 进入 Settings、More 或 confirmation flow |

建议保留在首屏：创建/发送、当前模型、当前任务状态、关闭/返回、当前对象的关键动作。建议收纳：缩放明细、小地图设置、排序、导出格式、低频节点工具、MCP/高级连接。Hover 只用于预览和辅助说明，不承载唯一可达路径。Context menu 只放当前对象动作；Settings 负责 provider、连接、凭据、记忆和桌面专属能力。

## 当前阶段不应触碰的部分

- 不先替换现有颜色和兔子品牌资源；先保持已确认的 Figma shell 视觉语言。
- 不先重写全部 CSS 或引入第二套 UI framework；先建立 primitive ownership，再做局部迁移。
- 不把 badge、capsule、button 的语义合并成一个“万能 pill”。
- 不用任意 breakpoint 覆盖去掩盖固定 surface 的根因；先写响应式契约。
- 不依赖已经失效的 Landing Figma node `410:59708` 做像素验收。
- 不新增真实账号、积分、任务持久化、服务器保存或生成成功承诺；Prototype 和 offline 语义必须保留。
- 不在组件 ownership 尚未明确前，逐个调整 35.078、19.293 之类的测量小数；它们需要先标出 Figma 来源。
