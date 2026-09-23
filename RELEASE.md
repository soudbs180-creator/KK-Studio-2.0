# KK Studio 2.1.0

2.1.0 是在 2.0.0 融合基线之上的兼容功能版本。Git 历史与候选分支保留，不按文件日期回退实现。

## 最新分享产物

生成后的产物应位于 `releases/2.1.0/`；2.1.0 源码已合入 `main`，安装包和正式分享产物仍未生成：

- `KK-Studio-2.1.0-windows-x64.zip`：待通过桌面构建、安装和回滚验收后生成；解压运行 `kk-studio.exe`，需要 WebView2 Runtime。
- `KK-Studio-2.1.0-source.zip`：待生成的当前完整已跟踪源码包；不包含 Git 元数据、node_modules、编译缓存、用户数据或恢复归档。
- `SHA256SUMS.txt` 和 `manifest.json`：包的校验和、源码提交和 EXE 身份。

文件夹移动或重命名不迁移用户数据。Desktop 继续使用 `%APPDATA%/kk-studio` 和系统凭据库；Web 保留现有 IndexedDB/localStorage 存储 key。恢复历史用户项目应单独执行受校验的导入，不能复制覆盖运行数据。

## 本地与远端状态

本次 2.1.0 候选包含 Agent 桌面运行时、附件/画布引用、文本/音频任务、UI/设计系统、插件/MCP 和输入交互增量。真实 Provider、ComfyUI 生成、Astra、云端账号/计费等仍按原账本保留实际边界；版本号不代表所有能力已生产验收。

插件在 Web production preview 中经过验证，远程安装限可信 HTTPS 地址；Tauri Desktop 当前 CSP 阻止插件的 `blob:` 模块加载，桌面插件修复与实际交互验收列为 PLUGIN-DESKTOP-001。

源码上传的原始验证见 [verification](docs/changes/2026-09-23-release-2-1-0/verification.md)，合并后的状态见 [当前项目状态](docs/governance/PROJECT_STATE.md)。PR #9 的源码和检查已合入 `main`；这不等于已生成或签名正式安装包，也不等于所有产品能力已验收。
