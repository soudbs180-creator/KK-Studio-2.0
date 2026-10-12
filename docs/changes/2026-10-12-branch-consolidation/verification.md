# 验证：本轮实测证据

## 门禁实测（P0 单元，2026-10-12）

| 门禁 | 结果 |
|---|---|
| `npm run version:check` | PASS（平台版本一致） |
| `npm run version:consistency` | PASS（0 hardcoded-version warning） |
| `npm run lint` | PASS（含 index:check 16 ADR 0 violations、doc:commands:check 141 文件 0 violations） |
| `npm run typecheck` | exit 0 |
| `npm test` | 986 项：970 pass / 8 fail / 8 skip |
| `npm run delivery:check --base 0706fb3a… --head c8807d3e… --branch codex/ui-redesign-20261011` | 31 files; 0 violations |
| 合并后 `governance:check` / `lint` / `typecheck` | PASS（122 tasks, 0 violations） |

### 8 个测试失败的性质认定（PRE-EXISTING，非本轮回归）

复跑确认：7 个在 `tests/deploy/release-scripts.test.mjs`（packaging/deploy symlink 相关），1 个在 `tests/unit/desktopRelease.test.ts`（"desktop release identity rejects linked runtime inputs"）。全部为 Windows symlink 权限环境性失败，与 2026-10-11 记录一致，与本次改动零引用关系。按项目规则标记 PRE-EXISTING，不作为门禁阻断。

## 分支核验实测（P1）

- 测量工具 `scripts/governance/branch-audit.mjs` 实跑：101 分支（含本轮新增 WIP 保全分支）
- 汇总：integrated(subst=0) 8 · noRemote 58 · withWorktree 66 · noCommonBase 1
- 无共同祖先分支唯一：`backup/pre-master-migration-20261011`
- 同树对（`git diff b1 b2` 为空）：MCP-CRITICAL-001 ≡ MCP-PATCH-ANCHOR-001；TASK-VERSION-001 ≡ version-rebased
- UI-012 双分支相差 7 文件；与 main 碰撞文件约 32（含 src/App.tsx、src/components/Canvas.tsx）

## 数据交叉校验

- branch-audit.mjs（Node）与独立 Python 测量（rev-list/diff/cherry）结果互洽：实质已集成 8、无共同祖先 1，均一致
- 台账 120 → 122 项：P0 新增 TASK-GOV-003；主线 consolidation 侧带入 TASK-FIX-PUSH-GUARD-SPACES-001=REVIEW；无重复 ID；governance:check 0 violations

## 未验证边界（诚实声明）

- 未跑完整 `npm run verify`（test:ui / test:agent / test:development）与 1421/1423 浏览器回归
- 未 `git fetch`，origin/main 可能已前进（本地 remote ref 为 1f6cbd37）
- 100 个分支的"内容正确性"未逐个功能级验证——本轮验证的是**集成状态与增量测量**，合并单元的功能验收在后续批次门禁中进行
- UI-012 与 main 的等价功能判断（主线是否已用其他方式实现）未做，属 B5 第二步人工裁决输入
