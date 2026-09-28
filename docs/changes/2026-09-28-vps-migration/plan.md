# Plan：VPS 搬迁准备

- Task ID：T10-PREP
- 状态：IN PROGRESS
- Owner / branch / worktree：root / `codex/T10-PREP-vps-migration` / `D:/kk-studio/.worktrees/canvas-compare`
- Base：`origin/main@7bc7c67`，后续须吸收图片对比主线 CI 修复。
- 原 checkout：`D:/kk-studio/KK-Studio-2.0` 的未提交改动不触碰。

## 开工依据

已读 `AGENTS.md`、`AI_RULES.md`、工程分支/评审规则、T10 原计划、现有 `deploy/release.mjs` 与 `remote-activate.sh`、Gateway 存储边界。Node 24.21.0；主线等价的 PR #21 head 曾本地完整 `verify` 通过，但合并后主线 run `36369533105` 的 UI 子像素回归由 TASK-COMPARE-002 独立修复，故此分支最终验证须先吸收新主线。

## 顺序

1. 测试先行：整包 hash sidecar 及 Linux symlink 文件系统的成功/拒绝回滚；记录 Windows symlink 权限限制。
2. 在现有静态打包器写整包 hash；增加仅静态 root 的指定版本回滚脚本，不改现行远端激活与业务服务。
3. 编写可复用离机备份、隔离恢复、切换与回切操作单；依据旧 VPS 审计与当前 SSH 结果保留 UNKNOWN。
4. 更新 ledger、PROGRESS、PROJECT_STATE、AI_HANDOFF、ADR；运行定向测试、全量 `verify`、Linux Hosted CI、独立 review。
5. 经 PR 合并后核对 main SHA/tree/push CI。只有取得目标主机与授权后，单独执行 T10 的实机演练。

## 风险与回滚

最危险的错误是把静态回滚当数据库回滚、把旧审计当现状，或让缺少离机数据的 Git 镜像被误称完整备份。脚本限制自身目录与版本并核验 manifest，runbook 明确数据类别和实机门禁。若本工具失败，保持原 `current` 与旧服务，撤回 T10-PREP PR，不在生产试错。
