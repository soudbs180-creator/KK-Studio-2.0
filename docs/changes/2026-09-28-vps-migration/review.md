# Review：VPS 搬迁准备

- Task ID：T10-PREP
- Base：`origin/main@7bc7c67`
- Branch：`codex/T10-PREP-vps-migration`
- 状态：精确 head `abe1e99` 独立复审与 Hosted 门禁 PASS；PR #23 已合入 `main@45fdc14`

## Self-review

现有静态包结构与 deploy 默认 dry-run 没有改变；新增 sidecar 只校验 tar 字节。回滚脚本仅作用于显式 next root，先检查预期 current、目标真实目录和逐文件 hash，再切换 symlink；不触碰旧站、数据库、上传对象或 DNS。runbook 区分“可重建源码/静态包”和“离机业务数据”，并保留 VPS 实际状态 UNKNOWN。

## 独立预审（base `7bc7c67`，head `b597dc7`）

独立只读 reviewer 给出 CHANGES REQUIRED：R1/P1 回滚先切 `current` 再更新 `previous`，后续失败会留下已切换的 current；R2/P1 操作单校验离机 tar 后 `deploy` 却重新打包本地 `dist`；R3/P1 激活与回滚没有共享锁，预期版本检查存在竞态；R4/P2 stale-current 用例实际先触发 expected=target 的 guard。四项均阻断本次工具合并，不把初次 Linux CI 的成功当成问题关闭。

作者修复候选把 current 切换放到末步、两个脚本共用 `.release.lock`、给 `deploy --archive` 增加本地和远端整包验证，并改为真正触发 stale-current 的断言及故障注入/并发测试。修复候选尚需 Hosted Linux 运行和新 head 独立复审；未提前标 PASS。

## 第二轮独立复审（base `065bcbf`，head `5b2b872`）

复审确认 R1–R4 的代码修复存在，又发现三处新边界：P1 激活时 `previous` 若为普通文件会被覆盖、若为实体目录会导致 `current` 切换后无法回滚；P1 `releases` 父目录若为符号链接会使激活/回滚落到发布根之外；P2 CLI 接受 `/tmp/..` 这类根别名，先向 `/incoming` 上传，再由激活脚本拒绝。结论 CHANGES REQUIRED，不能使用该 head 合并。

本轮追加文件/目录拒绝、`releases` 符号链接拒绝和 CLI 上传前路径校验的失败先行测试，并在脚本锁内预检查及原子更新 `previous`、远端 staging 命令检查实体目录。最终结果以新 head Linux CI 和独立复审为准。

## 第三轮独立复审（base `065bcbf`，head `4612fc0`）

复审确认上轮三项已关闭，又发现 P1：同 release ID 的并发 `deploy --archive --apply` 原先共用 staging 文件名；A 可能校验并激活 B 后仍报告 A 成功。该 head 结论 CHANGES REQUIRED。当前修复候选每次部署建立随机私有 staging 目录，命令绑定本地预检 hash，激活脚本在共享发布锁内复验整包字节；测试使用同 ID 但不同 tar 字节，覆盖目录分离与 hash 绑定，并补 Linux 激活正确/错误 hash 的文件系统测试。新 head 仍须独立复审和 Hosted Linux 运行。

## 第四轮独立复审（base `065bcbf`，head `67c5ace`）

复审确认远端不同包串包已关闭，又指出 P1：`deploy --dist` 在同一 checkout 中并发处理同 release 时共用本地 `.tmp/deploy` 输出，能互相删除/覆盖；P2：唯一远端 staging 无清理策略，可能耗尽小型 VPS 磁盘。失败先行的双 `dist` 并发测试实际复现 `ENOENT`，现已将每次本地打包输出隔离；成功激活后只清本次远端 tar、sidecar、脚本和空目录，失败留存且在操作单规定核对后清理。新 head 仍须独立复审和 Hosted Linux 运行。

第四轮修复的精确源码 head `9437cbf` 已由独立只读 reviewer 给出 PASS，无剩余 P0–P3；最终提交 `abe1e99` 的 PR delivery、deploy-linux、verify 与主线合并后 CI 均 PASS。VPS 实机状态与离机备份依旧 UNKNOWN。

## 当前门禁

| 门禁 | 状态 |
| --- | --- |
| 本地定向与完整检查 | 第四轮完整 `verify` PASS：302/302 浏览器；8 项 Linux 文件系统用例在 Windows 跳过 |
| Linux 文件系统回滚测试 | `abe1e99` 的 deploy-linux PASS |
| 独立 AI review | `9437cbf`/`abe1e99` PASS，无剩余 P0–P3 |
| GitHub PR/current CI | PR #23 delivery/deploy-linux/verify PASS；main@45fdc14 postmerge deploy-linux/verify PASS |
| VPS 恢复演练 | NOT VERIFIED，缺主机信息和离机备份 |
| 用户生产发布授权 | 没有实际发布动作 |

独立审查与托管 CI 已完成并记录；本次只交付准备产物，未执行 VPS 生产写入或恢复演练。
