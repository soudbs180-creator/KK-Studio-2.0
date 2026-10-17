# Windows 启动与分享

唯一工程仓库是 `D:/kk-studio/KK-Studio-2.0`，登记的任务 worktree 用于隔离开发与候选验收。Windows 在实际使用的已验证 checkout 运行一次 `npm run client:shortcut`，即可生成 `KK Studio Launcher.exe` 和桌面“启动 KK Studio”图标；直接双击图标启动，后台不显示命令窗口。启动器自带当前 `src-tauri/icons/icon.ico`，快捷方式也使用该 EXE 内嵌图标，避免旧目录被移除后丢失 Logo。只创建 checkout 内入口时运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/windows/install-shortcut.ps1`。

GUI 启动器继续调用根目录 `start-kk-studio.bat --background` 和唯一新鲜度实现 `scripts/windows/desktop-release.mjs`：缺失或过期时构建，成功后才启动，已有最新 release 时不会重新编译。超过短暂等待时显示原生进度，取消只回收本次启动的进程树；失败显示提示，详细输出保存在 `%LOCALAPPDATA%/KK Studio/logs/startup-*.log`。同 checkout 的重复点击不会并发构建。命令行诊断仍可直接运行 `start-kk-studio.bat`，失败会保留 pause。

新鲜度检查还会在构建前比较 `package-lock.json` 与根 `node_modules` 中全部已安装包的实际版本，并比较源码内容指纹与 release 收据；保留原时间戳的修改、删除输入、篡改 EXE、缺失或损坏收据都会要求重建。发现 `node_modules` 漂移时，先确认根及嵌套依赖均为当前任务独占实体目录；链接依赖须拒绝自动修复，不能在共享 junction/symlink 上运行安装。满足物理所有权前提后才执行锁定的 `npm ci --ignore-scripts --no-audit --no-fund` 并复检；锁文件异常、依赖修复或构建失败都 fail-closed，不得回退启动旧 EXE。自动修复只处理根项目依赖，不触碰随包 Agent 的安装目录；全新 checkout 仍按开发文档先完成一次完整 `npm ci`。更新验收必须从 GUI 启动器或 `start-kk-studio.bat` 开始，并记录实际 release 路径、mtime/hash、构建收据和运行进程；直接双击 `kk-studio.exe` 不能证明源码已更新。修改 `scripts/windows/desktop-launcher.cs`、快捷方式脚本或批处理后，必须重新运行 `npm run client:shortcut`，因为应用 release 收据不代表 GUI 启动器自身已更新。

快捷方式的目标和工作目录必须对应当前已验证 checkout，不能指向旧 `D:/kk-studio-next`、archive 或过期候选。安装脚本通过 Windows 自带 .NET Framework 编译器生成 GUI 子系统程序，编译成功后替换 EXE 并更新快捷方式；此前快捷方式的目标、参数、工作目录与图标收据保存在 checkout 的 `.tmp/launcher/`。这只是开发启动入口，不替代 NSIS 安装器及正式发布验收。

链接读写使用 `scripts/windows/unicode-shortcut.cs` 的 Unicode Shell Link 接口，支持包含中文和 emoji 的目录，不依赖 Windows 系统 ANSI 编码。重复安装会保留原链接 metadata；测试通过真实 `.lnk` 启动并检查无控制台、工作目录和后台参数。

2026-10-17本轮启动恢复本地完成：TASK-AUDIT-REPAIR-20261017 source4699458d / Desktop2.1.36经官方新鲜度路径构建，EXE b6299445、input a53dee81；隔离Native与两个真实日常快捷方式正常关闭重开通过。两个原lnk先复制原字节/metadata/hash，再原位写入`D:/kk-studio/.worktrees/TASK-AUDIT-REPAIR-20261017/KK Studio Launcher.exe`，workingDirectory为本任务树、args空；Launcher新编译到此前不存在路径，无文件删除/移动。GUI仍经官方freshness检查启动实际受测EXE；日常链接引用此任务树，不可清理该树。

默认9项目原始快照/身份/shared memory保持，最后留下无CDP正常实例PID50136。**默认旧聊天资料仍受READ_ONLY保护；启动恢复完成不表示可编辑、完整迁移或protocol7完成。** 恢复banner遮挡账号菜单的真实d356失败已通过条件sidebar popover层级修复、桌面/短手机普通click及新Native/daily复验关闭；所有旧失败、EXE/receipt、链接及用户数据副本保留。最新启用前fresh备份2483文件/118目录/217801366 B并独立重哈希零差异；完整source/EXE/input/receipt/loaded资源/进程证据见[本轮验证](../changes/2026-10-17-audit-repair/verification.md)。构建和依赖继续要求物理owned、共享链接目标只读，不把本地reason=current当签名安装器/正式发布或用户验收。

以下为历史2.1.27时点记录，不能证明当前候选或日常入口：当前任务 checkout 的 Desktop/Web 源码241f3050候选已由版本脚本递增至2.1.27（Mobile2.1.1规划），main694已本地承接；本轮官方启动器隔离重建及实际Native56checks已PASS，EXE37a82390/input79c3a8e5、资源字节与dist一致、owned正常关闭；完整verify-3本地PASS，最终提交head及Hosted/PR/main仍待验，历史2.1.26产物不代填当前源码。`2.1.2` portable ZIP 是历史交付，不能用来证明本次源码已更新。portable 的正式交付收据仍保存在 `releases/DELIVERY.md`；解压整个目录后运行 `kk-studio.exe`，保留旁边的 agent-runtime，无需 Node/Rust。portable 需要已有 WebView2。用户数据仍写入 `%APPDATA%/kk-studio`，应用标识和凭据服务保持不变。

隔离桌面验收可使用 `start-kk-studio.bat --background --data-dir "C:\绝对路径\独立测试数据"`；路径原样传给应用，重复、缺失、相对路径和未知参数会在启动前拒绝。日常快捷方式不传这个参数，继续使用原数据目录。测试还需独立 WebView2 profile 与 CODEX_HOME，系统凭据使用唯一 synthetic ID，验收后只清理本次拥有的进程与凭据。

Windows NSIS 安装器构建、文件校验与隔离验收见 [WINDOWS-INSTALLER](WINDOWS-INSTALLER.md)，当前真实结果见[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)。干净系统、签名与正式发布仍由 T7 验收。

`node_modules`、大规模 Rust 编译缓存和旧 runtime profile 不属于发布包。最终源码目录可保留一份开发依赖和一份最新 EXE；重建依赖用 `npm ci`，重建桌面用 `npm run client:build -- --no-bundle`。
