# Windows 安装器构建与验收

锁定 Node 24/npm/Rust 工具链，从干净 task worktree 执行：

```powershell
npm ci
npm run client:installer
New-Item -ItemType Directory -Path releases -Force | Out-Null
npm run client:installer:receipt -- "src-tauri/target/release/bundle/nsis/KK Studio_<desktop-version>_x64-setup.exe" "releases/installer-<commit>"
npm run client:installer:verify -- "releases/installer-<commit>/installer-receipt.json"
npm run client:installer:test -- "releases/installer-<commit>/installer-receipt.json"
# 在目标环境安装后，按收据校验安装器和已安装文件的内容身份
npm run client:installed:verify -- "releases/installer-<commit>/installer-receipt.json" "<install-directory>"
```

文件名版本取自 config/platform-versions.json；不要以本文示例硬编码未来版本。先创建父目录，收据的最终输出子目录必须不存在；已有子目录不得覆盖。收据必须在 source clean 后创建，拒绝时会列出 modified/untracked 路径；应诊断改动来源，不能还原或忽略改动来制造 clean。PowerShell 中每个 npm 命令失败后必须停止，自动 workflow 紧接检查 `$LASTEXITCODE`。收据校验安装器、EXE、全部随包 Agent 文件，并记录 commit、source tree、构建输入哈希；损坏字节不能继续验收。收据/hash 可被改写，不能代替可信分发和 Authenticode 签名。

正式 Windows 工件只从通过门禁的 `main` 提交创建不可变 `vMAJOR.MINOR.PATCH` tag；`.github/workflows/windows-release.yml` 会在 Windows runner 上从该 tag 重建、生成并校验 receipt，再上传以 commit SHA 命名的 CI 工件。没有对应 tag、receipt 和 SHA 的安装包不能作为其他环境的当前版本。

相关源码、版本和安装器输入的 PR 先运行同一完整 NSIS/receipt 链。候选 checkout 显式绑定 PR head，校验实际 HEAD，工件名包含 `candidate` 和该 SHA；候选成功后仍须正常合并、检查 main，再从正式 tag 重新构建，不能将候选改名发布。该 workflow 有 paths 过滤，保持现有 required-check 配置，由评审核对相关 PR 的候选结果；不能将未触发时会 Pending 的检查设成所有 PR 必需项。构建前后及失败时保留 status/stat，首次失败与具体路径不得被后续成功覆盖。

安装器以当前用户安装，含 Agent 运行时及 WebView2 离线安装器，普通用户无需 Node/Rust。配置依据 [Tauri 官方 Windows 文档](https://v2.tauri.app/distribute/windows-installer/)；不改变原应用/用户数据身份。项目保存在 APPDATA/kk-studio，安装路径移动不会迁移项目。

自动验收拒绝已有 KK Studio 安装，以随机临时目录和隔离 profile/data-dir 测试真实安装、Agent、同版本重装、损坏资源修复和卸载再装。测试不创建快捷方式，不删除用户数据。环境有已有安装时，应在另一台受控机器运行，不能先卸载用户的程序来让测试通过。

原生报告和截图默认写入 worktree 的 `.tmp/installer-audits/<随机目录>`，可用 `KK_DESKTOP_AUDIT_OUTPUT` 指定新目录。不要放进 Playwright 的 `test-results`：浏览器测试开始时会清理该目录。交付前将本轮原始报告/截图复制到对应 change package 的 evidence，保留收据 commit、构建 commit 和安装器 hash。

卸载后的项目默认保留；备份再执行任何人为数据删除。保留上一可用 portable/installer、源码 SHA 和数据备份；更早版本降级必须验证存储兼容，不仅依据 allowDowngrades 配置。没有低版本实测不能宣称 rollback PASS。

新安装器交付以[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)为准；当前主机的测试不代表干净 Windows、无 WebView2 首装、签名或正式发布。
