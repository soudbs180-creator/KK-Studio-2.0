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

## 3. 已修正的问题（自检发现）

1. **自动合并表述不实**：`BRANCH-POLICY.md` 原文与上一轮总结均称已新增 `scripts/governance/auto-merge.mjs`。核对 `ls scripts/governance/` 后确认**该脚本不存在于仓库**。已改为按实际写「尚未落地」，并说明阻塞原因（固定 1421/1423 端口串行验证要求）与未来实现必须满足的条件。宁可如实记录阻塞，也不保留不实表述。
2. **文档引用了不存在的脚本**：初稿 `CODING-STANDARDS.md` 脚本命名示例误用 `auto-merge.mjs`。已改为实际存在的 `desktop-release.mjs`。
3. **`docs/decisions/` 未跟踪目录**：属画布 token 化遗留，非本次范围，未纳入交付包。

## 4. 结论

文档层变更可复核、无事实性错误、无越权改动。**但合并条件未满足**：缺独立上下文 AI review，缺用户产品结果确认（P3 类文档改动按已授权技术准备处理）。

后续建议按需单独授权：治理文档瘦身、worktree 收敛、`src/App.tsx` 门禁决策。
