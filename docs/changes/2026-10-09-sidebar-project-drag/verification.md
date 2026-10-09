# Verification：修复侧栏项目拖拽

- Task ID：TASK-UI-015；状态：PASS（本地端口受并发任务占用，GitHub quality #303 的完整 verify、delivery、deploy-linux 均成功）；[intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[review](review.md)。
- Base：8090475958f1a0bdd1b4b36ada7f2aba1e4e6264；任务树 `.worktrees/TASK-UI-015-project-drag`；Node24.21.0/npm、Windows/WebView2、Playwright Edge。以下运行发生于提交前的任务候选，构建身份由实际 hash 绑定；独立审查另绑定已提交 SHA。

## 用户契约与根因

1. 原始空组标题投放失败（没有文件夹）；文件夹内容投放错误创建第二个文件夹。新增两条浏览器测试先 RED，原件 `.tmp/project-drag/browser-red.log`，修复后侧栏三文件35条串行、零重试通过（`browser-green-serial.log`）。
2. Windows 原生窗口默认拖放接管阻断 WebView2 HTML5 DnD：同一最终 Win32 鼠标驱动在旧 release2.1.12 收到 dragstart，但没有 dragover/drop，未分组项目仍在。官方依据：[Tauri WindowConfig](https://v2.tauri.app/reference/config/#windowconfig)，Windows HTML5 拖放需关闭该开关。
3. 修复包关闭主窗口 dragDropEnabled，项目标题使用现有项目 ID MIME 和 dropToSection；文件夹整体接收 dropProject，阻止冒泡。因此自动文件夹按现有项目名创建，已有文件夹内投放成为子项且不重复建文件夹。

## 同一真实鼠标驱动的 Desktop RED/GREEN

- 命令：`node tests/desktop/sidebar-project-drag.mjs`；通过 `KK_PROJECT_DRAG_EXE` 指定候选/旧 EXE，`KK_PROJECT_DRAG_OUTPUT` 隔离证据、数据根和 WebView2 profile；旧包另用 `KK_PROJECT_DRAG_CASE=folder`。CDP9375只用于取 DOM/截图，实际 drag 使用 Win32 系统鼠标，所有测试项目从 UI 创建。助手处理 DPI/前台窗口；确认 DOM 消费释放动作后才恢复光标/前台。
- RED：旧包 `D:/kk-studio/KK-Studio-2.0/src-tauri/target/release/kk-studio.exe`；sha256 `5de00a4d0679a359422388fc1be9f4024075f5a1a495667e15d97a8b44c3a3ec`，实际 production bundle `index-DP4RQQ71.js`。最终驱动 exit1、无法收到 dragover；[原始收据](evidence/native-red.json)。
- GREEN：`D:/kk-studio/.verification/TASK-UI-015-project-drag/rust-target/release/kk-studio.exe`；sha256 `8c7491d19da2804f3ef1c2c68f1d88d8830f9fc749914000a87c26a3d3f0fb84`；实际 `http://tauri.localhost/`、production、entry `src/main.tsx`、bundle `index-CiRlpbQ8.js`。隔离 storage root 核对一致，四条路径全部通过，正常关窗exit0：[收据](evidence/native-green.json)、[同态截图](evidence/native-green.png)。
- 四条验收：空项目标题自动建同名展开文件夹；折叠文件夹标题收纳并展开；已有内容区新增第三个子项且仍一个文件夹；投放分组外第四个项目仍未分组。capture事件证据保留真实 drop 目标；未使用 native dragend 作为成功依据。
- 原生构建：`npm run agent:package`、`node node_modules/@tauri-apps/cli/tauri.js build --config src-tauri/tauri.agent.conf.json --no-bundle` 均exit0；设置独立 `CARGO_TARGET_DIR=D:/kk-studio/.verification/TASK-UI-015-project-drag/rust-target`。Agent资源与EXE相邻，没有覆盖当前安装包或快捷方式。
- `cargo check --manifest-path src-tauri/Cargo.toml` exit0；5条既有 dead_code 警告保留（`.tmp/project-drag/client-check.log`）。本次不修改Rust逻辑，不用check冒充Rust单测。

## Web运行链路

- 设计/来源：用户项目区截图 + 现行 [UI_INDEX](../../UI_INDEX.md)、[UI_RULES](../../UI_RULES.md)；复用 sidebar既有拖放 `--bg-elevated` / `--focus-ring`，不改变外壳几何。入口 `/`：main.tsx → App.tsx → Sidebar.tsx → SidebarProjectGroups → Header/Sections → FolderGroup/Entry；sidebar.css 由 App统一加载。
- Vite development：`node node_modules/vite/bin/vite.js --host 127.0.0.1`，1421 strictPort，加载 `/src/main.tsx`。
- Production preview：`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`，加载 `/assets/index-CiRlpbQ8.js`；production入口及bundle与新Tauri相同，JS sha256 `83af8c99dec7d59831b2bb9f2725bc4191d9a13fbc9260f7cfc05e55466922db`。标准1423补验 `errors: []`、`passed: true`。
- 两态使用同一空组/已有标题/内容/取消流程，取 DOM outerHTML、script/style顺序和1920/1099/390窗口截图。证据：[development（早期通过收据）](evidence/web-development.json)、[production1473原收据](evidence/web-production.json)、[production1423收据](evidence/web-production-1423.json)、[1423-1920](evidence/web-production-1423-1920.png)、[1423-1099](evidence/web-production-1423-1099.png)、[1423-390](evidence/web-production-1423-390.png)。窄屏只证明现有响应式Web，没有物理手机/触屏拖拽验收。

## 项目门禁及真实失败记录

| 检查 | 本轮结果 | 原始记录（任务树下） |
| --- | --- | --- |
| 初始lint/typecheck | PASS | `.tmp/project-drag/baseline-lint.log`；typecheck exit0 |
| 初始单测 | 802pass/2fail/8skip；两项Agent dist尚未准备 | `.tmp/project-drag/baseline-test.log`；按现有agent:build生成后复验 |
| 修复侧栏定向 | 35/35，workers1/retries0，PASS | `.tmp/project-drag/browser-green-serial.log` |
| 标准verify的lint/typecheck/root/Agent/UI/format/build | PASS；root804pass/8skip，Agent172pass/2skip | `.tmp/project-drag/verify-1423.log` |
| 标准1423全浏览器首轮 | 450pass/1flaky，零unexpected；既有几何动画捕获289预期291，retry通过 | `.tmp/project-drag/browser-full-1423-first.json` |
| 1423全浏览器补充，workers1/retries0 | 451/451，零skip/flaky/unexpected，exit0 | `.tmp/project-drag/browser-full-1423-serial.log` / `.json` |
| 严格development恢复 | GitHub quality #303 完整 verify 内含固定1421 development，job success；本机同阶段因另一个任务占用1421未启动 | `.tmp/project-drag/development-recheck.log` / `development-local-deps.log`；[quality #303](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/37885498868) |
| 完整verify | GitHub quality #303 success；delivery/deploy-linux 同 run success | [quality #303](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/37885498868) |
| 标准1423 Web 证据补验 | PASS；三视口、errors=[] | `evidence/web-production-1423.json` 及对应截图 |

- 首轮 `KK_TEST_PORT=1473 npm run verify` exit1：440pass/11fail（固定1423地址断言、伴随服务CORS及一项既有几何动画竞态）；保存 `verify.log`、`browser-failed-1473.json`，不能写成产品已通过。
- 第二轮默认1423 `npm run verify` 浏览器阶段完成（上述一项flaky），但完整命令exit1：本任务独立Vite占1421阻止development。自有进程已关闭，不停止其他任务进程；失败保留。
- development独立复验正确拦截16条字体403：初始node_modules junction指向主checkout，Vite默认fs边界不允许外部字体。四步插件生命周期已完成，但严格console断言仍失败；按原lockfile安装任务本地依赖恢复，不改Vite权限/测试断言、不写用户配置。原件 `development-recheck.log`。
- 依赖恢复：原lockfile在任务临时目录 `npm ci --ignore-scripts --no-audit --no-fund`（244packages/exit0）；核对junction目标后只删除任务链接，移入本地真实node_modules，主checkout的Vite文件hash保持一致。随后development1421与完整verify1423被另一任务验证占用；CIM父进程指向 `output/ui016-canvas-upload-20261009`，不停止或复用其进程。保存失败原件；GitHub quality #303 在干净CI环境补完相同门禁并成功。
- 测试维护：原section空白投放fixture实际在空文件夹内容内，新用户契约要求那里成为子项；改为两个文件夹之间的真实section间隙并断言elementFromPoint，不弱化自动建文件夹验收。外部text/File混合拖放仍不改变分组，取消无残留高亮。
- native早期CDP dragTo绕过旧故障；早期助手DPI、前台和光标恢复时序误差均保存原件，只以最终配对Win32 RED/GREEN作为原生结论。

## 交付边界

- Desktop/Web候选2.1.13、Mobile规划2.1.1，平台版本检查通过；数据identifier/key/schema未变。文件夹仍为当前会话Prototype，FEAT-023 PARTIAL、TASK-PROJECT-SIDEBAR-001持续开放。
- 本轮未合入main、未发布、未替换用户当前EXE/快捷方式或数据。Hosted quality #303 已成功；PR仍为草稿，用户最终体验和发布范围仍由后续验收决定。
