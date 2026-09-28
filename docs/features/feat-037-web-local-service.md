# Web 本机伴随服务（FEAT-037）

- 状态：PLANNED
- 领域：platform
- 最近更新：2026-09-28
- 关联任务：TASK-LOCAL-SERVICE-001

## 用户可见入口

- 目标：用户安装本机伴随服务后，在网页登录并使用设备本地项目与素材；服务不可用时明确提示与恢复，不把浏览器缓存伪装为已保存。
- 当前：无服务安装或连接入口；Web 仍使用 IndexedDB。

## 代码位置

- 待实现的服务与 Web 适配器：未建立。
- 当前浏览器存储契约：`src/runtime/storage-contract.ts`、`src/features/creation/useCreationStorage.ts`、`src/features/creation/assetRepository.ts`。

## 测试与证据

- 现状与目标：[数据存储约定](../architecture/DATA-STORAGE.md)及[ADR-008](../architecture/adr/ADR-008-platform-versions-and-local-first.md)。
- 真实服务、既有数据导入、离线恢复与跨浏览器实例尚无运行证据。

## 当前能力

- 未实现本机伴随服务；当前 Web 的 IndexedDB 持久化仍按既有契约工作。

## 差距与后端化

- 设计受限本机 IPC/loopback 通信与授权，持久目录、锁、完整性、备份/恢复及安全更新。
- 既有 IndexedDB 项目、快照和素材须有只读预检、用户触发的无损导入与失败回滚。切换前不能删除旧数据。
- Web 登录由 `BACKEND-PLATFORM` 另行实现；账号服务不作为个人原件的默认云存储。
