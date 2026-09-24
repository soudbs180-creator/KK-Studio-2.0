# TASK-PROV-004 plan — Claude Code settings.json 落盘（agent 侧）

- 日期：2026-09-24
- 分支：feat/TASK-PROV-004-claude-landing（堆叠于 origin/feat/TASK-PROV-003-provider-wiring @ 2618344）
- Worktree：D:/kk-studio/.worktrees/TASK-PROV-004-claude-landing

## 步骤

1. **工程准备**：worktree 已建；npm ci 后台。
2. **文档包**：intent/spec 已写；plan 本文件；verification/remaining/review 实现后补。账本登记 TASK-PROV-004（IN_PROGRESS→REVIEW），FEAT-030 tasks 追加。
3. **实现 `claude-provider-config.ts`**：mergeClaudeSettingsJson（保守 JSON 合并）→ applyClaudeProviderConfig（原子写盘）→ 复用 003 的 providerKey/envKeyFor/parseModelWindow/assertNoSecrets。
4. **CLI**：provider-cli.ts 增加 `apply-claude` 分支（复用 parseApplyFlags）。
5. **单测**：spec §7 全部用例；`npm run test:agent` 全绿。
6. **门禁**：typecheck / lint / 根 npm test（394 回归）/ ui:check / format / governance / features / markdown。
7. **真实验证**：临时 CLAUDE_CONFIG_DIR 跑 dry-run + 真写，记录路径、内容、权限、幂等。
8. **提交与推送**：实现提交 + 文档 head 回填提交；推送 `feat/TASK-PROV-004-claude-landing`；登记 PR 建议（base 003 分支）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| JSON 整文件重写破坏用户设置 | 深拷贝 + 只写受管键；单测覆盖 permissions/hooks/env 其他键保留；非法 JSON 不覆盖 |
| 密钥落盘 | 只写 baseUrl；assertNoSecrets 兜底；认证通道说明在文档与 remaining |
| 与 003 的 providerKey/parseModelWindow 契约漂移 | 直接复用 003 导出函数（不复制），claude 模块只新增合并/落盘 |
| 堆叠深度 | 004 依赖 003；合并顺序 #16→#17→#18；003/004 的 review 可在同批处理 |

## 验收清单

- [ ] 三类合并输入单测通过且幂等；非法 JSON 抛错
- [ ] 输出无密钥形态文本；权限 0600/0700
- [ ] test:agent 与根门禁全绿
- [ ] CLI 真实目录验证记录于 verification.md（含路径/内容/权限/dry-run/幂等）
- [ ] 分支推送；文档包 5 个核心文件齐全
