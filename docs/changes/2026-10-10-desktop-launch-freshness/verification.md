# Verification

- RED：新增漂移检测测试首次运行因缺少 `inspectDesktopDependencies` 导出而失败。
- GREEN：`node --test tests/unit/desktopRelease.test.ts`，15/15 通过。
- 当前 checkout 证据：`inspectDesktopDependencies(D:/kk-studio/KK-Studio-2.0)` 检出
  `@tauri-apps/api 2.12.1 -> 2.11.1`、`@tauri-apps/plugin-dialog 2.8.1 -> 2.7.3`、`@tauri-apps/cli 2.12.1 -> 2.11.4`；这正是 Tauri 拒绝构建的原因。
- 既有启动 freshness 测试仍覆盖：旧 release 必须重建、构建失败不得启动旧包、已有 EXE 也必须经过检查。
- 尚未把候选提交合入当前 dirty checkout，也未宣称当前桌面 EXE 已包含本候选；合入后需要执行 `npm ci`/启动器重建并重新做 Tauri runtime 验证。
