# Spec：主线合并后迁移操作单收口

- Task ID：TASK-POSTMERGE-MIGRATION-2026-09-28
- 状态：REVIEW；文档 PR 门禁待完成
- 基线：`origin/main@096d6c342c3a5001067bcd75bc8e122f2e8f513d`

当前远端 `main@096d6c3` 的 tree 为 `05456be91ea00cee22fe7f9e3924694a13d7774f`。PR #23/#24/#25 的交付门禁、PR #25 合并后 `verify`/`deploy-linux` 均已成功。该事实只证明仓库和 CI 状态，不证明任何 VPS 已上传。

迁移操作单改正旧的主线 SHA/失败 CI 表述，并保留以下未验收边界：当前 VPS Git SHA、部署目录、运行版本、SSH 权限、离机 PostgreSQL/对象/Gateway 备份、恢复演练、域名/DNS/TLS 和真实服务均未知。Web 仍使用 IndexedDB，本机伴随服务和登录接线仍未实现。
