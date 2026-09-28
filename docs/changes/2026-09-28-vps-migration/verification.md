# Verification：VPS 搬迁准备

- Task ID：T10-PREP
- 记录状态：第四轮完整本地 verify PASS；源码 head 独立复审与 Linux CI PASS，最终 Hosted verify 待核实
- 时间：2026-09-28（Asia/Shanghai）
- branch / cwd：`codex/T10-PREP-vps-migration` / `D:/kk-studio/.worktrees/canvas-compare`
- 初始 base：`origin/main@7bc7c67`；已合入 `origin/main@065bcbf`，最终 head 以 PR 回读为准。

## 当前实证

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| GitHub PR #21 与 main tree | PASS | PR head `bcda41a` 已 squash 合入 `main@7bc7c67`，树同为 `da094854`；合并后 CI 失败由 TASK-COMPARE-002 处理 |
| `ssh -o BatchMode=yes -o StrictHostKeyChecking=yes ...` 历史地址 | 认证失败 | 主机可达，当前机器只有 known_hosts、无可用登录 key；不能回读 VPS 文件或版本 |
| 历史地址 HTTP HEAD | 301 | 只说明地址回应，不说明站点版本、归属或 2.0 已上传 |
| `npm test` | 最新 main 后 471 项，466 通过、0 失败、5 跳过 | Windows 无创建 symlink 权限，5 项真实文件系统测试交给 Hosted Linux |
| `node --test tests/deploy/*.test.mjs` | 修复候选 12 项，7 通过、0 失败、5 跳过 | Windows 只能运行打包侧；5 项回滚/锁测试须 Hosted Linux 证明 |
| `b597dc7` / `b7702fe` Hosted `deploy-linux` | 初次 [PASS](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/36371936477)；修复候选 `b7702fe` PASS | 最终 root 别名补丁及 main merge 的 head 仍需 Linux CI |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | PASS | 治理 71/0、功能 33/0、Markdown 87/0；Prettier 所有受管文件通过 |
| `sh -n deploy/remote-rollback.sh` / `sh -n deploy/remote-activate.sh` / `git diff --check` | PASS | Git Bash shell 语法与 patch 检查，不是 Linux 运行证明 |
| `npm run verify` | PASS，退出码 0 | 471 Node：466 通过/5 Windows 跳过；302/302 Edge 浏览器；UI/format/typecheck/build、治理 72/0、功能 33/0、Markdown 87/0 |
| 本地真实 tar 与 `deploy --archive` dry-run | PASS，退出码 0 | 137 个静态文件；同一 `main-065bcbf-migration-drill` 包与 sidecar 被本机验 hash，打印的远端命令含侧车上传及远端 `sha256sum -c`；未连接 VPS |
| 第二轮路径/目录修复定向测试 | Windows 9 通过、7 Linux 文件系统用例跳过 | `/tmp/..` 与 `/` 的上传前拒绝已在本地证明；实体目录/符号链接场景须由新 head Linux CI 证明 |
| 第二轮 `npm run verify` | PASS，退出码 0 | 302/302 Edge 浏览器；Node 定向增量已入全量测试，7 项 Linux 文件系统用例在 Windows 跳过；lint/typecheck/format/build 全通过 |
| 第三轮并发部署定向测试 | Windows 10 通过、8 Linux 文件系统用例跳过 | 同 ID 不同字节归档的独立 staging/hash 命令通过；锁内真实文件校验须由新 head Linux CI 证明 |
| 第三轮 `npm run verify` | PASS，退出码 0 | 302/302 Edge 浏览器；Node 全部执行完毕，8 项 Linux 文件系统用例在 Windows 跳过；lint/typecheck/format/build 全通过 |
| 第四轮本地并发打包定向测试 | Windows 11 通过、8 Linux 文件系统用例跳过 | 同 ID 双 dist 先复现 `ENOENT`，隔离输出后各自 tar/hash 一致；成功清理命令范围由 JS 测试检查，真实 Linux 行为待 Hosted 验证 |
| 第四轮 `npm run verify` | PASS，退出码 0 | 302/302 Edge 浏览器；Node 全部执行完毕，8 项 Linux 文件系统用例在 Windows 跳过；lint/typecheck/format/build 全通过 |
| `9437cbf` 独立复审与 Hosted Linux | PASS | 独立只读 reviewer 未发现剩余 P0–P3；Linux 部署测试通过。完整 Hosted `verify` 和本次补记后的最终 head 仍须回读 |

## 验收覆盖

- 整包 hash 已由真实生成的 tar.gz 字节和测试对照；尚未离机复制或上传。
- 回滚脚本仅能在 Linux 真正 symlink 文件系统测试；已在 `quality.yml` 增加独立 `deploy-linux` job。Windows 本地 `sh -n` 只能检查语法，不是运行验收。
- Runbook 逐类列出 Git、旧 PostgreSQL/对象、未来 Gateway SQLite/资产和浏览器 IndexedDB；真实旧机一致快照、隔离恢复、DNS/TLS 和正式耗时均未发生。
- 已登录的 RackNerd 控制页在用户浏览器中打开，但浏览器控制接口连续返回连接超时；没有取得页面内容或当前服务器版本。用户确认未来 Web 项目数据由本机伴随服务保存；现有 Web 仍用 IndexedDB，目标迁移未实现。

## 结论

可审阅的迁移准备正在完成；T10-PREP 保持 PARTIAL，T10 保持 BLOCKED。不能声称 VPS 已上传 Git 或具备可保证时长的恢复能力。用户提供当前 SSH 主机/用户、部署根与域名后，可继续只读核验并安排外部演练。
