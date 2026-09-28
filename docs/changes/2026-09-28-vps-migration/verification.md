# Verification：VPS 搬迁准备

- Task ID：T10-PREP
- 记录状态：IN PROGRESS
- 时间：2026-09-28（Asia/Shanghai）
- branch / cwd：`codex/T10-PREP-vps-migration` / `D:/kk-studio/.worktrees/canvas-compare`
- base：`origin/main@7bc7c67`；最终 head 以 PR 回读为准。

## 当前实证

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| GitHub PR #21 与 main tree | PASS | PR head `bcda41a` 已 squash 合入 `main@7bc7c67`，树同为 `da094854`；合并后 CI 失败由 TASK-COMPARE-002 处理 |
| `ssh -o BatchMode=yes -o StrictHostKeyChecking=yes ...` 历史地址 | 认证失败 | 主机可达，当前机器只有 known_hosts、无可用登录 key；不能回读 VPS 文件或版本 |
| 历史地址 HTTP HEAD | 301 | 只说明地址回应，不说明站点版本、归属或 2.0 已上传 |
| `npm test` | 初次 `b597dc7`：466 项，463 通过、0 失败、3 跳过 | 修复候选增加恢复包/竞态/失败测试；Windows 无创建 symlink 权限，新 head 的完整结果待重跑 |
| `node --test tests/deploy/*.test.mjs` | 修复候选 12 项，7 通过、0 失败、5 跳过 | Windows 只能运行打包侧；5 项回滚/锁测试须 Hosted Linux 证明 |
| `b597dc7` Hosted `deploy-linux` | [PASS](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/36371936477) | 独立预审发现四项覆盖与行为问题，不能当成修复候选的通过 |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | PASS | 治理 71/0、功能 33/0、Markdown 87/0；Prettier 所有受管文件通过 |
| `sh -n deploy/remote-rollback.sh` / `sh -n deploy/remote-activate.sh` / `git diff --check` | PASS | Git Bash shell 语法与 patch 检查，不是 Linux 运行证明 |
| `npm run verify` | 待运行 | 需与最新主线合并后重跑 |

## 验收覆盖

- 整包 hash 已由真实生成的 tar.gz 字节和测试对照；尚未离机复制或上传。
- 回滚脚本仅能在 Linux 真正 symlink 文件系统测试；已在 `quality.yml` 增加独立 `deploy-linux` job。Windows 本地 `sh -n` 只能检查语法，不是运行验收。
- Runbook 逐类列出 Git、旧 PostgreSQL/对象、未来 Gateway SQLite/资产和浏览器 IndexedDB；真实旧机一致快照、隔离恢复、DNS/TLS 和正式耗时均未发生。
- 已登录的 RackNerd 控制页在用户浏览器中打开，但浏览器控制接口连续返回连接超时；没有取得页面内容或当前服务器版本。用户确认未来 Web 项目数据由本机伴随服务保存；现有 Web 仍用 IndexedDB，目标迁移未实现。

## 结论

可审阅的迁移准备正在完成；T10-PREP 保持 PARTIAL，T10 保持 BLOCKED。不能声称 VPS 已上传 Git 或具备可保证时长的恢复能力。用户提供当前 SSH 主机/用户、部署根与域名后，可继续只读核验并安排外部演练。
