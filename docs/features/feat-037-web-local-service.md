# Web 本机伴随服务（FEAT-037）

- 状态：PARTIAL
- 领域：platform
- 最近更新：2026-09-29
- 关联任务：TASK-LOCAL-SERVICE-001

## 用户可见入口

- 目标：用户安装本机伴随服务后，在网页登录并使用设备本地项目与素材；服务不可用时明确提示与恢复，不把浏览器缓存伪装为已保存。
- 当前：设置 → 储存提供 loopback 服务地址、一次性配对、连接检查、断开、旧 IndexedDB 预检/导入和备份/恢复；连接成功后项目快照与素材优先走本机服务。

## 代码位置

- 本机服务：`src/features/local-service/{main,server,session,store,protocol,manifest}.ts`。
- Web 适配器：`src/features/local-service/{client,connection,migration}.ts`、`src/features/creation/storage.ts`、`src/features/creation/assetRepository.ts`。
- 设置入口：`src/components/settings/CompanionSettings.tsx`、`CompanionMigrationActions.tsx`。
- 旧浏览器存储契约：`src/runtime/storage-contract.ts`、`src/features/creation/useCreationStorage.ts`。

## 测试与证据

- 规范：[数据存储约定](../architecture/DATA-STORAGE.md)及[ADR-008](../architecture/adr/ADR-008-platform-versions-and-local-first.md)。
- 单元与协议/文件存储：`tests/unit/localService*.test.ts`、`tests/unit/assetStorage.test.ts`。
- 真实 loopback 服务迁移验收：`tests/browser/local-service-migration.spec.ts`。
- 连接、备份、断线与 390px 验收：`tests/browser/local-service-connection.spec.ts`。
- 生产 smoke（Web bundle 边界、全新浏览器上下文、服务重启）：`tests/local-service/production-smoke.mjs`。

## 当前能力

- 服务只监听 `127.0.0.1`，默认端口 `4319`；配对码只使用一次，会话写入 HttpOnly cookie。
- 显式启用服务后，创作快照和素材服务优先；服务离线/认证失败/版本冲突会返回明确状态，不静默回退并声称已保存。
- 旧 IndexedDB 只读预检后由用户确认导入；服务端按快照 revision、引用完整性、素材 MIME/大小/完整 SHA-256 和 manifest 校验后发布，旧库不删除。
- 服务备份包含快照、记录与原件，清单和文件 SHA-256 校验后可恢复；未连接服务时仍保留原 IndexedDB 路径。

## 差距与后端化

- 尚未交付安装器、自动更新、卸载保留策略和跨平台打包；当前通过 `npm run local-service` 启动 Node 24 服务，生产 smoke 使用临时数据根目录。
- 导入中断时已发布快照不会改变，旧 IndexedDB 保留；已经上传但未发布的素材可能成为服务目录中的未引用原件，后续需垃圾回收任务处理。
- Web 登录与账号绑定由 `BACKEND-PLATFORM` 另行实现；当前本机服务连接不是账号登录证明，账号服务不作为个人原件的默认云存储。
- Mobile 只按 Web 核心契约对齐，原生入口、裁剪能力和真机持久化由 `T12` 验收。
