# Plan：修复桌面画布插件的 CSP 加载路径

- Task ID：PLUGIN-DESKTOP-001
- 状态：IN PROGRESS
- 日期：2026-09-29
- Intent / Spec / ADR：本目录 `intent.md`、`spec.md`；无需新增 ADR（store/schema/CSP 规则不变）
- Owner / branch / worktree：root / `fix/PLUGIN-DESKTOP-001-csp` / `D:/kk-studio/.worktrees/platform-versioning`
- Base / HEAD SHA 与远端目标：`origin/main@5cdf8dc081b8b2e521c715d639927ca763427092`；目标 `origin/main`
- Git dirty/index 状态、并行任务与文件归属：开工时 clean；根 checkout 的 UI 脏改动不触碰；本分支独占插件和本目录文档。

## 开工证据

- 已读取：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/{PROMPTING,SDLC,BRANCH-POLICY,REVIEW}.md`、`PROJECT_STATE.md`、任务账本、FEAT-013、插件 loader/runtime/store、Tauri 配置和现有插件测试。
- 基线：`node --test tests/unit/pluginLoader.test.ts` 11/11；`npm run version:check` PASS；`npm run client:check` PASS（Rust 既有 dead_code warnings）。
- PRE-EXISTING：Tauri CSP 对 `blob:` 的阻断是已登记缺口；VPS/T10 状态不在本分支处理。
- 依赖/工具：Node 24.19 runtime、Rust/Cargo、已有 `node_modules` 与 Tauri release toolchain。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `src/features/plugins/pluginLoader.ts` | 同源 `/plugins/` 用直接 ESM import；保留远程源码路径和 URL 边界 | 无 | 定向 unit |
| 2 | `tests/unit/pluginLoader.test.ts` | 覆盖同源模块 importer、缓存戳和远程回归 | 1 | Node tests |
| 3 | `tests/desktop/plugin-csp.mjs` | 启动独立 Tauri release，验证发现、添加、停用/启用与无页面错误 | 1、2 | CDP/DOM |
| 4 | FEAT-013、PROGRESS、ledger、五文件 change package | 同步事实和证据边界 | 1–3 | governance/markdown/delivery |

## 风险与恢复

- 最大风险：直接 import 的模块未使用与 WebView 同源 URL，导致插件再次缺失；由 unit 注入与 fresh Tauri DOM 双重确认。
- 不改变 `script-src`；若 fresh Desktop 仍失败，保留失败日志并回滚 loader 变更，不放宽 CSP 作为绕过。
- 运行验收使用隔离 `--data-dir` 和 `WEBVIEW2_USER_DATA_FOLDER`，不连接用户已有应用或数据。

## 验证和交付

- 定向回归：插件 unit、typecheck、lint/governance/markdown、Tauri client check/build。
- UI/运行态：Tauri release + CDP；记录 `tauri.localhost`、runtime mode/entry、插件模块 URL、DOM 和错误。
- 交付：self-review 后提交、推送任务分支，准备 PR；合并和用户最终视觉验收分别记录，不提前改写为完成。
