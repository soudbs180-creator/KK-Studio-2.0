# Review：AI 协作规则文档结构收敛

- Task ID：TASK-DOCS-STRUCT-001
- 审查对象：base `80904759`.. head（本分支）
- 审查身份：实现者自检。**尚未经独立上下文 AI 复核**，按 `docs/engineering/REVIEW.md` 属未完成的合并条件。
- 日期：2026-10-09
- 关联：[`intent.md`](intent.md) · [`spec.md`](spec.md) · [`plan.md`](plan.md) · [`verification.md`](verification.md)

## 1. 必查范围

| 范围 | 结论 |
| --- | --- |
| 文档与实际门禁一致 | PASS。每条规则从脚本源码提取，见 verification 第 1 节 |
| 链接完整 | PASS。`markdown:check` 104 files 0 violations |
| 账本同步 | PASS。115 tasks 0 violations |
| 无第二来源 | PASS。未新建 3 份计划外文档 |
| 未越权改动 | PASS。`src/**`、`scripts/**` 零改动 |
| 未覆盖他人改动 | PASS。工作区 3 个 `src/styles/*.css` 改动与 `docs/decisions/` 未被 add/reset |
| 命名统一 | PASS。全部沿用 UPPER-CASE.kebab，未引入小写 kebab 风格 |
| 未手改生成文件 | PASS。`TASK_LEDGER.md` 由 `governance:write` 生成 |

## 2. 问题清单

### P1：无

### P2：需知悉但不阻塞

1. **`PROJECT_STATE.md` 与 `AI_HANDOFF.md` 仍有 36 个同名二级章节重复**。本次未处理（需单独授权）。已在 `docs/README.md` 的「治理文档」小节显式说明「以 `PROJECT_STATE.md` 为当前事实，`AI_HANDOFF.md` 仅作交接线索」，避免下次会话又踩同一坑。
2. **`CODING-STANDARDS.md` 中 10 个超限文件未被门禁覆盖**。已在文档中明确标为「已知技术债，靠评审约束」，并写明不得加入白名单绕过。
3. **部分条目为约定而非门禁**。600 行新文件上限、重复 3 处即提取 token、`catch {}` 视为违规等条目在文中已标注「约定（评审执行，无门禁）」，不谎称有强制检查。
4. **`docs/README.md` 记录的 worktree 落点 `D:\kk-studio\.worktrees\TASK-ID-slug` 属本机约定**，与 `BRANCH-POLICY.md` 的表述一致，均声明「不是跨设备运行契约」。

## 3. 第一轮自检发现并修正的问题

1. **自动合并表述不实**：`BRANCH-POLICY.md` 原文与上一轮总结均称已新增 `scripts/governance/auto-merge.mjs`。核对 `ls scripts/governance/` 后确认**该脚本不存在于仓库**。已改为按实际写「尚未落地」，并说明阻塞原因（固定 1421/1423 端口串行验证要求）与未来实现必须满足的条件。宁可如实记录阻塞，也不保留不实表述。
2. **文档引用了不存在的脚本**：初稿 `CODING-STANDARDS.md` 脚本命名示例误用 `auto-merge.mjs`。已改为实际存在的 `desktop-release.mjs`。
3. **`docs/decisions/` 未跟踪目录**：属画布 token 化遗留，非本次范围，未纳入交付包。

## 4. 独立上下文 AI review（第二轮）

审查者无本次实现上下文，独立核对实际 diff 与源码。结论：**CHANGES REQUIRED**。发现 2 个 P1、6 个 P2、9 个 P3，全部已核实为真并修复。

### 已修复的 P1

1. **`CODING-STANDARDS.md` 依赖方向表与实际代码矛盾且无门禁支撑**（最严重）。原表声明「依赖只能单向向下」并给出「允许依赖」列，但实测 `src/components/` 有约 97 处导入 `features`、2 处导入 `runtime`；`src/domain/` 有 2 处导入 `runtime/storage-contract.ts`（`modelProvider.ts`、`settings.ts`）。而 `import-boundaries.mjs` 的 domain 禁令列表**不含 runtime**——即门禁允许、表格禁止。后续 AI 读此表会把 97 处合法 import 当缺陷去"修复"。已改写为「门禁强制的依赖约束」与「当前实际依赖（实测）」两列，并补 runtime 例外说明。

2. **CSS token 位置与 `UI_RULES.md` 3.1 直接冲突**。原写「`--kk-*` 与 `--ui-*` 定义只写在 `tokens.css`」，实测 `tokens.css` 中 `--ui-*` 定义为 **0**，实际在 `ui-tokens.css`（127 条）与 `responsive-content.css`。本交付包 `verification.md` 自己核对表已写对，等于承认正文写错。已改正并与 UI_RULES 3.1 对齐。

### 已修复的 P2

3. **同一交付包内「工作区 CSS 改动数」4 与 3 自相矛盾**（intent/plan/spec 写 4，review/verification/PROGRESS 写 3）。实测 3。已统一为 3 并列出具体文件名。
4. **ESLint 覆盖范围被高估**：`files` 仅含 `tests/**/*.ts`，19 个 `tests/desktop/*.mjs|.ps1` 等完全不受检查。已实测验证（追加未使用变量仍 exit 0）并在门禁表中显式说明。
5. **开篇「规则条目全部对应可执行门禁」失实**，且原 review 声称已标注约定的三例中有两例未标注、一例（`catch {}`）实际有门禁。已改为区分标注，并给命名规范、组件化与复用、状态与数据流、TypeScript 四节加「约定（评审执行，无门禁）」，逐条标注错误处理的门禁归属。
6. **`docs/decisions/` 未入库却被索引**——本次「建立单一权威索引」变更自己引入了索引失准。已从目录表移除（待入库后再索引）。
7. **evidence 目录命名规范与现状不符**（约 80 个裸文件）。已改为「新证据按…组织（约定）；现存历史条目含早期裸文件，尚未迁移」。
8. **`verification.md` 证据链不闭合**：§3 两行指向不存在的「实测输出」小节。已补齐全部实测输出与退出码，并补充独立验证命令。

### 已修复的 P3

9. `TESTING.md` 原称 `verify` 是「完整闸门」，与 `DEVELOPMENT.md`「不能暗示包含全部 Rust/native/live 门禁」冲突。已改为「主闸门」并列出不包含的 5 项。
10. `README.md` 把机器专属绝对路径 `C:\Users\Administrator\...` 写入仓库文档。已改用 `%USERPROFILE%`。
11. `UI_RULES.md` 只提 baseline 承载颜色白名单，未提同时承载 46 个 Lucide 符号白名单。已补（实测 19 文件 / 28 颜色键 / 46 Lucide / 13 文件含 Lucide）。
12–14. 行数 off-by-one（`check-ui-standards.mjs` 112→按`wc -l` 为 111）、`docs/README.md` 27→26 行、`AGENTS.md` 76→75、`BRANCH-POLICY.md` 64→63、索引表数字 11+11+5+7→11+7+5+7、`worktree` 数量 83→47（`git worktree list` 实测）。**注**：行数差异源于 CRLF/LF 计数口径，非实质错误，已在 review 中如实标注。

## 5. 环境事件（非本次 diff 造成，需用户确认）

独立 reviewer 在审查期间发现：会话开始时工作区的 3 个 `src/styles/*.css` 未提交改动已消失，`git reflog` 显示 `reset: moving to HEAD`（mixed reset，HEAD@{0}，17:41提交之后）。

- 已尝试恢复：`git fsck --lost-found` 产出 89 个悬空 blob，按内容特征与文件大小比对**未能定位到这 3 个文件的改后版本**。
- 该3 处在 `docs/decisions/0001-canvas-ui-token-alignment.md` 中的落地清单里除 P0-观察外**全部未勾选**，说明丢失的是探索性中间状态，ADR 已完整记录决策与待办，可据此重建。
- 本次 diff 本身不含 `src/`，`git diff --name-only` 无 `src/` 匹配，「未越权」结论不受影响。
- **建议用户确认是否需要重建**。本次未尝试重建：ADR 描述的是重写级工作量（`canvas-navigation.css` 整个文件重写 + `workspace.css` 20 个 hex 逐个回灌 + `CanvasNodeLayer.tsx` 布局改造），属需单独授权的代码变更。

## 6. 无法验证项

- `docs/changes/` 不在 `markdown-links.mjs` 的 `activeDirectories` 内，5 个交付包文件的链接不受门禁约束。已按同规则独立校验，0 missing，但证据来自独立补验而非门禁。已在 `verification.md` §6 如实标注。
- `npm run verify` 未全量运行，理由已记录。
- `config/ui-legacy-baseline.json` 的门禁效果为静态核对，未穷举验证每条 baseline 条目是否仍必要。

## 7. 结论

第一轮自检修正 2 项不实表述；独立 review 发现 2 个 P1、6 个 P2、9 个 P3，**全部已修复并复跑门禁**。当前无已知 P0/P1。

**仍未满足的合并条件**：缺用户对「工作区 3 个 CSS 改动丢失」的环境事件确认。其余条件已满足。
