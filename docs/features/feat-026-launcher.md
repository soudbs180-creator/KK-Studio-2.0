# Windows 启动器与分享包（FEAT-026）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-08
- 关联任务：T7、TASK-DESKTOP-INSTALLER-001、TASK-LAUNCH-001

## 用户可见入口

- `npm run client:shortcut` 生成桌面和当前 checkout 的“启动 KK Studio”图标，目标为自带 Logo 的 `KK Studio Launcher.exe`；保留 `start-kk-studio.bat` 诊断及 `verify-kk-studio.cmd` 环境检查。分享包按 `docs/engineering/LAUNCHER.md` 制作。

## 代码位置

- 启动脚本：仓库根 `start-kk-studio.bat`、`verify-kk-studio.cmd`
- 桌面发布：`scripts/windows/desktop-release.mjs`
- 无控制台入口与快捷方式：`scripts/windows/desktop-launcher.cs`、`scripts/windows/install-shortcut.ps1`
- 安装器：`src-tauri/tauri.installer.conf.json`、`scripts/windows/installer-receipt.mjs`
- 文档：`docs/engineering/LAUNCHER.md`、`docs/engineering/WINDOWS-INSTALLER.md`
- 分享产物目录：`releases/`（只放最新分享产物，禁止打入 node_modules/凭据/编译缓存/恢复归档）

## 测试与证据

- 单测：`tests/unit/desktopRelease.test.ts`、`tests/unit/desktopLauncher.test.ts`、`tests/deploy/release-scripts.test.mjs`；新启动与图标证据见[启动体验验证](../changes/2026-10-08-startup-experience/verification.md)。
- 安装校验与实机脚本：`tests/unit/installerReceipt.test.ts`、`tests/unit/installerGuards.test.ts`、`tests/desktop/installer.mjs`；证据见[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)。

## 当前能力

- 启动/验证脚本与发布脚本可用并被测试覆盖。
- GUI 入口后台执行版本检查，最新 release 免构建，耗时操作显示进度、支持取消与错误日志；快捷方式使用当前 EXE 内嵌 Logo。Windows 探针覆盖中文/空格/特殊字符路径、无控制台、失败日志和只回收自有子进程。
- 快捷方式使用显式Unicode接口，覆盖系统ANSI编码无法表示的emoji路径、独立Shell读回、重复安装metadata及真实lnk启动；原WSH边界已先复现失败再修复。
- 完整 Agent/离线 WebView2 NSIS 已构建，当前 Windows 真实隔离安装/启动/Agent、重装、损坏修复、卸载再装保留项目及4279文件身份核对通过。安装器未签名，T7完整发布条件仍开放。

## 差距与后端化

- T7：干净 Windows/无 WebView2 首装、低版本回滚、签名与完整发布仍未验收。当前 NSIS 构建与隔离验收进度见本轮验证；不将 portable ZIP 或当前主机替代完整安装故事。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL（脚本），安装验收归 T7。

## 本轮证据勘误（2026-09-22）

状态按 [本轮验证与勘误](../changes/2026-09-21-text-and-rule-audit/verification.md) 纠正为 PARTIAL；保留早期记录的历史含义，不当作现行完成结论。
