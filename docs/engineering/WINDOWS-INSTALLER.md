# Windows 安装器构建与验收

锁定 Node 24/npm/Rust 工具链，从干净 task worktree 执行：

```powershell
npm ci
npm run client:installer
npm run client:installer:receipt -- "src-tauri/target/release/bundle/nsis/KK Studio_2.1.2_x64-setup.exe" "releases/installer-<commit>"
npm run client:installer:test -- "releases/installer-<commit>/installer-receipt.json"
```

文件名版本取自 config/platform-versions.json；不要以本文示例硬编码未来版本。收据必须在 source clean 后创建，输出目录必须不存在。收据校验安装器、EXE、全部随包 Agent 文件；损坏字节不能继续验收。收据/hash 可被改写，不能代替可信分发和 Authenticode 签名。

安装器以当前用户安装，含 Agent 运行时及 WebView2 离线安装器，普通用户无需 Node/Rust。配置依据 [Tauri 官方 Windows 文档](https://v2.tauri.app/distribute/windows-installer/)；不改变原应用/用户数据身份。项目保存在 APPDATA/kk-studio，安装路径移动不会迁移项目。

自动验收拒绝已有 KK Studio 安装，以随机临时目录和隔离 profile/data-dir 测试真实安装、Agent、同版本重装、损坏资源修复和卸载再装。测试不创建快捷方式，不删除用户数据。环境有已有安装时，应在另一台受控机器运行，不能先卸载用户的程序来让测试通过。

卸载后的项目默认保留；备份再执行任何人为数据删除。保留上一可用 portable/installer、源码 SHA 和数据备份；更早版本降级必须验证存储兼容，不仅依据 allowDowngrades 配置。没有低版本实测不能宣称 rollback PASS。

新安装器交付以[本轮验证](../changes/2026-09-30-desktop-installer/verification.md)为准；当前主机的测试不代表干净 Windows、无 WebView2 首装、签名或正式发布。
