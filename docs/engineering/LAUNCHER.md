# Windows 启动与分享

唯一工程仓库是 `D:/kk-studio/KK-Studio-2.0`，登记的任务 worktree 用于隔离开发与候选验收。Windows 在实际使用的已验证 checkout 运行一次 `npm run client:shortcut`，即可生成 `KK Studio Launcher.exe` 和桌面“启动 KK Studio”图标；直接双击图标启动，后台不显示命令窗口。启动器自带当前 `src-tauri/icons/icon.ico`，快捷方式也使用该 EXE 内嵌图标，避免旧目录被移除后丢失 Logo。只创建 checkout 内入口时运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/windows/install-shortcut.ps1`。

GUI 启动器继续调用根目录 `start-kk-studio.bat --background` 和唯一新鲜度实现 `scripts/windows/desktop-release.mjs`：缺失或过期时构建，成功后才启动，已有最新 release 时不会重新编译。超过短暂等待时显示原生进度，取消只回收本次启动的进程树；失败显示提示，详细输出保存在 `%LOCALAPPDATA%/KK Studio/logs/startup-*.log`。同 checkout 的重复点击不会并发构建。命令行诊断仍可直接运行 `start-kk-studio.bat`，失败会保留 pause。

快捷方式的目标和工作目录必须对应当前已验证 checkout，不能指向旧 `D:/kk-studio-next`、archive 或过期候选。安装脚本通过 Windows 自带 .NET Framework 编译器生成 GUI 子系统程序，编译成功后替换 EXE 并更新快捷方式；此前快捷方式的目标、参数、工作目录与图标收据保存在 checkout 的 `.tmp/launcher/`。这只是开发启动入口，不替代 NSIS 安装器及正式发布验收。

当前稳定 portable Desktop 版本为 2.1.2，main@bd3bc66 的完整 ZIP 已实际启动并验证随包 Agent；本地交付收据保存在 `releases/DELIVERY.md`。解压整个目录后运行 `kk-studio.exe`，保留旁边的 agent-runtime，无需 Node/Rust。portable 需要已有 WebView2。用户数据仍写入 `%APPDATA%/kk-studio`，应用标识和凭据服务保持不变。

Windows NSIS 安装器构建、文件校验与隔离验收见 [WINDOWS-INSTALLER](WINDOWS-INSTALLER.md)，当前真实结果见[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)。干净系统、签名与正式发布仍由 T7 验收。

`node_modules`、大规模 Rust 编译缓存和旧 runtime profile 不属于发布包。最终源码目录可保留一份开发依赖和一份最新 EXE；重建依赖用 `npm ci`，重建桌面用 `npm run client:build -- --no-bundle`。
