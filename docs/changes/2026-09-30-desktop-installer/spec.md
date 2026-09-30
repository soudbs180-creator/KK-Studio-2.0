# Spec：Windows 安装与数据保留

- Task ID：TASK-DESKTOP-INSTALLER-001；状态：READY。
- 来源：[Intent](intent.md)、现行 AGENTS/AI_RULES、[存储契约](../../architecture/DATA-STORAGE.md)。

复用 Tauri 2 NSIS 模板与现有 Agent runtime 白名单，不引入第二套安装框架。安装范围为 currentUser；生产应用标识仍为 com.kkstudio.app，用户项目仍在 APPDATA/kk-studio。Web/Mobile 不改变。

独立 `tauri.installer.conf.json` 包含 Agent 与 WebView2 offlineInstaller，允许恢复较早安装版本；不开启自动更新、开机启动、系统级安装或额外权限。使用中文/英文的原生标准安装界面。

发行收据绑定干净 Git commit/tree、安装器与 EXE 的 SHA256、运行时 manifest 及每个运行文件。收据只能证明文件身份，不能证明签名/构建真实性；实际安装后必须再次核对所有字节并启动。收据来源需可信，不能将可自行改写的 hash 当作数字签名。

测试先拒绝任何已有 KK Studio 安装，使用新的临时安装/数据/WebView profile，关闭快捷方式创建，不修改真实项目或共享记忆。所有卸载操作必须确认注册位置等于该临时安装目录。测试损坏只作用于该目录中的 Agent 资源；重装必须恢复正确字节。卸载默认保留用户数据，绝不勾选数据删除。

AC-1/2 由配置、单测、实际构建和收据证明；AC-3 由当前 Windows 真实 NSIS 和 Tauri 运行证明；AC-4 由拒绝已安装环境的保护、报告边界和独立复核证明。当前主机已有 WebView2，代理/DNS 限制只能证明该主机本地路径，不等同于无网络的干净系统。

父任务 T7 的干净系统、低版本回滚、签名、正式发布和真实 Provider/ComfyUI 依赖分别验收；不因局部安装测试将 T7 标为 DONE。
