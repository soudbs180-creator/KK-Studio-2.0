# TASK-PROV-003 plan — Codex Provider 配置注入与 model catalog 落盘（agent 侧）

- 日期：2026-09-24
- 分支：feat/TASK-PROV-003-provider-wiring（堆叠于 origin/feat/TASK-PROV-002-provider-connectivity @ 42c3f26）
- Worktree：D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring

## 步骤

1. **工程准备**：`git worktree add -b feat/TASK-PROV-003-provider-wiring <dir> origin/feat/TASK-PROV-002-provider-connectivity`；npm ci（后台）；读 app 侧契约确认镜像一致。
2. **文档包**：本目录 intent/spec/plan 先行；verification/remaining/review 在实现后补全。账本登记 TASK-PROV-003（IN_PROGRESS→REVIEW），FEAT-030 registry 追加任务引用（保持 PARTIAL）。
3. **实现 `codex-provider-config.ts`**：常量与防线（CREDENTIAL_PATTERNS、providerKey、envKeyFor、tomlQuote）→ 渲染 → 合并 → catalog → 编排。
4. **实现 `provider-cli.ts` + index.ts 分派**；package.json test 脚本加新测试文件。
5. **单测**：覆盖 spec §8 全部用例；`npm run test:agent`（vendor/canvas-agent）全绿。
6. **门禁**：typecheck（agent tsc + 根 tsc）、lint、根 `npm test`（回归 394+）、format:check、ui:check、governance/features/markdown；`verify` 是否纳入 test:agent 视其基线是否全绿决定（绿则加入并在文档注明）。
7. **真实验证**：CLI 在本机对临时 CODEX_HOME 跑 apply/check（dry-run + 真写），记录输出与文件权限。
8. **提交与推送**：两个提交（实现 + 文档回填 head SHA），推送 `feat/TASK-PROV-003-provider-wiring`；报告 PR 创建链接。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| TOML 行级合并破坏用户配置 | 只动 kk_* 自有表与显式顶层键；单测覆盖注释/自定义表/幂等；dry-run 先行 |
| 与 TASK-AGENT-006 文件冲突 | 本批不触碰 server/http.ts、config.ts、workbuddy.ts；冲突面登记 remaining |
| 密钥泄露 | assertNoSecrets 防线 + 单测；真实验证用假密钥环境变量 |
| Node 版本差异（v22 vs engines>=24） | 与本仓库既有基线一致（EBADENGINE 警告不阻塞），agent engines>=18 无碍 |

## 验收清单

- [ ] 4 类合并输入单测通过且幂等
- [ ] 输出无密钥形态文本
- [ ] test:agent 全绿；根门禁全绿
- [ ] CLI 真实目录验证记录于 verification.md（含路径/权限/dry-run）
- [ ] 分支推送；文档包齐全（5 个核心文件）
