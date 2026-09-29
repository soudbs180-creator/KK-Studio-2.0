# Web 本机伴随服务设计

## 目标

让用户安装在自己设备上的本机服务成为 Web 项目快照和素材的耐久持久源。Web 仍需登录才能使用产品能力，但项目原件保留在用户设备上；服务未连接、认证失效、版本冲突或导入失败时必须显示可理解的状态，并保留旧浏览器数据作为恢复副本。当前 IndexedDB 数据不能被静默删除或覆盖。

本轮实现的是第一版本地持久层和迁移闭环。真实账号登录仍由 `BACKEND-PLATFORM` 负责，Mobile 仍由 `T12` 负责；本机服务不会把设备配对当作云端账号认证，也不会宣称 VPS 或云端同步已经完成。

## 成功标准

1. 服务只监听 `127.0.0.1`，通过来源白名单、一次性配对码和 HttpOnly 会话 cookie 保护访问。
2. 服务可读写版本化创作快照，使用 `expectedRevision` 拒绝旧客户端覆盖；写入采用临时文件、校验、同步和原子替换，并保留上一份有效备份。
3. 服务以内容寻址方式保存素材原件和非敏感元数据，校验 MIME、大小、SHA-256 和 asset ID，不把临时 Provider URL 写入磁盘。
4. Web 存储适配器在用户显式连接服务后优先读写服务；服务不可用时显示离线/未连接状态，不把 IndexedDB 写入伪装成服务已保存。连接前的既有 IndexedDB 仍可读取。
5. 既有 IndexedDB 项目和素材可先只读预检，再由用户确认导入；导入在 staging 目录中校验，任何失败都不会发布半套数据或删除旧数据。
6. 服务可导出带清单和 SHA-256 的备份，也可在独立 staging 中预检并恢复；跨浏览器实例可通过同一配对服务读取同一快照。
7. 本地协议、服务、Web 适配器、迁移和失败状态都有自动化测试；文档明确记录真实账号登录、安装包分发和 Mobile 尚未包含在本轮。

## 范围与非目标

### 本轮范围

- 一个无额外运行时依赖的 Node 24 本机服务入口，沿用仓库已有 `node:http`、`node:fs`、`node:crypto` 和 `node:sqlite` 能力。
- 纯协议模块，供浏览器客户端和 Node 服务共同校验请求、响应、状态码及错误码。
- 本机服务数据根目录：`app/companion.json`、`projects/creation-v2.json`、`assets/records`、`assets/blobs`、`backups`、`logs`。
- Web 连接状态和配对入口；连接元数据可存浏览器，配对令牌只进入 HttpOnly cookie 和当前会话内存。
- 创作快照与素材适配器、IndexedDB 只读预检和用户触发导入、备份/恢复接口。
- 单机回归测试和文档/账本更新。

### 非目标

- 不实现云端账户、OAuth、密码找回、跨设备云同步或真实 Provider 认证。
- 不把服务公开绑定到局域网、公共网卡或 VPS；远端部署仍走现有 generation gateway 和迁移操作单。
- 不删除旧 IndexedDB 数据，不自动在首次启动时搬迁，不把浏览器 `localStorage` 作为项目原件存储。
- 不实现 Mobile 原生包、安装器签名、自动更新或后台守护进程注册；服务先以可执行 Node 入口和安装说明交付。

## 架构

### 服务进程

`src/features/local-service/main.ts` 启动本机 HTTP 服务，默认端口 `4319`，只绑定 `127.0.0.1`。启动时创建数据根目录并生成首次配对码；配对码只允许使用一次，服务只持久化它的 SHA-256。配置文件只含端口、允许的 Web origin、数据根目录和设备标识，不含 API Key、Provider token 或会话明文。

`src/features/local-service/server.ts` 负责 CORS、会话、路由和统一错误响应。除 `/health` 和一次性 `/v1/pair` 外，接口必须带服务会话 cookie。来源白名单缺失、`Origin` 不匹配、方法/查询参数不符合协议、请求体超限均拒绝；响应统一设置 `Cache-Control: no-store`、`X-Content-Type-Options: nosniff`。

`src/features/local-service/store.ts` 负责磁盘写入。快照和 manifest 使用 canonical JSON；写入时在同一服务锁内重新读取当前 revision，先写 `.tmp`、flush、回读校验，再替换主文件并将旧有效文件轮换为 `.bak`。素材原件按完整 SHA-256 放在 `assets/blobs/<sha256>`，记录放在 `assets/records/<assetId>.json`；同一 hash 重复导入只合并非敏感 provenance，不覆盖原件。

### 协议

`src/features/local-service/protocol.ts` 提供纯 Zod schema、路径/ID 校验和错误码：

| 路由 | 方法 | 身份 | 行为 |
| --- | --- | --- | --- |
| `/health` | GET | 无 | 返回协议版本、服务版本、数据目录状态 |
| `/v1/pair` | POST | 一次性配对码 | 建立设备会话并设置 HttpOnly `kk_companion_session` cookie |
| `/v1/session` | DELETE | 会话 | 注销当前会话 |
| `/v1/snapshot` | GET | 会话 | 返回快照、revision、保存状态 |
| `/v1/snapshot` | PUT | 会话 | 携带 `expectedRevision` 原子保存；冲突返回 409 和当前 revision |
| `/v1/assets/:assetId` | GET | 会话 | 校验归属后返回原件字节和受限 MIME |
| `/v1/assets/:assetId` | PUT | 会话 | 以 metadata header + 二进制体写入 staging，再校验 hash 后发布 |
| `/v1/migration/preflight` | POST | 会话 | 校验旧快照、素材引用、大小和 hash，返回只读报告与 manifest hash |
| `/v1/migration/import` | POST | 会话 | 只接受匹配预检报告的 staging 批次，全部通过后一次发布 |
| `/v1/backups` | GET | 会话 | 返回有界备份清单和 hash |
| `/v1/backups/export` | POST | 会话 | 生成带 manifest 的离机备份包 |
| `/v1/backups/restore` | POST | 会话 | 预检备份并在 staging 中恢复，失败保留现有数据 |

服务会话只绑定本机设备主体；`ownerId` 作为未来真实登录的绑定字段保留，但本轮不能被解释为账号认证。所有服务错误使用稳定代码（`SERVICE_UNAVAILABLE`、`UNAUTHENTICATED`、`CONFLICT`、`INVALID_SNAPSHOT`、`INVALID_ASSET`、`IMPORT_ROLLBACK` 等），客户端按代码显示恢复动作。

### Web 客户端

新增 `src/features/local-service/client.ts` 和 `connection.ts`：

- 默认不连接服务，保持现有 Web IndexedDB 行为，避免升级时静默搬迁。
- 用户在设置中输入本机服务地址和一次性配对码后，客户端只保存地址、协议版本和设备标识；`fetch` 使用 `credentials: "include"`，不会把会话令牌写进 `localStorage`。
- `connectionState` 至少包含 `unconfigured`、`checking`、`connected`、`offline`、`unauthenticated`、`conflict`、`migration-required`、`error`；设置页显示状态、最后一次错误和重试/断开动作。
- `src/features/creation/storage.ts` 在显式连接且服务报告兼容时调用服务快照接口。服务写入成功才更新 Web 的短恢复副本；服务不可用时保留当前内存和 IndexedDB 数据，不报“已保存”。
- `src/features/creation/assetRepository.ts` 通过同一客户端上传/读取原件。迁移前的 IndexedDB 原件仍可读；迁移成功后服务是项目和素材的最终耐久源。
- 本轮提供 `preflightIndexedData()`、`importIndexedData()` 和 `restoreBackup()` 纯客户端流程，UI 只在预检成功后启用确认按钮；失败时保留旧库并显示报告 ID。

## 数据完整性与恢复

- 快照 schema 继续使用现有 `snapshotCodec`，服务入口先 decode/normalize，再检查 project、asset 引用和 revision；未知版本进入 `UNSUPPORTED_SNAPSHOT`，不能静默降级。
- 服务写入和迁移都采用“staging → 校验 → 发布”。发布顺序保证主快照、记录、blob 全部可读；任一步失败删除 staging 并保留旧主文件。
- 每次成功快照写入保留一份 `.bak`，手动备份包含 `manifest.json`、快照、素材记录和 blob；manifest 为 canonical JSON 并记录每个文件的 SHA-256、字节数、协议版本和创建时间。
- 读取主文件损坏时只尝试 `.bak`，恢复结果标记为 `recovered`；主文件和备份都无效时进入 `corrupt`，不创建空项目覆盖用户数据。
- 迁移导入不修改旧 IndexedDB；成功后客户端保留迁移报告和服务 revision，用户可在设置中显式选择清理旧库（本轮不自动清理）。

## 版本和兼容

- 本机服务协议 `1` 与 Web 平台版本独立；Web 版本从 `2.1.1` 按既有 `version:bump -- --platform web` 规则递增。
- 服务拒绝未知协议版本并返回兼容范围；客户端发现不兼容时保持旧 IndexedDB 只读并提供升级提示。
- 不修改 Desktop 的 Tauri 数据根和 IPC 契约；服务代码必须在浏览器构建中被 tree-shake，不引入 Node 内置模块到 Web bundle。

## 测试与验收

### 单元和服务测试

- 协议 schema：合法/非法 origin、配对码一次性使用、cookie 会话、未知路由和请求体上限。
- Store：revision 冲突、临时文件失败、主文件损坏回退 `.bak`、重复 asset hash、MIME/大小/hash/ID 不一致。
- 迁移：预检发现缺失 asset、manifest hash 不符、导入中断和成功后跨实例读取；每个失败都断言旧数据字节未变。
- Client：服务成功、断线、401、409 和不兼容响应的状态转换；服务成功后才更新恢复副本。

### 运行验收

- 启动真实 Node 服务，两个不同 Web origin 通过同一配对会话读取同一快照。
- 在第一个浏览器生成项目和素材，完成预检/导入；第二个浏览器读取并修改，旧 revision 写入必须得到冲突。
- 重启服务后快照和素材可读；损坏主文件后可从 `.bak` 恢复；损坏导入包不会改变原有项目。
- `npm run verify`、`npm run client:check` 和本地服务专用测试通过；用 `node --inspect` 或 bundle 报告确认 Web 产物不包含 `node:fs`、`node:http`、会话明文或配对码。

## 发布与回滚

第一版以独立服务入口、设置页连接开关和迁移说明交付。默认开关关闭，旧用户升级不改变存储行为；服务和 Web 适配器可通过连接设置断开，客户端回到只读 IndexedDB 恢复路径。若发现服务写入问题，回滚 Web 适配器版本即可，服务目录和备份保留，不执行破坏性清理。

真实账号接线、服务安装器/自动更新、局域网访问和 Mobile 持久层分别在 `BACKEND-PLATFORM`、后续发布任务和 `T12` 中验收；本任务完成前账本不得标记为 DONE。
