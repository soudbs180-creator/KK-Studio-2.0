# Verification

设计读取：2026-11-09，Figma `ZiadpErDoFweCjG3uHjkM3`，节点 `47:184`。

## 浏览器

命令：`npm run dev -- --host 127.0.0.1 --port 1421 --strictPort`。模式：Vite development。地址：`http://127.0.0.1:1421/`。

1440×1000 计算样式：

- 说明文字 12px / 16px，字重 360
- 步进器 134×32；数值 16px / 24px，字重 460
- 「管理快捷键」32 高、8px 圆角、1px 描边
- 下拉 32 高、12px / 16px、字重 460，宽度贴文案
- 「软件更新」在首屏内（y 789，高 40，视口高 1000）
- 首页输入框 652×158
- 生成数量 21×32，文字 `x1`
- 参数摘要「自适应 · 1K · 最小」
- 项目库搜索框高 40，空状态文件夹图标 24×24
- 画布底栏 288×52
- 展开侧栏品牌兔子背景 `rgb(160, 160, 160)`

390 宽：顶栏搜索、设置、菜单和账号图标都是 12×12，按钮盒子仍是 44px。手机设置仍是浮层，没有整页重构。

截图：`/opt/cursor/artifacts/` 下的 `settings-general-1440.png`、`settings-390.png`、`home-1440.png`、`home-390.png`、`projects-1440.png`、`sidebar-expanded-1440.png`、`sidebar-collapsed-1440.png`、`canvas-1440.png`。

路由到页面：`/` → `App.tsx` → 开始创作 `StartPage`，设置 `SettingsPanel`，项目库 `ProjectLibraryContent`，画布 `Canvas` + `CanvasToolbar`。

## 门禁

- `npm run typecheck`：通过。
- `npm run tokens:check` 与 `npm run ui:check`：通过。`design:sync` 已更新 `DESIGN.md` 投影。
- `npm test`：与本次改动相关的设计令牌测试通过。`tests/unit/worktreeLifecycle.test.ts` 在这台 Linux 环境把 `D:/kk-studio/...` 拼进了仓库路径，改动前就会失败，记为预存失败。
- 浏览器计算样式和截图见本记录后半，运行方式是 Vite development，端口 1421。

## 性能

看过的体积：`settings.css` 3262 行，`workspace.css` 3389 行，`App.tsx` 1706 行，`ConversationPanel.tsx` 300 行，`Canvas.tsx` 295 行。没有渲染次数或打包体积证明拆组件会更快，所以没有拆这些文件。

实际做的收敛：

- 画布底栏宽度从 294 / 244 / max-content 收成 `.canvas-toolbar` 上的一条 `--kk-canvas-bottom-toolbar-w`（288）。
- 设置步进器和贴内容下拉改成共享控件，删掉原来叠在上面的原生外观和像素尺寸。
- 侧栏图标统一成块级，避免行内 SVG 和旧 `img` 规则各算一次位置。

## 待产品确认

- 第 9 条默认模型名仍是本地真实模型，不是设计稿示例「Nano Banana 2.1」。
- 第 12 条侧栏分组上的折叠、更多、打开项目库没有删。
- 第 17 条手机设置仍是浮层，没有改成全屏单页。
- 第 21 条收起侧栏的当前页高亮保留。
- 第 22 条账号名 Prototype 保留。
- 第 16 条左侧个人信息入口保留，原因见 review.md。

## 云端没法验证

- Desktop / Tauri 窗口和系统托盘。
- 有真实项目数据时的项目行、悬停和选中。
- 浅色主题全套六态。
