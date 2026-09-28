# Intent：主线合并后迁移操作单收口

- Task ID：TASK-POSTMERGE-MIGRATION-2026-09-28
- 状态：PASS；主线证据、独立复审与 Hosted 门禁均已回读
- 日期：2026-09-28
- 范围：更新迁移操作单和进度记录到 `main@096d6c3`，保留 VPS 实机、备份和恢复的未知边界；不改产品代码、不执行生产部署。
- 关联：[规范](spec.md)、[计划](plan.md)、[验证](verification.md)、[审查](review.md)。

## 验收

| ID | 预期结果 | 证据 |
| --- | --- | --- |
| AC-1 | `deploy/MIGRATION.md` 的主线 SHA、CI 事实与当前仓库一致 | `main@096d6c3`、tree 和 Hosted API 回读 |
| AC-2 | 操作单不把 GitHub 门禁或控制面板误写成 VPS 上传/恢复证明 | 迁移操作单边界段落 |
| AC-3 | `PROGRESS`、迁移操作单、账本与本五文件包一致 | 治理/Markdown/delivery 检查 |
| AC-4 | 实际 VPS、SSH、离机数据、DNS/TLS 和恢复演练继续明确为未验收 | T10-PREP/T10/T11 记录 |
