# 素材库与资产管理（FEAT-014）

- 状态：REAL
- 领域：system
- 最近更新：2026-10-17
- 关联任务：T3a、TASK-PERF-ASSETS-001、PERF-001、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 2026-10-17聊天媒体迁移（本地验证通过，任务仍PARTIAL）

关联TASK-CHAT-MIGRATION-20261017；2.1.37原库副本130检查中11素材文件15661180B逐字节保全，实际默认资料迁移到v3的媒体/消息/草稿引用按原始Value对账与重开验收；原件和全部失败证据保留。既有REAL仍限定原导入、归档、校验和预览等能力，不扩大到持久垃圾箱或未验新能力。 见[当前验证](../changes/2026-10-17-chat-migration/verification.md)。

## 2026-10-17安全修复边界（历史2.1.36）

关联本地安全修复任务：TASK-AUDIT-REPAIR-20261017（有界A–D DONE；完整功能缺口继续由本卡原开放任务承接）；[规格](../changes/2026-10-17-audit-repair/spec.md) / [实际验证](../changes/2026-10-17-audit-repair/verification.md)。既有REAL范围仍仅为已验导入、归档、校验、预览、集合和来源追踪。新增垃圾箱局部隐藏不能证明持久软删除，清空隐藏集合不能证明永久删除；需真实App接线、引用检查、持久提交及重挂载/重启证据，当前未接持久垃圾箱时禁用软删除/永久删除操作，4项真实浏览器安全预检包含禁用与归档原件保留；完整持久垃圾箱仍未实现/验收。 候选Desktop/Web2.1.36最终source4699458d完整verify、精确源码独审、官方重建、隔离Native与两日常入口正常关闭重开通过；旧d356真实菜单遮挡失败及所有原失败保留。默认旧聊天资料仍READ_ONLY，9项目raw/identity/shared memory保持；不宣称可编辑、完整迁移/protocol7、真实Provider或完整多聊天/垃圾箱/12AI恢复已完成。本卡成熟度与既有runtimeEvidence保持原范围，详细证据见本轮验证；Hosted/发布/用户验收另列。

## 用户可见入口

- 素材面板（AssetPanel）、素材卡片/详情/筛选/来源追踪、创建主体（CreateSubject）、导入。

## 代码位置

- 前端：`src/components/assets/`、`src/features/creation/assetRepository.ts`、`useAssetArchive.ts`、`assetPreview.ts`、`snapshotAssets.ts`
- Desktop Rust：`src-tauri/src/asset_storage.rs`、`asset_io.rs`、`asset_validation.rs`（MIME/PNG 校验、SHA-256 命名、原子写入）
- 数据：`%APPDATA%/kk-studio` 原生素材仓库；契约见 `docs/architecture/DATA-STORAGE.md`

## 测试与证据

- 2.1.24本地验证（TASK-223，本任务DONE/PASS；功能主状态保持）：取消/删除/撤销链已回归原件、素材来源与恢复，保留已有原件，不新增素材后端；最终产品58b5c07f与完整验证、官方/便携回执见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/browser/canvas-node-actions.spec.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

- 单测：`assets`、`assetStorage`、`assetPreview`、`snapshotAssets`
- 浏览器：`asset-storage`、`asset-performance`
- Rust：`asset_storage_tests.rs`、`asset_storage_integrity_tests.rs`

## 当前能力

- 本轮2.1.23已验证统一清除来源与搜索筛选；导入成功和切换分类后重置来源，资源空态可以恢复。原件不删除。

- 导入、归档、校验、预览、集合、来源链路为真实能力；生成结果原件归档。

## 差距与后端化

- PERF-001：永久缩略图、大快照、单件大图瞬时内存、不可抢占 IO、大型库容量未完成/未验收；当前仅有界分页与预览。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL（性能增强另见 PERF-001）。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。
