# Verification：Web 本机伴随服务与既有浏览器数据迁移

- Task ID：`TASK-LOCAL-SERVICE-001`
- 记录状态：IN PROGRESS（本地实现门禁已通过，等待最终 review/PR/主线回读）
- 执行时间与时区：2026-09-29 / Asia/Shanghai
- Intent / Spec / Plan / AC：本目录 `intent.md`、`spec.md`、`plan.md`；AC-1…AC-5
- cwd / branch：`D:/kk-studio/.worktrees/platform-versioning` / `feat/TASK-LOCAL-SERVICE-001-companion`
- 被验证 base SHA / head SHA / tree SHA：base `49f20c85c48b1d9f939c1b423dc542b419e18260`；当前实现 head `082d1c4684b31c9ea1d37f7b2a7f1e7d99d91917`；tree `38c7a8ddf9f2bdba6eae0e3d8573ac2905bb6666`。
- dirty 状态及 patch/文件指纹：验证期间仅有本任务文档、Task5 浏览器/smoke 和生成治理视图待提交；根 checkout 的无关 dirty 文件未纳入。
- Node/npm/Rust/浏览器/OS/工具版本：Node `24.19.0`、Windows PowerShell、Vite `7.3.6`、Playwright `1.63.0`、TypeScript `5.6.x`；浏览器验收使用 Playwright configured Edge/Chromium channel。
- 规则版本或 commit：仓库 `AGENTS.md`、`AI_RULES.md` 与现行 governance scripts。

## 实际命令和结果

| 命令/检查 | 时间 | 退出码 | PASS/FAIL/NOT RUN/N/A | 证据路径 | 范围与限制 |
| --- | --- | ---: | --- | --- | --- |
| `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs` | 2026-09-29 | 0 | PASS | terminal log / 522 tests | 514 pass，8 个既有 Windows/Linux 文件系统场景 skipped |
| `node tests/local-service/http-integration.mjs` | 2026-09-29 | 0 | PASS | terminal log | 临时服务重启、备份恢复；非真实用户目录 |
| `node --test tests/unit/localServiceClient.test.ts tests/unit/localServiceMigration.test.ts tests/unit/localServiceServer.test.ts tests/unit/localServiceStore.test.ts tests/unit/assetStorage.test.ts` | 2026-09-29 | 0 | PASS | terminal log | 服务、迁移、资产边界、离线断开、冲突 revision、备份发布回滚定向回归 |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 2026-09-29 | 0 | PASS | terminal log | TypeScript 类型检查 |
| `node node_modules/eslint/bin/eslint.js src tests scripts vite.config.ts playwright.config.ts --max-warnings 0` | 2026-09-29 | 0 | PASS | terminal log | Hosted verify 首轮暴露的 4 项 lint 已修复并本地重跑 |
| `node scripts/check-ui-standards.mjs` | 2026-09-29 | 0 | PASS | terminal log | 166 个文件，0 项违规 |
| `node scripts/check-governance.mjs` | 2026-09-29 | 0 | PASS | terminal log | 76 tasks，0 violations；含本机服务 server-only import guard |
| `node scripts/check-features.mjs` | 2026-09-29 | 0 | PASS | terminal log | 34 features，0 violations；FEAT-037 registry/card/test paths一致 |
| `node scripts/check-markdown.mjs` | 2026-09-29 | 0 | PASS | terminal log | 90 active files，0 link violations |
| `node scripts/platform-versions.mjs check` | 2026-09-29 | 0 | PASS | terminal log | 三端版本源一致 |
| `node node_modules/prettier/bin/prettier.cjs --check ...` | 2026-09-29 | 0 | PASS | terminal log | 当前源码/测试/脚本/JSON |
| `node node_modules/vite/bin/vite.js build` | 2026-09-29 | 0 | PASS | `dist/`（构建产物，不入库） | Rollup 依赖注释和大 chunk 仅为 warning |
| `node node_modules/@playwright/test/cli.js test tests/browser/local-service-migration.spec.ts --workers=1 --retries=0` | 2026-09-29 | 0 | PASS | browser test output | 真实临时服务；旧 IndexedDB revision 保持 |
| `node node_modules/@playwright/test/cli.js test tests/browser/local-service-connection.spec.ts --workers=1 --retries=0` | 2026-09-29 | 0 | PASS | browser test output | 1920px/390px；连接、备份、断线、断开；测试后生成的 `docs/evidence/browser-results.json` 已恢复未改状态 |
| `node node_modules/@playwright/test/cli.js test tests/browser/platform-version.spec.ts --workers=1 --retries=0` | 2026-09-29 | 0 | PASS | browser test output | Web 运行态显示 2.1.2；测试后证据文件已恢复 |
| `node tests/local-service/production-smoke.mjs` | 2026-09-29 | 0 | PASS | terminal log | 重新构建 bundle、bundle boundary、fresh context、服务重启快照恢复 |
| `git diff --check` | 2026-09-29 | 0 | PASS | terminal log | 仅 Windows 行尾提示，无 whitespace error |

## 验收覆盖

| AC | 平台/状态 | 预期 | 观察结果 | 证据 | PASS/FAIL/NOT VERIFIED |
| --- | --- | --- | --- | --- | --- |
| AC-1 | Web / 1920px、390px / 服务在线 | 可配对并显示已连接 | 通过设置 UI 配对，一次性码消费成功，状态已连接 | `local-service-connection.spec.ts` | PASS |
| AC-2 | Web / 服务终止、断开 | 离线/断开不报已保存 | 390px 服务终止显示服务离线；断开清除 metadata；HttpOnly cookie 不在 Web Storage | connection browser + client tests | PASS |
| AC-3 | Web / 旧 IndexedDB | 预检和确认导入无损，旧库不删除 | 快照/素材导入到服务，旧 snapshot revision 仍为 0 | `local-service-migration.spec.ts` + migration unit | PASS |
| AC-4 | 本机服务 / 重启、备份 | 重启/备份后可读取 | integration、server/store backup restore、production smoke 通过 | listed commands | PASS |
| AC-5 | Web bundle | 不含 Node 服务入口/配对码/数据根 | smoke scan 未发现 `node:fs`、`node:http`、`node:crypto`、`Pairing code:`、`KK_STUDIO_COMPANION_DATA` | `production-smoke.mjs` | PASS |

## UI / 运行态证据

- 实际启动命令、cwd 与进程：Playwright webServer 使用 `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`；测试用临时 Node companion service。
- URL/端口、运行模式：`http://127.0.0.1:1423/`，Vite preview production build；设置 route 通过“打开设置”→“储存”进入。
- route → import → 页面/组件链：`App.tsx` → `SettingsPanel`/`SettingsSections` → `CompanionSettings` → `CompanionMigrationActions` → `local-service/client.ts`/`migration.ts`。
- data-runtime-mode / data-runtime-entry / index script：由现有 Vite preview 启动链验证；本轮 smoke 另查 bundle 不能包含 Node 服务入口。
- Web bundle hash、Tauri EXE hash、数据根目录/profile：Vite 输出 `dist/assets/index-Un0Hptha.js`（本地构建生成，hash 可能随后续源码变化）；临时 service root 由脚本创建并清理；Tauri EXE 不在本轮修改范围。Web 版本为 `2.1.2`，Desktop/Mobile 仍为 `2.1.1`。
- 视口、动态文案、交互/键盘/错误/取消/离线：1920px 覆盖连接/备份/断开；390px 覆盖服务离线错误；迁移显示上传进度和失败保留旧库。
- DOM、computed style、截图与日志路径：Playwright DOM assertions；默认 JSON reporter 生成的浏览器结果在每次运行后恢复，避免将临时运行记录混入提交；未宣称 Figma 视觉等价。
- 原生重启/恢复/安装验证与范围：Node companion 真实进程重启和数据恢复通过；安装器/自动更新未运行。

## 外部能力与真实性

- 本地 fixture 验证范围：单测使用临时目录和注入 fetch/IndexedDB；浏览器验收启动真实 Node loopback 服务并使用真实 cookie/CORS/文件读写。
- live Provider/ComfyUI/GPU/账号/账单/部署验收及凭据授权来源：NOT RUN；本轮不需要真实 Provider/账号，VPS 上传/SSH/Git/data recovery UNKNOWN。
- live eval：NOT RUN。
- 远端 PR/CI/ruleset 回读与时间：待推送分支、PR #30 后追加；本地通过不等于 Hosted 门禁通过。
- 未验证事项：BACKEND-PLATFORM 登录、服务安装器/自动更新、Mobile 原生持久化、VPS 生产上传和恢复演练。

## 结论和后续

- 实现：PARTIAL（本机服务和迁移链实现，账号/安装器/Mobile/VPS 不在本轮）。
- 验证：PARTIAL → 本地实现验证 PASS，待独立 review/Hosted/merge/postmerge。
- 产品能力：Web 本机服务为 PARTIAL；Desktop 原生能力未改变；Mobile/账号为未接入。
- 独立 review 记录与审查 SHA：reviewer 已按实现 head `082d1c4` 重新派发；旧 head review 不自动适用于新提交。
- 用户产品验收和发布授权：用户授权继续工程工作；本轮有自动化交互验收，无用户手动视觉验收记录；未发生 VPS/生产发布。
- 未关闭风险与账本 ID：`BACKEND-PLATFORM`、`T12`、`T10/T11`；导入中断后的未引用服务素材需后续 GC；安装器与更新策略需另项。
- 新 SHA 或配置变化后需要的复验：任何源码/治理冲突解决后重新执行 full unit、typecheck、UI/format/build、三个 browser specs、production smoke 和 delivery check。

## 追加勘误

- 2026-09-29：真实浏览器首轮发现 detached `fetch` 会让界面误判服务离线；客户端改为 wrapper 后迁移和连接验收重新通过。资产服务首轮发现缺少 `size`，补字段并新增 `assetStorage` 服务路径回归。
- 2026-09-29：PR #30 首次 Hosted verify 报告 4 项新增 ESLint 错误（未安装 react-hooks 禁用注释、未使用 import/type、测试 helper 显式 any）；提交 `8637acd` 删除无效注释/未使用项并改为泛型 JSON helper，本地 ESLint、定向单测和类型检查通过，等待新 head Hosted 重跑。
- 2026-09-29：独立复审前置发现服务快照可接受缺失资产、网页服务快照未做 URI 编解码、备份恢复非原子、离线断开不清理连接、provenance/重复素材边界、冲突响应和会话绑定缺口；`6d0346e` 已补齐引用校验、encode/hydrate、暂存回滚、严格 schema/敏感字段、冲突 currentRevision、报告 TTL/session、哈希会话、元数据分页和来源保留，并将 Web 版本自动 bump 至 `2.1.2`。`082d1c4` 又收紧来源 URL、manifest 时间、恢复路径、stale cookie 检查和恢复前主快照校验；上述结论待独立 reviewer 对该 head 复核。
