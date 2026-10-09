# Verification：豆包（火山方舟）官方通道 P1

- Task ID：TASK-AI-GATEWAY-001（P1 官方通道）
- 记录状态：FINAL（真实上游联调 NOT VERIFIED，属外部条件）
- 执行时间与时区：2026-10-10 01:40–02:00 UTC+8
- Intent / Spec / Plan / AC：`docs/changes/2026-10-10-doubao-official-channel/{intent,spec,plan}.md`
- cwd / branch：`D:/kk-studio/.worktrees/TASK-AI-GATEWAY-001-doubao-p1` / `feat/TASK-AI-GATEWAY-001-doubao-p1`
- 被验证 base SHA / head SHA / tree SHA：base `5d4c9551`（chore(governance): align platform delivery and gateway evidence）；本包未提交，head 未生成；tree = 5d4c9551 + 工作区改动
- dirty 状态及 patch/文件指纹（有未提交内容时）：worktree 内有本包源码与文档改动（见 git status）；交付包目录 `docs/changes/2026-10-10-doubao-official-channel/`
- Node/npm/Rust/浏览器/OS/工具版本：Node 24（`node --test tests/unit/*.test.ts` 原生 TS）；Windows；npm 随仓库 lockfile
- 规则版本或 commit：AGENTS.md / AI_RULES.md / docs/README.md（2026-10-09 收敛版）

## 实际命令和结果

| 命令/检查 | 时间 | 退出码 | PASS/FAIL/NOT RUN/N/A | 证据路径 | 范围与限制 |
| --------- | ---- | ------ | --------------------- | -------- | ---------- |
| `node --test tests/unit/creation.test.ts tests/unit/modelProvider.test.ts` | 01:41 | 0 | PASS（18/18） | 本目录 | doubao 判定 + 预置常量定向 |
| `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs`（全量） | 01:44 | 1 | PASS 885 / FAIL 2 / SKIP 8 | 本目录 | 见下方失败归因 |
| `npx tsc --noEmit` | 01:48 | 0 | PASS | 本目录 | 全量类型检查 |
| `npx eslint src tests scripts --max-warnings 0` | 01:49 | 0 | PASS | 本目录 | 全量 lint（src/tests/scripts） |
| 基线对比：主仓 `6d4c25eb` 跑 `desktopAgentRuntime.test.ts` | 01:50 | 0 | PASS（2/2） | 本目录 | 证明 2 个失败与环境相关，非本包引入 |
| `npm run verify`（完整链） | — | NOT RUN | — | — | 含 `test:ui`/`test:development`，worktree 无 dist 构建产物，需主仓构建产物或专门 UI 环境；本轮以 lint+typecheck+unit/deploy 覆盖 |
| 真实方舟 `/images/generations` | — | NOT RUN | — | — | 需用户方舟 Key（外部条件） |

### 全量单测 2 个失败归因（与本包无关）

- `tests/unit/desktopAgentRuntime.test.ts` 两例（#225/#226）：`KK desktop Agent failed to start` / `1 !== 0`。
- 该文件 import 仅含 Node 内置模块（assert/child_process/fs/os/path/events/test/url），**不依赖本包任何改动**。
- 失败源于 worktree 无 `dist/` 构建产物（主仓存在 `dist/`，worktree 为 git worktree 无构建产物）；主仓当前基线 `6d4c25eb` 复跑同一文件 2/2 通过。
- 结论：环境性失败，非本包回归。

## 验收覆盖

| AC | 平台/状态 | 预期 | 观察结果 | 证据 | PASS/FAIL/NOT VERIFIED |
| --- | --- | --- | --- | --- | --- |
| AC-1 | Web/Desktop | 设置页出现「豆包（火山方舟）」预置，选择后填入名称与接口地址 | `PROVIDER_PRESETS` 含 doubao-ark（`https://ark.cn-beijing.volces.com/api/v3`）；`ProviderProfileFields` 预置 select 经 `onUpdate` 填充；单测 3 例通过 | modelProvider.test.ts | PASS（单测+代码审查；未做浏览器运行态） |
| AC-2 | Web/Desktop | doubao 文本模型判 text、seedream 判 image，不再误判 | 新增单测 6 断言全通过：`doubao-seed-1-6-250615`/`doubao-1-5-pro-32k` → text、非 image；`doubao-seedream-*` → image、非 text | creation.test.ts | PASS |
| AC-3 | Web/Desktop | 既有模型判定不回归 | gpt/claude/gemini 等既有断言未删减且全量单测非环境性失败项全绿 | creation.test.ts | PASS |
| AC-4 | Desktop | 真实方舟连通 | 未执行（需用户 Key） | — | NOT VERIFIED |

## UI / 运行态证据（不适用写原因）

- 本轮未启动浏览器/桌面运行态：worktree 为纯源码工作区（无 `dist/`），按「验证以真实运行证据为准」口径，UI 运行态验证登记为缺口，由用户在主仓/发布环境完成设置页冒烟（选预置→填 Key→测试连接）。不将单测通过表述为 UI 已验证。

## 外部能力与真实性

- 本地 fixture 验证范围：无（判定与预置为纯逻辑，无需 fixture）。
- live Provider：**NOT RUN**。真实方舟联调需用户完成火山引擎实名、申请 API Key，并实测 `/images/generations`（含 `n>1` 兼容性与 Seedream 免费额度政策）。本包不编造上游成功证据。
- 远端 PR/CI/ruleset 回读：本分支未推送，未发生。
- 未验证事项：方舟 `/models` 响应体与 `n` 上限；设置页浏览器运行态；`test:ui` 全量。

## 结论和后续

- 实现：完成（代码与单测落地；按仓库规则真实上游未接前不标 DONE）
- 验证：PARTIAL（逻辑/类型/lint 全绿；真实上游与 UI 运行态待外部条件）
- 产品能力：Prototype（BYOK 豆包预置可配置；真实出图未验证）
- 独立 review 记录与审查 SHA：见本目录 `review.md`（self-review；独立 AI review 未发生）
- 用户产品验收和发布授权：未发生
- 未关闭风险与账本 ID：TASK-AI-GATEWAY-001（真实 DPAPI/上游）、TASK-PROV-BYOK-001（产品化接入）
- 新 SHA 或配置变化后需要的复验：推送/合入 main 后需重跑完整 `npm run verify`（含 UI 门禁）与真实联调

## 追加勘误（无则留空）

- 无。
