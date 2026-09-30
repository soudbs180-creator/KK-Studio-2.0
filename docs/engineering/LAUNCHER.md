# Windows 启动与分享

唯一工程目录是 `D:/kk-studio/KK-Studio-2.0`。根目录 `start-kk-studio.bat` 从自身目录运行 `scripts/windows/desktop-release.mjs`，检查源码时间与 `src-tauri/target/release/kk-studio.exe`；缺失或过期时构建，成功后才启动。已有最新 release 时不会重新编译。

开发快捷方式的工作目录必须是当前仓库，目标为当前仓库的 `start-kk-studio.bat`，图标为 `src-tauri/icons/icon.ico`。旧的 `D:/kk-studio-next` 或 archive 路径不再有效。

当前稳定 portable Desktop 版本为 2.1.2，main@bd3bc66 的完整 ZIP 已实际启动并验证随包 Agent；本地交付收据保存在 `releases/DELIVERY.md`。解压整个目录后运行 `kk-studio.exe`，保留旁边的 agent-runtime，无需 Node/Rust。portable 需要已有 WebView2。用户数据仍写入 `%APPDATA%/kk-studio`，应用标识和凭据服务保持不变。

Windows NSIS 安装器构建、文件校验与隔离验收见 [WINDOWS-INSTALLER](WINDOWS-INSTALLER.md)，当前真实结果见[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)。干净系统、签名与正式发布仍由 T7 验收。

`node_modules`、大规模 Rust 编译缓存和旧 runtime profile 不属于发布包。最终源码目录可保留一份开发依赖和一份最新 EXE；重建依赖用 `npm ci`，重建桌面用 `npm run client:build -- --no-bundle`。
