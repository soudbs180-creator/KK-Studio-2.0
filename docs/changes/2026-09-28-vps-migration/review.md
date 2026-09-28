# Review：VPS 搬迁准备

- Task ID：T10-PREP
- Base：`origin/main@7bc7c67`
- Branch：`codex/T10-PREP-vps-migration`
- 状态：独立上下文复审待执行

## Self-review

现有静态包结构与 deploy 默认 dry-run 没有改变；新增 sidecar 只校验 tar 字节。回滚脚本仅作用于显式 next root，先检查预期 current、目标真实目录和逐文件 hash，再切换 symlink；不触碰旧站、数据库、上传对象或 DNS。runbook 区分“可重建源码/静态包”和“离机业务数据”，并保留 VPS 实际状态 UNKNOWN。

## 当前门禁

| 门禁 | 状态 |
| --- | --- |
| 本地定向与完整检查 | 定向 package PASS；完整待运行 |
| Linux 文件系统回滚测试 | 待 Hosted CI |
| 独立 AI review | NOT VERIFIED |
| GitHub PR/current CI | NOT RUN |
| VPS 恢复演练 | NOT VERIFIED，缺主机信息和离机备份 |
| 用户生产发布授权 | 没有实际发布动作 |

独立审查、托管 CI 和外部演练完成后追加真实结果；本次 PR 只交付准备产物。
