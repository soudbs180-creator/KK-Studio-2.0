# Spec：静态发布与 VPS 搬迁准备

- Task ID：T10-PREP
- 状态：READY
- 基线：`origin/main@7bc7c67`；[现行部署说明](../../../deploy/README.md)、[T10 路线](../2026-09-16-launch-readiness-audit/plan.md)、[ADR-007](../../architecture/adr/ADR-007-vps-portability.md)

## 契约

`packageRelease` 继续输出现有 tar.gz 与文件 manifest，另写 `<archive>.sha256`，内容是 tar.gz 的 SHA-256 与 archive basename，可在搬离旧机后校验整包。既有包结构及 deploy dry-run 默认不变；不将源码、机密或用户数据入包。

`remote-rollback.sh <absolute-root> <expected-current-id> <target-id>` 只处理该静态 root：拒绝非绝对 root、`.`/`..` 或含非法字符的版本、当前 symlink 与预期不符、目标不是 release 实目录、关键文件 symlink/缺失、manifest hash 不通过，以及 `previous` 是真实文件/目录的情形。全部预检成功后，以临时 symlink + `mv -T` 原子切换 `current`，将原版本记入 `previous`。不删除版本、不修改数据库/对象/DNS/TLS。

## 数据与恢复边界

| 资产 | 权威位置 | 搬迁方式 | 当前状态 |
| --- | --- | --- | --- |
| 源码 | GitHub main 与可选离机 mirror | 指定已验收 SHA 重建 | 已同步 GitHub；合并后主线 CI 正在修复 |
| Web 静态包 | tar.gz、manifest、整包 hash | 离机副本上传新机并核验 | 本地工具可测；真实上传未验 |
| 旧服务 PostgreSQL/上传对象 | 旧 VPS | 一致快照、离机保存、隔离恢复 | 未取得本轮主机登录 |
| 可选 Gateway SQLite/资产 | 独立服务数据目录 | 在线一致备份与对象同步，隔离验收 | 当前未在 VPS 发布 |
| Web 项目/素材 | 浏览器 IndexedDB，按 origin 隔离 | 旧 origin 显式项目包导出/导入 | T9 未完成，不能承诺无损切换 |

## 错误与安全

CLI 失败须非零退出并保留当前有效链接；整包 hash 与包内逐文件 hash 是两道检查，仍不证明业务数据可恢复。脚本只运行在独立 next 发布根，旧站和外部数据不触碰。凭据、证书、备份原件不得入 Git 或静态包。真实 VPS、DNS、TLS、资源限制、权限和备份恢复属于后续外部验收。

## 验收映射

| Intent AC | 检查 |
| --- | --- |
| AC-1 | `tests/deploy/release-scripts.test.mjs` 与本地包 hash 回读 |
| AC-2 | Linux `tests/deploy/remote-rollback.test.mjs` 的成功、stale、损坏及路径越界 |
| AC-3 | `deploy/MIGRATION.md` 的逐类数据、离机与隔离恢复步骤审核 |
| AC-4 | GitHub API/SSH 只读结果与账本、项目状态同步 |
