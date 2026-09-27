# Verification：现行 UI 规则与真实操作回归

- Task ID：TASK-UI-010
- 记录状态：复核修复后的本地验证与独立代码审查 PASS；hosted CI 和产品验收待完成
- 时间：2026-09-25，Asia/Shanghai
- Intent / Spec / Plan：本目录同名文件
- cwd / branch：`D:/kk-studio/.worktrees/TASK-UI-010-ui-regression`；`fix/TASK-UI-010-ui-regression`
- base SHA：`76339c9f5cd1a1b2affea6b4c3d247de7188da18`
- 首轮实现 SHA：`6f57e025aa7f7f5d70e2b585cba45c70f56dd1ad`；复核修复基于其后的草稿[PR #19](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/19)，最终提交以 PR head 为准。
- 环境：Windows、Node 24.21.0、Playwright Edge、Vite production preview 1423。

## 实际检查

| 命令/检查 | 结果 | 范围与限制 |
| --- | --- | --- |
| `npm run agent:install && npm run agent:build` | PASS | 补齐独立 worktree 的 Agent runtime |
| `npm run plugins:install && npm run plugins:build` | PASS | 4 个随包画布插件；未构建时菜单数量会少 4 项 |
| `npm run typecheck` | PASS | 当前候选类型 |
| `npm run ui:check` | PASS | 167 文件，0 违规；候选 `tokens.css` 未引入运行态，误引入有门禁 |
| `npm run build` | PASS | 复核修复后的界面产物 `index-C6vgcEAa.js` / `index-kT3qdYgC.css` |
| 画布导航/拖连/交互定向 | PASS | 18/18，Edge preview；旧测试的菜单数量需在插件构建后复验 |
| 设置/目录/MCP/桌面 Agent 模拟定向 | PASS | 补齐插件构建后设置页 24 项通过 |
| Agent/长模型/Provider 定向 | PASS | 当前修正后的 3 项通过 |
| 空白项目/持久化/设置几何定向 | PASS | 14/14；新建项目 0 节点，设置标题偏移 364×38 |
| 图片生成/取消/限流定向 | PASS | 8/8；先在空白画布真实添加图片节点 |
| 项目库空态与手机扩展标签 | PASS | 原假项目卡移除；390px 三标签单行、44px 命中 |
| Figma `483:695/753/588/1042` 与六处浏览器批注 | PASS | 四节点已读取，几何与交互写入 Design System/UI 规则；首页、模型、搜索、画布与对话定向回归通过 |
| 复核问题定向回归 | PASS | 对话拖宽按钮间距、侧栏实际可调整、可达 `aria-valuemax`、Shift+Home 默认宽度、模型菜单方向键/Home/End；10/10 Edge。先写失败断言再修复 |
| 完整 `npm run verify` | PASS | 复核修复后 370/370 Node、319/319 Edge browser；治理/功能登记/Markdown/UI/类型/格式/构建均通过。首轮因两处 CSS 格式停下的日志保留为 `evidence/verify-review-fixes.log`；完整通过日志为 `evidence/verify-review-fixes-final.log` |
| 42 态页面采集 | PASS | 复核修复后重新执行 `evidence/capture-architecture.mjs`；1440/390 各 21 态，`evidence/architecture/metrics.json` 中整页水平溢出均为 0 |
| `npm run client:build:agent -- --no-bundle` | PASS | 复核修复后 fresh Tauri release，含 Agent runtime；构建日志 `evidence/build-desktop-review-fixes.log` 与新 EXE SHA-256 见 `evidence/desktop-runtime.json` |
| `node docs/changes/2026-09-24-ui-regression/evidence/check-desktop.mjs` | PASS | 隔离原生数据与 WebView profile；原生窗口、空项目、设置、伙伴、Figma 首页尺寸、显式对话开关与 bundle SHA 验证 |
| `node docs/changes/2026-09-24-ui-regression/evidence/check-web-figma.mjs` | PASS | 真实 1423 预览加载最终 dist；882/1280/390 布局、模型菜单、搜索选线、画布底栏、对话同位，页面错误 0 |

## UI 与运行态证据

- 预览由 Playwright 启动：`vite preview --host 127.0.0.1 --port 1423 --strictPort`，URL `http://127.0.0.1:1423/`；最终产物以 `evidence/web-figma-runtime.json` 记录 production、入口 `src/main.tsx` 与实际 JS/CSS 哈希。`evidence/runtime.json` 是此前候选快照，不代表最终 bundle。
- 页面链：`index.html → src/main.tsx → src/App.tsx → StartPage/Canvas/ConversationPanel/SettingsPanel`；预览读取当前 worktree 的 `dist`。
- 同态截图：`evidence/web-home-882.png`、`web-home-390.png`、`web-model-picker-1280.png`、`web-search-882.png`、`web-canvas-882.png`、`web-chat-882.png`；42 态目录见 `evidence/architecture/`；原生 `desktop-native-home.png`、`desktop-native-partners.png`、`desktop-native-empty-projects.png`、`desktop-native-blank-canvas.png`。设置 920×700、标题偏移约364×38；手机扩展标签不换行。
- 首页输入在882px窗口实测652×170/r20；手机输入306×202，较Figma静态170px增高是44px触屏目标及两行工具栏的设计系统优先规则。模型菜单高窗口227×318；715px高窗口按可用空间限制为227×294，保持内部滚动。搜索选线位于标签底边并随选中项移动；882px画布底栏为288×50，无原先大块尾部空白；平板对话开启/收起按钮均为x810/y72/44×44。
- 原生窗口：`http://tauri.localhost/`、production、独立 `--data-dir` 与 `WEBVIEW2_USER_DATA_FOLDER`；原生 JS/CSS 和最终 `dist` SHA-256 逐字节一致。`evidence/desktop-runtime.json`、`desktop-native-*.png` 记录实际结果，页面错误 0；本轮没有触碰正常用户数据目录。
- Web 与 Desktop 实际加载同一 JS SHA-256 `40a1cc3af407c66ad9267fbe64e07cba45c07471bb8e5391ddda1c41871b66eb` 和 CSS SHA-256 `0995b2c75f9fc7dda359331d541defa06c7394efc7b04b0f19cd1047ae37ad9f`；新 EXE SHA-256 `3caa4b18a520a2e7044de6a7930a94dddd04c556915f07519eb87daf020597a3`。
- 根工程 1421 是另一份 dirty 源码的 Vite development，不能用来证明本 worktree 的结果。旧桌面快捷方式指向不存在的旧路径，旧 release EXE 早于 UI 变更。
- 本轮按新 UI 类型补齐资产 A1 与提示词 A2+A4、目录 A2、搜索弹层和空态；42 态截图与浏览器几何断言排除已确认偏差。新增 `tokens.css/json` 与 `UI_ARCHETYPES` / 运行 token 仍有 200/56 对 291/40 等冲突，在线 Ardot 未回读，不能宣称整站完成 token 真源迁移；见 `architecture-audit.md`。
- 本轮未访问真实 WorkBuddy、豆包、付费 Provider 或用户资产账号；其登录和调度不能由 UI 回归证明。

## 待关闭项

- 侧栏 `KK项目 / KK工作流` 仍为静态演示行，未绑定真实项目快照；跟进 `TASK-PROJECT-SIDEBAR-001`。本轮项目库空态与新建空白项目已按真实数据验证。
- 草稿 PR 已建立；独立 AI reviewer 初审发现五项 P2（对话头部位置、宽度语义与恢复、模型菜单键盘、旧资源证据），复审 `3db7b69` 确认全部关闭且无新增 P0/P1/P2。Hosted CI、用户产品验收及原根工程/正式安装包整合仍待门禁；此 worktree 的 EXE 不是用户当前桌面快捷方式运行的文件。
- 用户视觉验收与发布状态未发生。

## 2026-09-27 首页模型菜单缺陷补验

- 独立只读补查发现：空配置时菜单仍列出可点击的 `kk-image-2`，选择后 `providerConnectionId` 为空。它违反本任务 spec 的真实 BYOK 图片模型清单。新增 `figma-483-ui.spec.ts` 空配置断言在旧实现稳定失败（预期 0 行，实际 1 行，两次均复现）。
- 修复仅移除 `StartModelPicker` 的未绑定静态选项；已保存的图片连接仍按连接 ID 列出，禁用/隔离状态沿用原门禁。已配置用例增加第二连接，保持方向键/Home/End 的多项真实检验；旧测试中对静态模型的预期改为真实空态。
- 本次候选：`tsc -b`、Vite production build、ESLint、Prettier、治理 72/0、功能 32/0、Markdown 89/0、UI 167/0、Node 456/456、Edge production preview 320/320，`git diff --check` 通过。预览由 Playwright 在 `http://127.0.0.1:1423/` 启动，页面链仍为 `index.html → main.tsx → App → StartPage → StartComposer → StartModelPicker`。
- 旧 Desktop release 与 42 态截图仍代表此前提交；此补丁后的 fresh Desktop、最终 head 独立复审、Hosted CI、用户视觉验收和 token 冲突裁决均未完成。不能由 Web 回归推定正式安装版已更新。

## 2026-09-27 最新主线集成补验

- #19 任务工作树合入 `origin/main@a89792ad`（主线已含 #14/#15/#16），六处冲突均限于进度、功能登记与任务账本；按功能/任务 ID 保留双方内容，未以整文件覆盖。`docs/features/README.md` 自动合并，业务源码无冲突。
- 合并树本地 `npm run verify` 通过：ESLint 0、治理 72/0、功能 32/0、Markdown 89/0、Node 456/456、UI 标准 167/0、格式检查、类型检查、生产构建和 Edge 浏览器 319/319。第一次完整跑测有两项首次失败但重试通过，根因分别是侧栏 300ms 宽度过渡期间的断言和图片请求尚未到达模拟 Provider 时即取消；测试改为等待真实宽度动画完成与路由已收到请求，定向 `--repeat-each=16 --retries=0` 为 32/32，通过后的完整 `verify` 为 319/319，无重试。
- 本轮技术集成保持运行 UI 的 291px 侧栏和 40px 顶栏。未接线的 `tokens.css/json` 仍是 200px/56px，未声称 token 单一真源已完成。先前 42 态 Web/隔离原生视觉证据来自 UI 源码 `3db7b69`；合并主线后完整浏览器回归通过，但 fresh Desktop release 尚未重建。当前精确 head 的独立审查与 Hosted `verify`/`delivery` 仍需提交后核对。
