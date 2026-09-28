# VPS 搬迁与恢复操作单（T10-PREP）

本操作单用于旧 VPS 到期前搬迁、旧主机故障后的重建，以及静态 Web 版本回滚。它是可审阅准备材料，**尚未在现有或新 VPS 上演练**。本仓库当前的 `deploy/release.mjs` 只发布 Web 静态 Prototype；T9 Web 本地能力、真实 Gateway/Provider、域名与生产验收分别由账本任务管理。

## 2026-09-28 已核对的事实

| 对象 | 证据与状态 |
| --- | --- |
| GitHub 源码 | 当前远端为 `origin/main@096d6c3`，tree `05456be9`；PR #23/#24/#25 的交付门禁与合并后主线 `verify`/`deploy-linux` 均已成功。根 checkout 仍有未提交改动，不能把它当远端内容。 |
| 旧 VPS | [2026-09-16 只读审计](../docs/changes/2026-09-16-launch-readiness-audit/verification.md) 当时发现旧 1.4.5、PostgreSQL、API 和 Web/Admin；不是当前状态或 2.0 上传证明。本轮历史地址 HTTP 有响应，SSH 使用本机已知凭据被拒。 |
| 新 2.0 Web | 仓库有静态打包、hash 清单、SSH dry-run、不可变版本目录与 `current`/`previous` 指针；没有本轮 VPS 上传或线上同态验收。 |
| 服务端与浏览器数据 | Git 不含 PostgreSQL、Gateway SQLite/对象文件、机密、证书或用户浏览器 IndexedDB。没有离机备份与还原实证。 |

**搬迁可行性**：有 Git 源码和可复建的静态包，但能否快速恢复真实服务，取决于下方离机数据备份、目标主机权限、域名控制与一次恢复演练。当前不能承诺具体恢复时长。

## 到期前必须记录并保存在离机安全位置

| 项目 | 填写/验证要求 |
| --- | --- |
| 主机与访问 | 旧/新 SSH 地址、端口、部署用户、登录方式、主机指纹；只传给授权运维，不进 Git。 |
| 入口 | 生产与 staging 域名、DNS 管理方、现行 A/AAAA/TTL、TLS 签发或迁移方式。控制面板地址不是产品域名。 |
| 服务清单 | `systemd`/容器服务名、Nginx vhost、监听端口、持久目录、Linux 所有者、资源/磁盘水位、运行版本与静态 root。先只读盘点，不猜现有路径。 |
| 数据 | 旧 PostgreSQL 数据库名与角色、对象/上传文件目录、可能部署的 Gateway SQLite 与对象目录、备份保留期、加密离机存放处及校验值。服务机密和证书另存受控保险库。 |
| 版本 | Git commit SHA、应用版本、静态 tar.gz 与整个 tar 的 SHA-256、上一可用 release ID。 |
| 验收 | 外网 HTTPS、鉴权/API/资产、真实任务恢复、备份还原、资源负载和回滚的负责人及记录。 |

旧站与 next 站使用不同发布根和 vhost；不要覆盖 `/opt/kk-studio/current` 或沿用旧 API 作为 2.0 已验收后端。目标部署用户只写自己的 release/incoming 目录；Nginx 对静态 root 只读。内部 DB/API 不应向公网开放，端口与资源限制在实际服务器盘点后配置并外网复测。

## 1. 在旧机仍可访问时形成离机恢复包

1. 在干净的 `origin/main` 检出使用 Node 24 执行 `npm ci`、`npm run verify`、`npm run build`，记录通过的 SHA。构建必须与打包版本一致；当前已核对的基线是 `main@096d6c3`，若重新构建其他 SHA，必须重新记录对应门禁结果。
2. 执行 `node deploy/release.mjs package --dist dist --release <已验收SHA或版本>`。保留 `.tmp/deploy/kk-studio-web-<release>.tar.gz`、同名 `.tar.gz.sha256` 和 manifest sidecars。复制到**不在旧 VPS 上**的受控备份位置；在 Linux 目标目录用 `sha256sum -c kk-studio-web-<release>.tar.gz.sha256` 校验整包。源码可另作 GitHub mirror 备份；Git 仓库并不替代业务数据备份。
3. 对历史 PostgreSQL，由有权的本机数据库角色在受限目录执行 `pg_dump -Fc -f <离机中转目录>/legacy.dump <数据库名>`；检查命令退出码、文件 hash 和 `pg_restore --list`，随后**恢复到全新隔离测试库**并验证表/资产关联。不得把密码写进命令、日志或 Git；不在现有生产库上运行 `pg_restore --clean`。操作细节按实际角色/版本核实。[PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
4. 与数据库一致地备份旧上传/对象文件、服务配置清单、Nginx vhost、证书续期配置和非明文的 secret 引用。文件与 DB 快照必须来自同一受控写入窗口或有应用一致性证明；记录大小、数量、SHA-256、权限与离机副本。`pg_dump` 单独不能覆盖上传文件。
5. 若未来 Gateway 真正在 VPS 运行，SQLite WAL 数据库应使用 SQLite 在线备份 API 或 `VACUUM INTO` 取得一致数据库快照，并在受控写入窗口备份私有对象目录；恢复到隔离目录后运行完整性和资产引用检查。直接复制正在写入的单个 `.db` 文件不构成一致备份。[SQLite 在线备份](https://www.sqlite.org/backup.html)
6. **现有实现**的 Web 项目和素材仍属于浏览器当前 origin 的 IndexedDB；用户的新目标是登录后的网页连接本机伴随服务保存个人数据，该能力尚未实现。更换 origin 或切换到伴随服务都不会自动搬走现有数据；须在旧 origin 可用时通过经 T9 验收的项目包导出/导入并逐个回读。T9 尚未完成，所以旧 Web 切换不能提前宣称无损。

离机备份应有访问控制和加密，至少一份不依赖旧 VPS 的副本；仅 hash 或存在文件不等于还原成功。记录实际完成时间、容量和恢复耗时，不预设 RTO。

## 2. 新 VPS staging 恢复与发布

1. 核对 SSH 主机指纹和授权用户，建立单独 next 发布根；检查磁盘/内存/端口、Nginx/证书管理、日志轮转与访问权限。旧机保持服务可用。不要在新机暴露 PostgreSQL/Gateway 内部端口；以外网探测核实。
2. 从离机位置取回**同一个**静态 tar.gz 及同名 `.tar.gz.sha256`，用 `node deploy/release.mjs deploy --archive <离机恢复的tar.gz绝对路径> --release <包对应版本> --host <已核实主机> --user <部署用户> --path <next发布根>` 做 dry-run。该模式先在本机核对整包 hash，每次部署用独立私有 staging 目录上传同一份 tar 与 sidecar；远端先执行 `sha256sum -c`，激活脚本在发布锁内再对照本机预检 SHA-256 并按包内 manifest 核验每个静态文件。检查打印出的目标和命令后，仅在授权的 staging 目标追加 `--apply`。不得在这一步改用 `--dist` 重新打包并声称已恢复离机包。
   同一 release 的 `deploy --dist` 并发运行会各用独立本地打包目录；这些本地包须按离机备份策略保存或核对后清理。成功激活后命令只删除本次远端 staging 内的 tar、sidecar、脚本和空目录；失败 staging 留给诊断。确认该次部署进程已退出、记录原因和所需证据后，只清理打印出的该次唯一 staging 路径中的上述三个文件及空目录；不得清理 `releases/`、业务数据或离机备份。若成功但清理失败，命令给出警告，另行核对该唯一路径。
3. 给 staging 独立 vhost 指向 `<next发布根>/current`，SPA 入口按 Nginx `try_files` 规则回落到 `/index.html`；先执行 `nginx -t`，再按实际环境加载。不要把旧站 vhost/后台或未受控的旧 API 代理到新入口。[Nginx try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
4. 将数据库/对象恢复到**新的隔离目录或数据库**，用受控 secret 注入新服务，逐项检查进程身份、权限、内部端口、健康、鉴权、真实项目/任务/资产、重启恢复、日志与资源限制。静态 `deploy/health-check.mjs` 只证明 HTML，不能代替这些检查。
5. 做一次同版本及上一版本回滚演练，记录命令、耗时、hash 和新旧端可访问性。若 schema 不兼容，先恢复隔离数据副本并验证迁移/回退策略；静态指针回滚不会回滚数据库。

## 3. 切换与紧急回滚

切换前固定 Git SHA、release ID、数据库/对象快照和 DNS 旧值；核实新机 staging 的 HTTPS、端口、鉴权、数据与任务恢复。若域名保持相同 HTTPS origin，浏览器本地数据仍依附该 origin；若换域名，先完成用户显式导出/导入。切换 A/AAAA 后从外网复测证书、页面、API 和真实工作流，保留旧机与备份直到回滚窗口结束。DNS 回退只改变入口，不还原已写入的数据。

静态版本回滚在目标 Linux 主机执行。先将已审查脚本上传到**该 next 发布根的 incoming 目录**（部署用户须有该目录写权限），三个参数均须来自审查过的发布清单：

```sh
scp deploy/remote-rollback.sh deploy@staging.example.invalid:/srv/kk-studio-next/incoming/remote-rollback.sh
ssh deploy@staging.example.invalid \
  'sh /srv/kk-studio-next/incoming/remote-rollback.sh /srv/kk-studio-next current-id previous-id'
```

将示例域名及 `current-id`、`previous-id` 替换为本次发布清单中的真实值，先在 staging 演练。若 `previous` 是目录而不是 symlink、目标包受损或当前版本不符，脚本拒绝切换；不要为通过检查而手工删除现有目录。

激活与回滚共用发布根的 `.release.lock`，串行完成预期版本检查与指针切换；回滚仅接受当前 `current` 指针确实为预期版本、目标位于本根的实际目录且 SHA 清单通过时切换。它不删除版本或数据，也不更改 DNS。若旧机已到期，新机从离机包和 Git SHA 重建，先恢复隔离数据并复测，再切换域名；没有离机业务数据和域名控制时，无法靠 `git pull` 恢复服务。

## 尚未完成的外部验收

- 当前 VPS 的实际内容、已上传 Git SHA、服务/数据库/文件清单和备份状态：缺少当前 SSH 登录与部署目录，未验证。
- 正式/staging 域名、DNS/TLS、生产授权及新 VPS：未提供，T10 保持 BLOCKED。
- 离机 PostgreSQL/对象/Gateway 备份与隔离恢复、真实回滚耗时：未演练，T10-PREP 仍 PARTIAL。
- 旧 Web origin 导出和 Web 本地版能力：T9 未完成；T11 切换仍 BLOCKED。
