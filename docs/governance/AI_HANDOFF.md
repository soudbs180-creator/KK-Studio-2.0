# AI handoff

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-14
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是最短恢复入口，不是任务状态或产品能力的第二事实源。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)；历史验证只按带日期的 change package、commit、运行模式和 receipt 回读。

## 本轮恢复入口

TASK-UI-CONSOLIDATE-20261014保留2.1.17冻结与2.1.18中间候选；最新主目录2.1.20一致源f2b0466的凭据恢复、Agent展示和画布同步已逐项承接，当前统一源码Desktop/Web2.1.21正在组合验证，账本133项。CLI随包桥文件与绝对路径命令已修正，仍使用用户已有Node/npm环境。按[验证](../changes/2026-10-14-ui-consolidation/verification.md)与[计划](../changes/2026-10-14-ui-consolidation/plan.md)补实际Desktop、最终提交审查和产物回执；原资料、历史失败与在途源保留。Native Mobile、未接协议、Hosted和用户验收分别开放。

## 2026-10-13 历史恢复快照

- canonical repository：`D:/kk-studio/KK-Studio-2.0`
- branch：`codex/ui-redesign-20261011`
- HEAD：`51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c`（dirty 集成；原暂存区保留）
- local `origin/main`：`694a00607f6f63de1b8c43d0ebb117adf5d34f67`；本轮只回读本地 ref，未 fetch
- worktrees：103 个登记项；当前 git inventory，未删除或移动其他 worktree
- task ledger：126 records; 75 DONE, 32 PARTIAL, 11 TODO, 4 BLOCKED, 4 REVIEW; 51 open records.
- 当前分支为 dirty 开发集成，不是已发布的 `origin/main` 树。TASK-AGENT-RECOVERY-20261013 已取得完整本地、canonical Tauri 和系统凭据证据；Hosted、真实 Provider、签名、安装与用户视觉验收保持各自边界。

## 权威顺序

1. 用户当前意图与已确认范围。
2. `AGENTS.md`、`AI_RULES.md` 和专项规范。
3. `docs/governance/task-ledger.json`：任务状态、负责人、依赖和证据唯一来源。
4. `docs/governance/PROJECT_STATE.md`：当前事实。
5. 本文件：恢复顺序和短入口。
6. `docs/changes/<date>-<task>/`、`docs/evidence/`：历史或范围化证据，不覆盖当前状态。

同一任务或文档更新时沿用稳定的 `taskId`/`docId`，更新 `updated`/`updatedAt`；不通过复制一个新日期文件制造第二条 current。旧入口写 `status: superseded`、`supersededBy: <新入口>`，历史证据保留原 commit 和含义。

## 本轮治理边界

- B1+B2 已在本分支提交并保留原验证记录。
- `R+B3-1+B3-2` 当前改动：文档生命周期门禁、任务快照刷新、本入口瘦身。
- B3-3、B4-1、B4-2、B4-3 未授权，禁止在恢复过程中删除、移动、取消跟踪、合并或清理 worktree/二进制/临时目录。
- 当前变更记录见 [`docs/changes/2026-10-12-governance-currentness/`](../changes/2026-10-12-governance-currentness/)；P1 前序记录见 [`docs/changes/2026-10-12-p1-audit-closeout/`](../changes/2026-10-12-p1-audit-closeout/)。

## 恢复顺序

1. 运行 `git status --short --branch`、`git rev-parse HEAD`、`git rev-parse origin/main` 和 `git worktree list --porcelain`。
2. 读取本文件、`PROJECT_STATE.md`、`task-ledger.json`、相关 change package 的 `intent/spec/plan/verification/review`。
3. 检查 task ID、文档 ID、`updated`/`updatedAt`、`status`、`supersededBy` 和 exact SHA；旧日期只能作为历史线索。
4. 只在当前用户授权范围内继续；发现源冲突时记录 `CONFLICT`，缺证据时记录 `UNKNOWN` 或 `NOT VERIFIED`。
5. 完成修改后重新生成 `TASK_LEDGER.md`，运行适用的治理、文档、格式和测试门禁，并把命令、退出码和当前 SHA 写入 verification。

## 历史恢复锚点

本文件被瘦身前的完整历史内容仍可从 Git 祖先提交 `7f29db98a00a9f0662c9a0dd8909337a988a4baa` 的同一路径读取；不改写或伪造历史验证。后续历史材料以 dated change package 为准。

## 2026-10-13 分类修复恢复入口

TASK-UI-CLASSIFY-20261013：[验证记录](../changes/2026-10-13-capability-ui/verification.md)。canonical 已集成本轮分类与交互修复；基线 51fccfc7，任务隔离分支 fix/TASK-UI-CLASSIFY-20261013-capability。用户补充的模型弹层批量/数据项已移除，相关 40 项定向回归通过。最终 Web development 7 项、preview 7 项、Desktop 2.1.14 14 项实际验收通过，原生 Agent 可用/启动/健康/停止通过；全量浏览器 492/495，余下 3 个既有 UI 失败列在 verification，独立补审通过，任务保持 REVIEW/PARTIAL。预存 WindowControls、mic 与两份测试哈希及空暂存区均保留，未推送或正式发布。

## 2026-10-13 自动恢复交付入口

TASK-AGENT-RECOVERY-20261013：[验证](../changes/2026-10-13-agent-recovery/verification.md) / [独立审查](../changes/2026-10-13-agent-recovery/review.md)。生产源6f8ff257、完整门禁59c013ce，canonical HEAD51fccfc dirty保持原index。官方2.1.16重建及Agent38/38、凭据6/6正常重开通过，桌面快捷方式已重新生成。打开自动恢复原线程，主动断开保持暂停；API秘密在Windows凭据库、输入不回填。本任务 DONE/PASS，最终交付文档独立补审通过；未合并/推送/发布，未知线程仍拒绝接管。

## 日常 APP 实际验收补充（进行中）

用户授权正常关闭/重开默认数据APP并直接修复。2.1.16实际83652→87180恢复同项目/thread，API metadata未变；主动断开后87180正常exit0→75784仍暂停。原当前API ref在关闭前就是missing，不将配置active冒充实钥保留。聊天横幅危险色/按钮未同步已RED，共享2.1.17修复和最终复验在执行中；原2.1.16证据保留。
