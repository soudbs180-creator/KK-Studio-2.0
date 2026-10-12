# ADR-007：静态 Web 版本与服务器数据分开搬迁

- 状态：PROPOSED
- 日期 / Task ID / Owner：2026-09-28 / T10-PREP / root
- Intent / Spec / Plan：[本轮 intent](../../changes/2026-09-28-vps-migration/intent.md)、[spec](../../changes/2026-09-28-vps-migration/spec.md)、[plan](../../changes/2026-09-28-vps-migration/plan.md)
- 决策依据：用户要求 Git/VPS 状态核验及 VPS 到期后的快速搬迁准备。

## 背景

现有 `deploy/release.mjs` 能从 `dist` 打包静态 Prototype，`remote-activate.sh` 能按文件 hash 原子激活，但没有整包离机 hash 或显式回滚命令。旧 VPS 的 PostgreSQL、上传文件、可能部署的 Gateway 数据与浏览器 IndexedDB 均不在 Git 中；2026-09-16 审计不能代表本轮当前状态。

## 方案比较

| 方案 | 优点 | 风险/代价 | 决定 |
| --- | --- | --- | --- |
| 只保留 Git 和当前指针 | 简单 | 丢失服务端数据，VPS 到期后无法证实恢复 | 不选 |
| 把生产数据库/机密打进 Git release | 看似单包 | 泄露、体积与恢复一致性风险 | 不选 |
| 静态包独立校验；数据按权威存储分类离机备份与隔离恢复 | 沿用现有发布架构，可逐项验收 | 需主机权限、备份空间与真实演练 | 采用 |

## 决定与边界

静态归档增加整包 SHA-256 sidecar，保留包内逐文件 manifest；指定版本回滚先校验当前与目标，再原子切换本 release root 的 symlink。旧 PostgreSQL 与上传对象、未来 Gateway SQLite 与私有资产、浏览器 origin 数据各有单独备份/恢复门禁。Desktop 本地数据不依赖 VPS。凭据/证书仅在授权运维渠道保管，绝不随包或 Git 分发。

## 迁移与恢复

旧站与新站保持独立根及 vhost；先离机备份并在隔离环境恢复，后做 staging，最后经外网验收切换域名。静态回滚不回滚 DB/schema；如数据迁移不兼容，必须先有可恢复的快照与明确回切策略。旧机到期或故障时，用 Git SHA 和离机静态包/数据包在新机恢复，实测恢复耗时后才可对外承诺。命令与缺口见[操作单](../../../deploy/MIGRATION.md)。

## 验证与接受

本地 tar hash 单测通过；Linux 回滚 symlink 测试、当前 PR 与主线 CI、独立 reviewer 尚待执行。当前 VPS 真实数据与新机演练缺少权限，T10-PREP 仅 PARTIAL，T10 BLOCKED。本 ADR 的技术决定获用户搬迁准备授权；PROPOSED 不代表已上线。
