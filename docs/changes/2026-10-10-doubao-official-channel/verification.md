# Verification：豆包（火山方舟）官方通道 P1

- Task ID：TASK-AI-GATEWAY-001（P1 官方通道）
- 记录状态：FINAL（真实上游联调 NOT VERIFIED，属外部条件）
- 执行时间与时区：2026-10-10，UTC+8
- Intent / Spec / Plan / AC：`docs/changes/2026-10-10-doubao-official-channel/{intent,spec,plan}.md`
- cwd / branch：`D:/kk-studio/KK-Studio-2.0` / `docs/TASK-DOCS-STRUCT-001`
- 被验证 base SHA / head SHA / tree SHA：base `8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`（本地 `origin/main`）；head `c58a2c8ce9bd886010194b18633cc0b65f23f79d`；tree `e45484511f586e0e58eda78c6e2c55d313a0dbf9`
- 代码前置提交：Canvas 参考图视口修复 `53981de3fbcdbcd31d900e441f4a3ee0532a45c8`；本包提交 `c58a2c8ce9bd886010194b18633cc0b65f23f79d`
- 工作区：验证时目标提交前无未登记改动；并发工作区改动已单独保存，不在本包中。
- Node/npm/OS：Node 24（Windows）；npm 随仓库脚本运行。
- 规则版本：`AGENTS.md` / `AI_RULES.md` / `docs/README.md`（2026-10-09 收敛版）。

## 实际命令和结果

| 命令/检查 | 退出码 | 结果 | 范围与限制 |
| --------- | ------ | ---- | ---------- |
| `node --test tests/unit/modelProvider.test.ts tests/unit/creation.test.ts tests/unit/addCanvasReferences.test.ts` | 0 | PASS（21/21） | Doubao 预置、模型能力判定及参考图边界 |
| `npm test` | 0 | PASS（897 总计，889 通过、0 失败、8 跳过） | 包含 unit 与 deploy 测试 |
| `npm run typecheck` | 0 | PASS | `tsc --noEmit` |
| `npm run lint` | 0 | PASS | 包含版本、目标、治理、功能和 Markdown 门禁；治理 117 项/0 违规，功能 36 项/0 违规 |
| `npm run format:check` | 0 | PASS | Prettier 全量检查 |
| `npm run ui:check` | 0 | PASS | 215 个文件，0 项违规 |
| `npm run build` | 0 | PASS | Vite 构建成功；仅保留既有 zod 注释和 chunk 大小警告 |
| `KK_TEST_PORT=1424 npm run test:ui -- tests/browser/connection-drag.spec.ts` | 0 | PASS（7/7） | 连接交互回归 |
| `KK_TEST_PORT=1425 npm run test:ui -- tests/browser/frontend.spec.ts` | 0 | PASS（16/16） | 含豆包预置选择后名称与方舟地址冒烟 |
| 真实方舟 `/models`、`/images/generations` | — | NOT VERIFIED | 需要用户提供有效 Key 和外部服务 |
| 远端 PR/CI/ruleset 回读 | — | NOT VERIFIED | 当前网络无法回读远端设置；未声称已推送或已远端合并 |

## 验收覆盖

| AC | 预期 | 观察结果 | 证据 | 状态 |
| --- | --- | --- | --- | --- |
| AC-1 | 设置页出现「豆包（火山方舟）」预置，选择后填入名称与接口地址 | `doubao-ark` 填入 `https://ark.cn-beijing.volces.com/api/v3`；浏览器冒烟验证名称和地址 | `tests/unit/modelProvider.test.ts`、`tests/browser/frontend.spec.ts` | PASS |
| AC-2 | doubao 文本模型判 text、seedream 判 image | `doubao-seed-1-6-250615` 等文本模型与 `doubao-seedream-*` 图片模型定向断言通过 | `tests/unit/creation.test.ts` | PASS |
| AC-3 | 既有模型判定不回归 | 全量回归 897/889/0/8；既有 provider 能力断言保留 | `npm test` | PASS |
| AC-4 | Desktop/Web 使用真实方舟凭证完成生成 | 未执行真实上游调用 | — | NOT VERIFIED |

## 评审结论和后续

- 代码、单元、浏览器冒烟、类型、lint、格式、UI 门禁和构建均通过。
- 产品状态仍为 Prototype：未验证真实方舟凭证、DPAPI 和 Desktop 运行态，因此 TASK-AI-GATEWAY-001 继续保持未完成。
- 下一步：由用户提供方舟 Key 后执行 `/models` 与 `/images/generations` 实测；随后实现真实 DPAPI SecretProtector，并补 Desktop 运行态证据。
- 不变式：API Key 只进入凭据服务/请求内存，不写入 localStorage、项目快照或交付包。