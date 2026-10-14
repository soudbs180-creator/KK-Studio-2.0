# Windows 启动与分享

唯一工程仓库是 `D:/kk-studio/KK-Studio-2.0`，登记的任务 worktree 用于隔离开发与候选验收。Windows 在实际使用的已验证 checkout 运行一次 `npm run client:shortcut`，即可生成 `KK Studio Launcher.exe` 和桌面“启动 KK Studio”图标；直接双击图标启动，后台不显示命令窗口。启动器自带当前 `src-tauri/icons/icon.ico`，快捷方式也使用该 EXE 内嵌图标，避免旧目录被移除后丢失 Logo。只创建 checkout 内入口时运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/windows/install-shortcut.ps1`。

GUI 启动器继续调用根目录 `start-kk-studio.bat --background` 和唯一新鲜度实现 `scripts/windows/desktop-release.mjs`：缺失或过期时构建，成功后才启动，已有最新 release 时不会重新编译。超过短暂等待时显示原生进度，取消只回收本次启动的进程树；失败显示提示，详细输出保存在 `%LOCALAPPDATA%/KK Studio/logs/startup-*.log`。同 checkout 的重复点击不会并发构建。命令行诊断仍可直接运行 `start-kk-studio.bat`，失败会保留 pause。

新鲜度检查还会在构建前比较 `package-lock.json` 与根 `node_modules` 中全部已安装包的实际版本，并比较源码内容指纹与 release 收据；保留原时间戳的修改、删除输入、篡改 EXE、缺失或损坏收据都会要求重建。发现 `node_modules` 漂移时先执行锁定的 `npm ci --ignore-scripts --no-audit --no-fund` 并复检；锁文件异常、依赖修复或构建失败都 fail-closed，不得回退启动旧 EXE。自动修复只处理根项目依赖，不触碰随包 Agent 的安装目录；全新 checkout 仍按开发文档先完成一次完整 `npm ci`。更新验收必须从 GUI 启动器或 `start-kk-studio.bat` 开始，并记录实际 release 路径、mtime/hash、构建收据和运行进程；直接双击 `kk-studio.exe` 不能证明源码已更新。修改 `scripts/windows/desktop-launcher.cs`、快捷方式脚本或批处理后，必须重新运行 `npm run client:shortcut`，因为应用 release 收据不代表 GUI 启动器自身已更新。

快捷方式的目标和工作目录必须对应当前已验证 checkout，不能指向旧 `D:/kk-studio-next`、archive 或过期候选。安装脚本通过 Windows 自带 .NET Framework 编译器生成 GUI 子系统程序，编译成功后替换 EXE 并更新快捷方式；此前快捷方式的目标、参数、工作目录与图标收据保存在 checkout 的 `.tmp/launcher/`。这只是开发启动入口，不替代 NSIS 安装器及正式发布验收。

链接读写使用 `scripts/windows/unicode-shortcut.cs` 的 Unicode Shell Link 接口，支持包含中文和 emoji 的目录，不依赖 Windows 系统 ANSI 编码。重复安装会保留原链接 metadata；测试通过真实 `.lnk` 启动并检查无控制台、工作目录和后台参数。

当前任务 checkout 的 Desktop/Web 源码候选已由版本脚本递增至2.1.27（Mobile2.1.1规划）；本轮新Desktop构建、收据与实际进程验收尚待完成，历史2.1.26产物不代填当前源码。`2.1.2` portable ZIP 是历史交付，不能用来证明本次源码已更新。portable 的正式交付收据仍保存在 `releases/DELIVERY.md`；解压整个目录后运行 `kk-studio.exe`，保留旁边的 agent-runtime，无需 Node/Rust。portable 需要已有 WebView2。用户数据仍写入 `%APPDATA%/kk-studio`，应用标识和凭据服务保持不变。

隔离桌面验收可使用 `start-kk-studio.bat --background --data-dir "C:\绝对路径\独立测试数据"`；路径原样传给应用，重复、缺失、相对路径和未知参数会在启动前拒绝。日常快捷方式不传这个参数，继续使用原数据目录。测试还需独立 WebView2 profile 与 CODEX_HOME，系统凭据使用唯一 synthetic ID，验收后只清理本次拥有的进程与凭据。

Windows NSIS 安装器构建、文件校验与隔离验收见 [WINDOWS-INSTALLER](WINDOWS-INSTALLER.md)，当前真实结果见[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)。干净系统、签名与正式发布仍由 T7 验收。

`node_modules`、大规模 Rust 编译缓存和旧 runtime profile 不属于发布包。最终源码目录可保留一份开发依赖和一份最新 EXE；重建依赖用 `npm ci`，重建桌面用 `npm run client:build -- --no-bundle`。
