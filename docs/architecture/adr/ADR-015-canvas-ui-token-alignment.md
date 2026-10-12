# ADR-0001：画布视觉走 token 体系，停止 Figma 直抄

- 日期：2026-10-09
- 状态：已采纳
- 关联：`docs/UI_INDEX.md`、`src/styles/tokens.css`、竞品《MiniMax-Design-3.0.21-画布UI深挖.md》（在 `D:\kk-studio\` 容器目录）

## 背景

2026-10-09 对竞品 MiniMax Design 3.0.21（本地 `C:\Users\Administrator\AppData\Local\Programs\MiniMax Design\current`）做 asar 解包和 CSS 逆向时发现：

1. MiniMax 画布完全 token 化，所有视觉值挂在 `--canvas-*` 变量下（外圆角 10px / 内圆角 8px / 工具栏高 46px / 圆角 12px / 边框 1px / 选中色近黑 `#141414`），CSS 里没有任何"幽灵小数像素"。
2. KK 画布存在两类历史欠账：
   - `src/styles/canvas-navigation.css` 整个文件 55 个小数像素（`31.109px / 1.197px / 15.555px / 196.227px / 283.214px / 26.298px`），注释里直接写 `Figma 312:2679`、`Figma 100:16335`，是从 Figma 截图直接量出来的。
   - `src/styles/workspace.css` 49KB 中 20 个硬编码 hex（`#707070 / #313131 / #808080 / #363636` 等），集中在画布占位符和空状态，没回灌到 `--kk-*` / `--ui-*` token。
3. AGENTS.md 第 34 行和 `docs/UI_INDEX.md` 第 28 行其实早已规定："`tokens.css` 是唯一运行时源"、"Figma 四页 > tokens.css > 局部 CSS 字面量"。画布这块是 2026-09-29 治理之前的遗留，规则存在但没被执行。
4. 由此导致的具体错位：图片节点预览圆角 28px（竞品 8–10px）、图片节点选中高度从 458px 撑到 705px（竞品零布局偏移）、连线颜色 `#3a3a40` 硬编码 dark（light 模式不覆盖）、小地图 `#111` 底 `#444` 节点（light 下是黑块）。

## 决定

1. **画布所有视觉值必须走 token**。新增 `--kk-canvas-*` 命名空间（或复用现有 `--ui-*` 语义层），覆盖：节点圆角、节点边框色（默认/选中/生成中）、连线色（默认/hover/selected/流动）、工具栏尺寸、小地图配色、空状态占位色。
2. **禁止在画布 CSS 里出现非 token 的 hex 值**。`workspace.css` 里剩余的 20 个 hex 逐个回灌到 tokens.css 或 ui-tokens.css。
3. **禁止"Figma 量出来的小数像素"**。`canvas-navigation.css` 整个文件重写为 token 驱动，尺寸档位用整数（参考 MiniMax：高 46 / 圆角 12 / padding 2 / 图标 16 / 字号 13）。
4. **选中态零布局偏移**。节点尺寸在任何状态下不变；选中反馈只通过描边颜色/粗细变化实现，不改 width/height。
5. **主题双轨**。所有画布 token 必须同时定义 dark 和 light 两套值；light 下连线默认 `#c4c4c4`、小地图底 `#ffffffe6`、节点底 `#ffffff`。
6. **参考 MiniMax 的机制，但不抄色值**。描边独立层（`box-shadow inset / zoom`，缩放时屏幕像素恒定）、生成中呼吸动画、新节点入场 glow、resize handle 圆点样式——这些结构抄；具体品牌色（MiniMax 紫 `#6d6cff`）不抄，KK 用自己的 `--kk-accent`。

## 原因

- **Figma 直抄在 3 个场景崩**：DPR 1.25/1.5 屏上小数像素发虚；dark/light 切换时硬编码色穿帮；画布缩放时边框粗细跟着变（MiniMax 用 `box-shadow inset / zoom` 解决，KK 没有）。
- **token 化不是新负担**：KK 已经有完整的 `--kk-*` 三层 token 体系（tokens.css / ui-tokens.css / global.css），task-workbench、composer、catalog-pages 已经是样板，画布只是没跟上。
- **MiniMax 是最佳参照物**：同类型产品（多模态画布 + Agent 交付），token 命名空间清晰，CSS 可直接逆向作为对标基准。

## 后果

**变容易**：
- 主题切换、DPR 适配、缩放时边框恒定这三个问题一次性解决。
- 后续任何 UI 微调（改圆角、改连线色）只动 token，不用翻 49KB 的 workspace.css。
- 新 AI 改画布前读 ADR-0001 + tokens.css 就能进入状态，不用重新逆向竞品。

**变难**：
- `canvas-navigation.css` 需要重写，不是小改。
- `workspace.css` 20 个 hex 要逐个判断语义归属（text-tertiary? border-subtle?）。
- 图片节点选中撑高 composer 的逻辑（458→705px）要改成浮层，涉及 `CanvasNodeLayer.tsx` 的布局代码。

## 反对意见（被驳回的方案）

1. **"直接换成 React Flow"**：KK 手写画布已经有撤销/持久化/框选/连线/小地图全套，重写等于推翻。MiniMax 用 React Flow 是因为它是从 0 开始；KK 的资产不值得重写。
2. **"把 MiniMax 的 CSS 整个抄过来"**：品牌色、字体、间距档位不同，抄过来会变成"紫色版 MiniMax"。只抄机制和结构，色值走 KK 自己的 token。
3. **"维持 Figma 直抄，只修几个明显错位"**：小数像素在 DPR 变化时会持续产生新的错位，治标不治本。

## 2026-10-09 实测补充（打开 MiniMax 3.0.21 实际窗口观察）

启动真实应用（"H3轻量版-文生视频工作流-2"项目）后，对 CSS 逆向的结论做了以下修正：

1. **MiniMax 默认 dark，不是 light**。画布底是深色点阵（约 `#1a1a1a`），不是 CSS 里的 `#fafafa`。KK 默认 dark 是对的，**P2"默认主题改 light"撤销**。
2. **选中态真相**（点击视频节点后观察到）：
   - 视频自动开始播放，底部叠加半透明播放条（00:00 / 00:06）
   - 节点**尺寸不变**，右上角出现循环/下载图标
   - 节点右侧中间出现 **+ 连接 handle**
   - 节点**下方独立展开一张深色 composer 卡片**（宽约 600px，圆角 12px，含 prompt 输入框、参数行 "Minimax H3 | 全能参考 | 16:9·2K·5s | ×1"、左下角 600 积分、右下角发送按钮）
   - **这正是 KK 458→705px 撑高想做的事，但 MiniMax 用的是独立浮层，不是把节点撑高**。
3. **视频节点实际尺寸**约 360×200（16:9），圆角目测 6–8px，无可见边框（dark 下边框融入背景）。
4. **连线**是暗灰 1px 贝塞尔曲线，端点无圆点 handle；颜色在 dark 下约 `#3a3a3a`。
5. **多图堆叠缩略图**在节点右上方（灰色块，选中变紫），就是 CSS 里的 `--canvas-media-stack`。
6. **底部中央有浮动圆形工具栏**（+、播放、上下箭头、撤销、文件夹、?），深色胶囊背景——KK 完全没有这个组件。
7. **添加节点菜单**：文本 / 表格 / 图片 / 视频（带 "MiniMax H3" 标签）/ 音频 / 3D 导演台[新] / 视频剪辑[新] / ComfyUI 工作流[新]。深色浮层，每项图标+文字，右侧带产品标签。

## 落地清单（按优先级，已根据实测修正）

- [x] P0-观察：打开真实 MiniMax 窗口确认 dark 是默认主题、选中态是浮层不是撑高
- [ ] P0：图片节点预览圆角 28px → 8–10px（dark 下边框弱化为 1px `#2a2a2a`）
- [ ] P0：图片节点选中撑高 composer（458→705px）改为**节点下方独立深色浮层卡片**，节点尺寸恒定
- [ ] P0：连线颜色 token 化（dark `#3a3a3a`、light `#c4c4c4`），stroke-width 1.5
- [ ] P0：小地图配色 token 化（dark `#1a1a1a`、light `#ffffffe6`）
- [ ] P1：`canvas-navigation.css` 整个文件 token 化，清除 55 个幽灵小数 px
- [ ] P1：节点描边改 `box-shadow inset / zoom` 恒定粗细
- [ ] P1：节点右侧 + 连接 handle（hover 显示，选中常驻）
- [ ] P1：节点右上角操作图标（循环/下载）
- [ ] P1：底部中央浮动圆形工具栏（+、播放、撤销、文件夹、?）
- [ ] P2：生成中呼吸动画 + 新节点入场 glow
- [ ] P2：自动布局从硬编码 440×430 网格抽成 layout engine
- [ ] ~~P2：默认主题改 light~~（已撤销：MiniMax 默认也是 dark）
