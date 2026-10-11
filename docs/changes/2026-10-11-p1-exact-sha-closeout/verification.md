# Verification：P1 exact SHA 证据收口

- 日期与时区：2026-10-11；Asia/Shanghai
- 冻结 worktree：`D:/kk-studio/KK-Studio-2.0/.worktrees/p1-exact-1f6cbd3`
- exact SHA：`1f6cbd37091326a899fa600baba53bf6efd9cf16`
- 远端 parent：`7736c99bd5e900e7c5cd8a36663aadcb45326143`
- 任务实现提交：`4949b3db9471113c7e70b7f78a0a35c457e30cca`；该提交经 PR #51 合入 `7736c99b`，再由 `1f6cbd3` 作为当前远端树承载。
- 冻结状态：detached、clean；主工作区仍保留原有 dirty 改动，未被重置或覆盖。

## 远端与 Hosted

| 检查 | 结果 | 证据边界 |
| --- | --- | --- |
| GitHub `main` exact SHA | PASS | `1f6cbd3` 为当前远端 main 最新提交，提交页和 checks 页已回读 |
| `quality.yml` run #360 | PASS | run `38080705770`；`verify` 与 `deploy-linux` 成功，耗时约 27m55s |
| `verification-evidence` artifact | PRESENT | digest `sha256:a989e40806c4bd2f3a0a9e17d17f520e82906e408d9cc7f8ba48d21367be8b6b`，约 19.6 MB |
| `git-guards` | PRESENT / SUCCESS | run `38080705741` 已在 exact SHA checks 与提交状态中回读 |
| `delivery` | SKIPPED | main push 不满足 delivery 条件；不构成 Windows 发布、签名、安装或用户验收证据 |

Hosted 页面同时报告 Node.js 20 action deprecation 和 Ubuntu runner 迁移提示；它们是 warning/notice，不是本次失败。

## 冻结树本地验证

| 检查 | 结果 | 限制 |
| --- | --- | --- |
| Playwright `KK_TEST_PORT=1431` | PASS（在配置加载前拒绝） | 只证明配置拒绝路径 |
| Playwright `KK_TEST_PORT=1423` / 未设置 | PASS；`--list` 列出 447 项 | 只证明固定 origin/fixture 配置可加载 |
| 来源与 Gemini/local-service 单测 | PASS，19/19 | 冻结树不包含当前脏主线后来新增的 `verificationOrigins.test.ts` |
| 六组生产 browser specs | PASS，25/25；workers=1、retries=0 | exact SHA、fresh preview、Edge；不等同完整 Hosted browser suite |
| Vite production build | PASS | 仅既有 zod annotation 与 chunk size warning |
| governance / features / markdown gates | PASS；115 tasks、35 features、102 active Markdown，均 0 violations | 这是冻结树较旧的治理快照，不覆盖当前脏主线的 120/36 计数 |
| full unit/deploy | 815 pass、2 fail、13 skip（830 total） | 两个 `desktopAgentRuntime` 失败属于本地进程/环境启动边界，未在本 P1 来源收口中修复 |
| version consistency | NOT RUN | 该脚本在冻结 SHA 中不存在；不能用当前脏主线脚本结果回填 |

## 当前结论

`TASK-VERIFY-ORIGIN-003` 的 exact SHA、远端 Hosted、固定来源配置、目标浏览器回归和绑定 `4949b3db`/`1f6cbd3` 的独立审查收据已经补齐；按该任务的来源契约范围，结论为 `DONE/PASS`。独立收据见 [exact-independent-review.md](exact-independent-review.md)。

以下 P1 仍按原证据边界保留：`TASK-AGENT-010` 缺少 Hosted Windows delivery receipt、第二环境安装和版本/commit/hash/进程路径回读；`TASK-DOCS-HISTORY-001`、`TASK-TASKSTATE-002`、`TASK-AI-GATEWAY-001` 仍有各自的独立审查或真实外部回执缺口；Windows 入口、真实 Provider、移动设备和 BYOK 继续 NOT VERIFIED/TODO。
