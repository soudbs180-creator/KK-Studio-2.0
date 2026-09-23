# Windows 启动与分享

唯一工程目录是 `D:/kk-studio/KK-Studio-2.0`。根目录 `start-kk-studio.bat` 从自身目录运行 `scripts/windows/desktop-release.mjs`，检查源码时间与 `src-tauri/target/release/kk-studio.exe`；缺失或过期时构建，成功后才启动。已有最新 release 时不会重新编译。

开发快捷方式的工作目录必须是当前仓库，目标为当前仓库的 `start-kk-studio.bat`，图标为 `src-tauri/icons/icon.ico`。旧的 `D:/kk-studio-next` 或 archive 路径不再有效。

普通使用者在桌面构建和安装验收完成后，解压 `releases/2.1.0/KK-Studio-2.1.0-windows-x64.zip` 直接运行 `kk-studio.exe`，无需 Node/Rust。Windows 需要已安装 Microsoft Edge WebView2 Runtime。用户数据仍写入 `%APPDATA%/kk-studio`，应用标识和凭据服务保持不变。

`node_modules`、大规模 Rust 编译缓存和旧 runtime profile 不属于发布包。最终源码目录可保留一份开发依赖和一份最新 EXE；重建依赖用 `npm ci`，重建桌面用 `npm run client:build -- --no-bundle`。
