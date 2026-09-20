# Verification — T3b Desktop project package

T3b 的 Windows Desktop 最小恢复单元已通过，源码提交 `379b302dfcc4586248e340e824378387c887e7d1`。Web 文件适配器归 T9，设置中的项目包按钮禁用并说明原因。当前 Figma 连接要求重新认证，因此新增设置入口作为复用既有组件的工程补充，不宣称最新 Figma 像素验收。

## 实现范围

- 设置 → 储存提供导出、选择/预检、恢复到独立新目录、打开已恢复副本。取消发生在选择/确认阶段；进入原子写入后按钮禁用，不承诺中途取消事务。
- 四个真实原生命令：export/preflight/import/open_restored_project_package。导出核对已保存 revision；目标必须不存在并位于当前 data root 外。
- ZIP32 有界解析、重复 JSON/ZIP、路径、symlink、可执行、加密、ZIP64 拒绝。严格 snapshot/schema、引用闭包、MIME/metadata、完整 SHA-256 和 manifest checksum。共享 fixture 验证 UTF-16 键序与 ECMAScript 数字的跨语言一致性。
- 导出独占临时文件→sync/close/readback→新目标 hard-link；恢复独占 sibling staging→仓库写入/回读→新目录 rename。失败只清理本次拥有的临时项，保留源项目和源包。
- 修复原生 JSON 字段顺序导致画布打开即误保存的问题；结构指纹忽略成员排序但保留真实几何变化。

## 最终检查

| 检查 | 结果 |
| --- | --- |
| npm run verify | PASS：lint/治理、typecheck、129 unit、UI 117/0、format、build、156 Edge browser，0 skipped/0 flaky |
| 项目包专项 | 10 shared unit、5 browser；另有画布字段排序回归 |
| cargo test | 50/50，含 14 project_package |
| cargo fmt/check | PASS |
| npm run client:build -- --no-bundle | PASS；最终 bundle index-D54x02Sm.js |

日志在 `docs/evidence/project-package-2026-09-18/`。七个注入点为 export-before-sync/readback/publish 与 import-before-assets/snapshot/readback/publish，检查源 snapshot/blob/package 不变、未发布目标、清理 staging、后续重试成功。另测非法 schema/checksum/hash/引用、secret、未知字段、缺失素材、ZIP 路径/重复/大小边界和已有目标。本矩阵验证显式失败返回，不等同物理断电、驱动故障或跨平台 crash certification。

## 真实运行证据

`native-acceptance.json` 记录源提交、exe/package/manifest SHA-256、源/目标根目录和两个全新 WebView profile。以本 worktree release exe 加 `--data-dir <isolated-root>` 启动；URL `http://tauri.localhost/`，mode production，entry src/main.tsx，bundle index-D54x02Sm.js。

恢复包含 2 个项目、3 个节点、1 条边、2 条消息、1 个已完成任务、1 个引用 PNG。真实 IPC 导出/预检/恢复摘要一致；源 snapshot/blob 字节不变；新 WebView 读取完整 snapshot 和磁盘字节一致，原件 SHA-256 一致。从项目库打开恢复项目，实际画布中的图片精确 data URL/naturalWidth 正确，图/任务/消息保持一致。已有目标、当前根目录内目标、旧 revision 均拒绝。没有脚本或 console 错误。截图为 native-settings.png 与 restored-fresh-webview.png。

UI 文件选择和异步状态由浏览器 IPC seam 测试；原生文件操作由真实 IPC 验证；恢复窗口以独立启动和新 profile 验证。没有把 mock 文件操作作为真实落盘证据。

`web-acceptance.json` 及截图验证 1440/390 两种宽度，无水平溢出、无脚本错误，Web 禁用说明可见：

- development：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort`，URL http://127.0.0.1:1421/，script /src/main.tsx。
- production：`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`，URL http://127.0.0.1:1423/，script /assets/index-D54x02Sm.js。

运行链：src/main.tsx → App.tsx → SettingsPanel → SettingsSections → ProjectPackageActions；恢复项目为 App → LibraryPage → CatalogPageBody → App.handleOpenProject → Canvas。App 用 state 切页，URL 仍为 /。

## 未关闭范围

T4 统一生成、T5 持久 TaskHost、T6 ComfyUI、真实 Provider/GPU、安装生命周期、Web/Mobile 发布与全状态 Figma 验收仍独立跟踪。原 D:/kk-studio-next 的 178 项 dirty 状态保留；本机主线在 .worktrees/TASK-INTEGRATION-001。无 Git remote，未执行远端 PR/CI/保护规则。
