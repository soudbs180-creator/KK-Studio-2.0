# 素材库与资产管理（FEAT-014）

- 状态：REAL
- 领域：system
- 最近更新：2026-09-21
- 关联任务：T3a、TASK-PERF-ASSETS-001、PERF-001

## 用户可见入口

- 素材面板（AssetPanel）、素材卡片/详情/筛选/来源追踪、创建主体（CreateSubject）、导入。

## 代码位置

- 前端：`src/components/assets/`、`src/features/creation/assetRepository.ts`、`useAssetArchive.ts`、`assetPreview.ts`、`snapshotAssets.ts`
- Desktop Rust：`src-tauri/src/asset_storage.rs`、`asset_io.rs`、`asset_validation.rs`（MIME/PNG 校验、SHA-256 命名、原子写入）
- 数据：`%APPDATA%/kk-studio` 原生素材仓库；契约见 `docs/architecture/DATA-STORAGE.md`

## 测试与证据

- 单测：`assets`、`assetStorage`、`assetPreview`、`snapshotAssets`
- 浏览器：`asset-storage`、`asset-performance`
- Rust：`asset_storage_tests.rs`、`asset_storage_integrity_tests.rs`

## 当前能力

- 导入、归档、校验、预览、集合、来源链路为真实能力；生成结果原件归档。

## 差距与后端化

- PERF-001：永久缩略图、大快照、单件大图瞬时内存、不可抢占 IO、大型库容量未完成/未验收；当前仅有界分页与预览。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL（性能增强另见 PERF-001）。
