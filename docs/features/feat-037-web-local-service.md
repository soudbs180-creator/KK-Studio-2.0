# Web 本机伴随服务（FEAT-037）

- 状态：PARTIAL
- 领域：platform
- 最近更新：2026-10-16
- 关联任务：TASK-LOCAL-SERVICE-001、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 用户可见入口

- 目标：用户安装本机伴随服务后，在网页登录并使用设备本地项目与素材；服务不可用时明确提示与恢复，不把浏览器缓存伪装为已保存。
- 当前：设置→网络提供 loopback 服务地址、一次性配对、连接检查、断开、旧 IndexedDB 预检/导入和备份/恢复；连接成功后项目快照与素材优先走旧本机服务。原“储存”深链仍兼容，数据位置与容量单列数据管理。

## 代码位置

- 本机服务：`src/features/local-service/{main,server,session,store,protocol,manifest}.ts`。
- Web 适配器：`src/features/local-service/{client,connection,migration}.ts`、`src/features/creation/storage.ts`、`src/features/creation/assetRepository.ts`。
- 设置入口：`src/components/settings/CompanionSettings.tsx`、`CompanionMigrationActions.tsx`。
- 旧浏览器存储契约：`src/runtime/storage-contract.ts`、`src/features/creation/useCreationStorage.ts`。

## 测试与证据

- 2.1.24本地验证（TASK-223，本任务DONE/PASS；功能主状态保持）：伴随服务父子操作独立busy，连接revision/身份约束迟到成功和错误；同renderer同身份重新配对受保护，跨renderer同字节ABA不冒称闭合；最终产品58b5c07f与完整验证、官方/便携回执见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/browser/local-service-migration.spec.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

- 规范：[数据存储约定](../architecture/DATA-STORAGE.md)及[ADR-008](../architecture/adr/ADR-008-platform-versions-and-local-first.md)。
- 单元与协议/文件存储：`tests/unit/localService*.test.ts`、`tests/unit/assetStorage.test.ts`。
- 真实 loopback 服务迁移验收：`tests/browser/local-service-migration.spec.ts`。
- 连接、备份、断线与 390px 验收：`tests/browser/local-service-connection.spec.ts`。
- 生产 smoke（Web bundle 边界、全新浏览器上下文、服务重启）：`tests/local-service/production-smoke.mjs`。

## 当前能力

- 本轮2.1.23已验证恢复备份前展示准确备份ID及快照替换影响；取消不调用恢复，确认仅恢复该ID，旧浏览器原件不删除。

- 服务只监听 `127.0.0.1`，默认端口 `4319`；配对码只使用一次，会话写入 HttpOnly cookie。
- 显式启用服务后，创作快照和素材服务优先；服务离线/认证失败/版本冲突会返回明确状态，不静默回退并声称已保存。
- 旧 IndexedDB 只读预检后由用户确认导入；服务端按快照 revision、引用完整性、素材 MIME/大小/完整 SHA-256 和 manifest 校验后发布，旧库不删除。
- 服务备份包含快照、记录与原件，清单和文件 SHA-256 校验后可恢复；未连接服务时仍保留原 IndexedDB 路径。
- 本轮 `84c6a136→6c639e8a` 对未来格式和IO失败关闭：未知主/备份版本不回退旧备份，不覆盖唯一新版bak；Web收到不支持格式或IO时保留当前草稿并暂停写入，不另建IDB项目库。115项相关测试、格式/IO界面2项首试及精确独审通过，见[统一验证](../changes/2026-10-15-kk-unified/verification.md)。

## 差距与后端化

- 尚未交付安装器、自动更新、卸载保留策略和跨平台打包；当前通过 `npm run local-service` 启动 Node 24 服务，生产 smoke 使用临时数据根目录。
- Native封装格式与旧Node裸metadata不兼容，不能将旧服务直接指向Desktop目录。Native权威06ac/df9及四域OS互斥/准入/激活基础已独审，204Rust/1既有ignore；实际重复启动/重开已留隔离证据，前台焦点尚未通过。Native HTTP目前仅health/activate，没有Web项目读写或目录授权；不等于Desktop/Web已共用完整仓库，也不证明关闭窗口后服务继续运行。边界见[ADR-021](../architecture/adr/ADR-021-native-local-repository-authority.md)。
- 导入中断时已发布快照不会改变，旧 IndexedDB 保留；已经上传但未发布的素材可能成为服务目录中的未引用原件，后续需垃圾回收任务处理。
- Web 登录与账号绑定由 `BACKEND-PLATFORM` 另行实现；当前本机服务连接不是账号登录证明，账号服务不作为个人原件的默认云存储。
- Mobile 只按 Web 核心契约对齐，原生入口、裁剪能力和真机持久化由 `T12` 验收。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。
