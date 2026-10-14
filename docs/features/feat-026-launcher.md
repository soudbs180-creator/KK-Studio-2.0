# Windows 启动器与分享包（FEAT-026）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-14
- 关联任务：T7、TASK-DESKTOP-INSTALLER-001、TASK-LAUNCH-001、TASK-PROTOCOL-CLI-20261014、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 用户可见入口

- `npm run client:shortcut` 生成桌面和当前 checkout 的“启动 KK Studio”图标，目标为自带 Logo 的 `KK Studio Launcher.exe`；保留 `start-kk-studio.bat` 诊断及 `verify-kk-studio.cmd` 环境检查。分享包按 `docs/engineering/LAUNCHER.md` 制作。

## 代码位置

- 启动脚本：仓库根 `start-kk-studio.bat`、`verify-kk-studio.cmd`
- 桌面发布：`scripts/windows/desktop-release.mjs`
- 无控制台入口与快捷方式：`scripts/windows/desktop-launcher.cs`、`scripts/windows/install-shortcut.ps1`
- 安装器：`src-tauri/tauri.installer.conf.json`、`scripts/windows/installer-receipt.mjs`
- Agent 生产运行时：`scripts/agent/production-install.mjs`、`runtime-package.mjs` 与 `runtime-manifest.json`；原生 CLI 所有权与启动边界为 `src-tauri/src/cli_runtime.rs`、`agent_process.rs`
- 文档：`docs/engineering/LAUNCHER.md`、`docs/engineering/WINDOWS-INSTALLER.md`
- 分享产物目录：`releases/`（只放最新分享产物，禁止打入开发 node_modules、凭据、编译缓存和恢复归档；Agent 生产依赖仅按 runtime-manifest 白名单包含）

## 测试与证据

- 2.1.24源码候选（TASK-223，PARTIAL）：2.1.24官方Agent/Native重建、同字节便携与分享包receipt/hash交付仍待本轮回执；完整verify、Native和独立审查未完成，结果见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/unit/agentDesktopSupportInstaller.test.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

- 单测：`tests/unit/desktopRelease.test.ts`、`tests/unit/desktopLauncher.test.ts`、`tests/deploy/release-scripts.test.mjs`；新启动与图标证据见[启动体验验证](../changes/2026-10-08-startup-experience/verification.md)。
- 安装校验与实机脚本：`tests/unit/installerReceipt.test.ts`、`tests/unit/installerGuards.test.ts`、`tests/desktop/installer.mjs`；证据见[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)。
- 运行时打包与 Windows 发布故障：`tests/unit/agentPackage.test.ts`、`agentProductionInstall.test.ts`；临时目录/合成 CLI 夹具覆盖完整依赖、版本/帮助、重试、回滚和新目标拒绝，不等于真人 CLI 安装/登录或安装器验收。

## 当前能力

- 本轮2.1.23已验证保留随包运行时和资料身份；最新EXE、便携目录与白名单产物按当前验证收据核验。Agent配置读写失败保留原字节与有效状态。

- 启动/验证脚本与发布脚本可用并被测试覆盖。
- GUI 入口后台执行版本检查，最新 release 免构建，耗时操作显示进度、支持取消与错误日志；快捷方式使用当前 EXE 内嵌 Logo。Windows 探针覆盖中文/空格/特殊字符路径、无控制台、失败日志和只回收自有子进程。
- 快捷方式使用显式Unicode接口，覆盖系统ANSI编码无法表示的emoji路径、独立Shell读回、重复安装metadata及真实lnk启动；原WSH边界已先复现失败再修复。
- 既有安装器的历史验证覆盖完整 Agent/离线 WebView2 NSIS、当前主机隔离安装/启动/Agent、重装、损坏修复、卸载再装保留项目及4279文件身份核对，证据归上述安装器变更；不替代本轮新产物验收。安装器未签名，T7完整发布条件仍开放。
- 本轮 Agent 生产包在隔离目录按锁文件准备依赖，保留原开发依赖与 junction；当前平台 Codex 包必须完整，随包 Node 实际通过 version、login help、app-server help 才输出 manifest，同时包含 Gemini 桥脚本。只包含生产白名单，不通过编造 metadata 修复残包。
- Windows 最终发布对 EPERM/EBUSY 做有界重试，源目录身份贯穿备份/发布/回滚。失败候选保留；目标仍缺时恢复本次旧 runtime，其他操作已创建目标时不覆盖，回滚失败保留备份与错误路径。POSIX 保留旧发布流程，本轮不声明其检查/rename 竞态已解决。

## 差距与后端化

- T7：干净 Windows/无 WebView2 首装、低版本回滚、签名与完整发布仍未验收。当前 NSIS 构建与隔离验收进度见本轮验证；不将 portable ZIP 或当前主机替代完整安装故事。
- 本轮最新源码门禁、实际 EXE/portable 构建、体积与哈希由[协议/CLI 验证](../changes/2026-10-14-protocol-cli-completion/verification.md)记录；本卡不预填最终数字。真实新增 CLI 安装、账号登录、付费模型调用与完整安装器故事仍分别验收。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL（脚本），安装验收归 T7。

## 本轮证据勘误（2026-09-22）

状态按 [本轮验证与勘误](../changes/2026-09-21-text-and-rule-audit/verification.md) 纠正为 PARTIAL；保留早期记录的历史含义，不当作现行完成结论。
