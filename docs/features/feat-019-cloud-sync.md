# 云端保存与多端同步（FEAT-019）

- 状态：PARTIAL
- 领域：platform
- 最近更新：2026-09-22
- 关联任务：BACKEND-PLATFORM、T10、T9

## 用户可见入口

- 信息面板“保存在当前设备”说明、CatalogTutorial 中“云端保存/账号同步/文件上传尚未接入”。

## 代码位置

- 本地持久化（真实）：`src/features/creation/storage.ts`、`src-tauri/src/creation_storage.rs`、IndexedDB（Web）
- 云端（已移植服务层，UI 未接）：`src/features/sync/webdav.ts`（vendor 上游 `web/src/services/webdav-sync.ts`）：
  目录自动创建、上传/下载 manifest、Basic 认证、连接测试，支持 localProxyUrl 走本地转发代理

## 测试与证据

- `tests/unit/webdavSync.test.ts`（目录自动创建、上传/下载 manifest、Basic 认证、连接测试）

## 当前能力

- WebDAV 同步后端能力已可用（可编程调用）；设置/同步 UI 与账号体系接线待排期。

## 差距与后端化

- 设置 › 云端接入 UI：WebDAV 地址/凭据、手动/自动同步入口。
- 账号同步与多端冲突策略；服务端资产/所有者表（schema.sql）未部署。
