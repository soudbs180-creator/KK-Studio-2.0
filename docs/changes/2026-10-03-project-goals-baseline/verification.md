# Verification：项目建设目标与验收基线

状态：已完成本地验证；日期：2026-10-03，Asia/Shanghai。

实现 head：`d297ce5`（基线 `c6db26a`）。

## 证据范围

- 目标入口：`docs/governance/PROJECT_GOALS.md`。
- 门禁：`scripts/check-project-goals.mjs`、`package.json` 的 `goals:check` 和 `lint` 链。
- 治理同步：`docs/governance/task-ledger.json`、生成的 `TASK_LEDGER.md`、`PROJECT_STATE.md`、`AI_HANDOFF.md`、`docs/PROGRESS.md`。

## 验收记录

| 检查               | 实际命令                                                                                                  | 结果                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 项目目标门禁       | `node scripts/check-project-goals.mjs`                                                                    | 通过                                                     |
| 治理账本/生成视图  | `node scripts/check-governance.mjs --write`                                                               | 96 tasks / 0 violations                                  |
| 功能注册表         | `node scripts/check-features.mjs`                                                                         | 34 features / 0 violations                               |
| Markdown 链接      | `node scripts/check-markdown.mjs`                                                                         | 99 active files / 0 violations                           |
| ESLint             | `node node_modules/eslint/bin/eslint.js src tests scripts *.config.ts *.config.mjs --max-warnings 0`      | 0 errors                                                 |
| TypeScript         | `node node_modules/typescript/bin/tsc --noEmit --pretty false`；`node node_modules/typescript/bin/tsc -b` | 均通过                                                   |
| UI 标准            | `node scripts/check-ui-standards.mjs`                                                                     | 194 files / 0 violations                                 |
| 格式               | Prettier 针对源码、脚本、配置和本轮文档执行 `--check`                                                     | All matched files use Prettier code style                |
| Node 单测/部署     | `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs`                                                | 661 tests / 653 pass / 0 fail / 8 skipped                |
| Canvas Agent       | `node vendor/canvas-agent/node_modules/tsx/dist/cli.mjs --test vendor/canvas-agent/src/**/*.test.ts`      | 174 tests / 172 pass / 0 fail / 2 skipped                |
| MCP 设置浏览器回归 | `node node_modules/@playwright/test/cli.js test tests/browser/mcp-settings.spec.ts`                       | 4 passed                                                 |
| 全量浏览器回归     | `node node_modules/@playwright/test/cli.js test`                                                          | 379 passed                                               |
| Vite 构建          | `node node_modules/vite/bin/vite.js build`                                                                | 2975 modules；构建成功，仅既有依赖注释与大 chunk warning |
| Rust               | `cargo check --manifest-path src-tauri/Cargo.toml`                                                        | 通过，仅 5 项既有 dead_code warning                      |

本轮环境没有可用 npm CLI，因此没有把未执行的 `npm run verify` 写成通过；以上是同一依赖树下实际运行的 Node/Cargo 等价命令。

## 边界

本任务只验证建设基线和本地门禁，不关闭真实 Provider/GPU、ComfyUI、VPS、Mobile、第三方 MCP、账号/云端或用户最终视觉验收。它们的状态仍以任务账本和功能卡为准。
