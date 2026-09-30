# Spec：主线合并后迁移操作单收口

- Task ID：TASK-POSTMERGE-MIGRATION-2026-09-28
- 状态：PASS；PR #26 与合并后 main 门禁均成功
- 基线：`origin/main@be46ad6287a781d30418636c8e85e0e069797f44`

当前远端 `main@be46ad6` 的 tree 为 `d16329fb625b5d3f603b0605de8815199fa40b37`。PR #23/#24/#25/#26 的交付门禁、PR #26 合并后 `verify`/`deploy-linux` 均已成功。该事实只证明仓库和 CI 状态，不证明任何 VPS 已上传。

迁移操作单改正旧的主线 SHA/失败 CI 表述，并保留以下未验收边界：当前 VPS Git SHA、部署目录、运行版本、SSH 权限、离机 PostgreSQL/对象/Gateway 备份、恢复演练、域名/DNS/TLS 和真实服务均未知。Web 仍使用 IndexedDB，本机伴随服务和登录接线仍未实现。
