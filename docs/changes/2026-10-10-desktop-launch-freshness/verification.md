# Verification

- RED：新增漂移检测测试首次运行因缺少 `inspectDesktopDependencies` 导出而失败。
- GREEN：`node --test tests/unit/desktopRelease.test.ts`，15/15 通过。
- 当前 checkout 证据：`inspectDesktopDependencies(D:/kk-studio/KK-Studio-2.0)` 检出
  `@tauri-apps/api 2.12.1 -> 2.11.1`、`@tauri-apps/plugin-dialog 2.8.1 -> 2.7.3`、`@tauri-apps/cli 2.12.1 -> 2.11.4`；这正是 Tauri 拒绝构建的原因。
- 既有启动 freshness 测试仍覆盖：旧 release 必须重建、构建失败不得启动旧包、已有 EXE 也必须经过检查。
- 当前 `main` 已包含本修复。真实 GUI 启动回归在 2026-10-10 13:26 复现 `@tauri-apps/cli 2.12.1 -> 2.11.4`，日志记录自动 `npm ci --ignore-scripts`、`Launched rebuilt desktop release` 和 `Exit code: 0`；随后 `inspectDesktopRelease` 为 `current`、`inspectDesktopDependencies` 为 `needsInstall=false`。
- 实际运行态：`D:/kk-studio/KK-Studio-2.0/src-tauri/target/release/kk-studio.exe`，FileVersion/ProductVersion `2.1.12`，mtime `2026-10-10 13:27:20`，SHA-256 `041764373AEBD3B259762142F7E97B8DDFE67C5109CC4FC54722DEB1D822D9C4`，进程 PID `93832`。
- Tauri release 构建在 13:21 和 13:27 通过；生产 preview `http://127.0.0.1:1424/` 的首页模型菜单同时显示“选择供应商图片模型”“Codex 主 Agent”引导、“打开 Agent 面板”和“配置供应商与模型”。
