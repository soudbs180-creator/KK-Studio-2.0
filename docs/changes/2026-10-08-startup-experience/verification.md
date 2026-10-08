# Verification：桌面与网页启动体验

- Task ID：TASK-LAUNCH-001；状态：IN PROGRESS；日期：2026-10-08（Asia/Shanghai）。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。
- branch/worktree：codex/TASK-LAUNCH-001-quiet-start，D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-LAUNCH-001。
- base（实现前）：5dd6e6dddaf00cf2d5c14ae02ef5974c72238232；本节绑定提交前实现，最终 SHA 收据另追加。
- 基线：独立 npm ci、lint、typecheck、desktopRelease 12/12 PASS；日志在工程外 output/quiet-launcher-baseline-*-20261008.log。
- 当前开发入口的 icon 指向旧 D:/kk-studio-next；canonical release 为 2026-10-01 产物，不能代表本轮源码。

## 实现与回归

1. 新 GUI 安装回归首次因 installer 缺失 RED；Windows 真实 .NET/COM/PE/子进程检查 GREEN：GUI 子系统 2、无控制台句柄、中文/空格/`&` 路径、后台无 pause、输出和失败退出码、取消仅结束自身进程树。日志 `D:/kk-studio/output/quiet-launcher-green-20261008.log`、`quiet-launcher-cancel-check-20261008.log`。
2. 首屏测试在旧实现 Canvas count=1 RED；本轮 count=0，返回工作区保留实例/撤销；等待关闭不迟到重开、保持打开后加载完成回焦、慢请求失败回焦/重试入口/草稿保留共 5 项 GREEN。先前 19 项定向回归包含相邻弹窗和项目操作，完整回归已覆盖新第 5 项。
3. 独立预检 LAUNCH-R1：目录 `%VARIABLE%` 被 cmd 展开。新增 probe 在旧实现退出 1 RED，固定相对 BAT + WorkingDirectory 后真实执行退出 23 GREEN；日志 `quiet-launcher-percent-red-20261008.log` / `quiet-launcher-percent-green-20261008.log`，最终 Windows 3/3 PASS。
4. 独立预检 LAUNCH-R2：慢请求中止后焦点落 BODY。新增 slow-abort 断言 RED；错误态恢复其所属 dialog 焦点后 5/5 PASS，日志 `startup-web-failure-focus-red-20261008.log` / `startup-web-focus-green-20261008.log`。等待成功路径和首次搜索定位由 reviewer 的独立 production 探针验证，没有 pageerror。

完整 `npm run verify` 于本轮实现上退出 0：lint/version/goals/governance/features/markdown、typecheck、UI guard、Prettier 与 production build 全部 PASS；Node 719 项中 711 PASS、8 既有 skip，Agent 174 项中 172 PASS、2 既有 skip，浏览器 405/405 PASS、0 retry/flaky。日志 `D:/kk-studio/output/startup-full-verify-run3-20261008.log`；机器收据 `test-results/browser-results.json` expected=405/unexpected=0/flaky=0。

失败记录保留：首次 full verify 因测试变量 prefer-const 停止，第二次因边界组件新增 Lucide import 停止；分别修正可变捕获和使用 UiIcon 后重跑最终完整检查，未禁用门禁。首次延迟成功测试错误地期待“关闭设置”先获得焦点；依据既有 Modal 的首个可聚焦选择器和 SettingsPanel DOM 顺序，改为真实首按钮“通用”，再增加保持打开直到下载完成的独立覆盖。未放宽有效产品断言。

## Web 同态与冷启动

- 入口 `src/main.tsx → App → StartPage`；首次 landing 没有 Canvas/Conversation DOM 或 Settings/Asset/Library/TaskWorkbench chunk；实际 workspace 入口仍同步导入 Canvas，进入后 sticky mount。按需页面 `App → DeferredPanelBoundary → lazy(page)`。CSS 仍在 App 统一导入原顺序。
- 实际命令 `.tmp/startup-web-runtime.mjs` 串行启动 `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort --outDir <baseline|dist>`；URL `http://127.0.0.1:1423/`，production，data-runtime-entry=`src/main.tsx`。工具完成后只停止自己创建的 server。
- baseline 主 JS `index-DPLpeUr7.js`：988,373 bytes / gzip 300,293；候选 `index-CwaHG_l0.js`：801,552 / gzip 244,260，原始字节减 18.9%。主 JS SHA256 `02127c930e7cfc520a401310b991fbe912b8d129ebc6c6e12fa5e74c6cab25f6`。
- CSS `index-C6I0Rp3I.css` 274,711 / gzip 46,019，前后 SHA256 均 `7fa7ac181e2b8bb3a70d690a6f308e354c3984e2fed70c5e382d5e7eb8cc8d0d`；style sheets、首页宽度、背景和字体 computed style 对齐。
- Edge 每个版本 5 个全新 context，关闭缓存，模拟 3 Mbps 下载、120 ms latency、CPU 4 倍减速；首页可见后下一动画帧的中位数 baseline 1571.1 ms → candidate 1369.6 ms。仅证明本机相同模拟条件，不能外推线上耗时或全部页面性能。
- 截图为相同空草稿/默认暗色首页，1920/1099/390 px，无横向溢出；root 已查看前后 1920 和候选 390。图片不改设计内容。原 2.35 MB 灵感素材仍在，只增加 lazy/async，不宣称图片字节减少。
- 证据 `D:/kk-studio/output/startup-runtime-20261008/web-runtime.json`、`baseline-landing-*.png`、`candidate-landing-*.png`；构建字节收据 `startup-web-final-metrics-20261008.json`。第一次临时测量脚本使用不存在的 `.app-shell` 选择器，已修正为真实 `.app` 后从头执行；旧失败日志保留。

## 新 Desktop 实际产物

- `npm run client:check` 退出 0；`npm run client:build:agent -- --no-bundle` 退出 0，包含白名单 Agent runtime。日志 `startup-client-check-20261008.log` / `startup-client-build-agent-20261008.log`；保留既有 5 条 Rust dead_code 警告，未屏蔽。
- 测试使用从 canonical 单向复制的独立编译缓存，未共享可变 target，未复制用户数据/profile；命令在本任务树执行。
- 重新生成 EXE `src-tauri/target/release/kk-studio.exe` SHA256 `4dc9b32d6ab7cc8abcc8df0fa6569baf75ecff40036969956c7c7d1f8beaf609`。`tests/desktop/platform-version.mjs` 实际 release 显示 Desktop 2.1.6，production、tauri.localhost、native=true，加载本轮 `index-CwaHG_l0.js`，不是旧 main EXE。
- `.tmp/startup-native-runtime.mjs` 隔离 `--data-dir` 和 WebView profile/CDP 9343，空首页 Canvas/Conversation=0；按需设置正确显示、焦点为“通用”、Escape 回触发按钮、pageerrors=[]。观察到 spawn→首页可见约 567 ms，含 CDP 轮询开销，仅一轮实测，不称平均启动耗时。
- 截图 `native-landing.png` / `native-settings.png`、DOM/脚本/EXE 身份收据 `D:/kk-studio/output/startup-runtime-20261008/native-runtime.json`。native CSS viewport 1920×1080、Windows DPI 150%，实际截图 2880×1620。
- 本任务 checkout 内 `install-shortcut.ps1` 已退出 0 生成 GUI 产物和本树入口；Native EXE 与 Launcher EXE 抽取图标一致，均 32×32 / 968 非透明像素，Launcher 与当前 icon.ico 每像素相同。PNG/`embedded-icon-receipt.json` 同证据目录；root 已查看白兔 Logo。

## 尚待收尾与范围

精确提交独立审查、实际用户桌面/canonical 快捷方式切换及 GUI→生产 app 启动/任务栏窗口图标待追加收据。主线没有推进，Web 未线上部署。当前是已验证任务树候选；不能删除被快捷方式引用的 worktree，待经 PR 集成及稳定产物重新验收后再推广。

真实 Provider、干净系统、NSIS/签名/正式分享发布、Mobile native、托管 CI 与用户最终体验验收不由本轮本地检查代替；既有 FEAT-026/T7 边界保留。
