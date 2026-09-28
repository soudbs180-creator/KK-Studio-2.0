# Review：VPS 搬迁准备

- Task ID：T10-PREP
- Base：`origin/main@7bc7c67`
- Branch：`codex/T10-PREP-vps-migration`
- 状态：`b597dc7` 独立预审 CHANGES REQUIRED；修复候选待 Linux CI 与最终复审

## Self-review

现有静态包结构与 deploy 默认 dry-run 没有改变；新增 sidecar 只校验 tar 字节。回滚脚本仅作用于显式 next root，先检查预期 current、目标真实目录和逐文件 hash，再切换 symlink；不触碰旧站、数据库、上传对象或 DNS。runbook 区分“可重建源码/静态包”和“离机业务数据”，并保留 VPS 实际状态 UNKNOWN。

## 独立预审（base `7bc7c67`，head `b597dc7`）

独立只读 reviewer 给出 CHANGES REQUIRED：R1/P1 回滚先切 `current` 再更新 `previous`，后续失败会留下已切换的 current；R2/P1 操作单校验离机 tar 后 `deploy` 却重新打包本地 `dist`；R3/P1 激活与回滚没有共享锁，预期版本检查存在竞态；R4/P2 stale-current 用例实际先触发 expected=target 的 guard。四项均阻断本次工具合并，不把初次 Linux CI 的成功当成问题关闭。

作者修复候选把 current 切换放到末步、两个脚本共用 `.release.lock`、给 `deploy --archive` 增加本地和远端整包验证，并改为真正触发 stale-current 的断言及故障注入/并发测试。修复候选尚需 Hosted Linux 运行和新 head 独立复审；未提前标 PASS。

## 当前门禁

| 门禁 | 状态 |
| --- | --- |
| 本地定向与完整检查 | 最新 main 后完整 `verify` PASS：471 Node（466 通过/5 Windows 跳过）、302/302 浏览器 |
| Linux 文件系统回滚测试 | 初次 `b597dc7` 与修复候选 `b7702fe` deploy-linux PASS；最终 head 待新 run |
| 独立 AI review | `b597dc7` CHANGES REQUIRED；新 head 待复审 |
| GitHub PR/current CI | NOT RUN |
| VPS 恢复演练 | NOT VERIFIED，缺主机信息和离机备份 |
| 用户生产发布授权 | 没有实际发布动作 |

独立审查、托管 CI 和外部演练完成后追加真实结果；本次 PR 只交付准备产物。
