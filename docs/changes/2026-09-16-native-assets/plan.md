# Native Assets Implementation Plan

**Goal:** 完成 T3a Desktop 原生素材和引用恢复，为 T3b 完整项目包提供真实存储底座。
**Spec:** 本目录 spec.md。
**Architecture:** Shared metadata → existing assetRepository facade → native IPC repository / existing Web IDB。

- [x] 1. 原生素材仓库与 IPC。临时目录覆盖hash/ID/mime、损坏、并发、元数据、读回；asset_storage/asset_io/asset_validation与测试、main.rs/storage_paths.rs接线。
- [x] 2. 前端adapter。沿用单一StoredGeneratedAsset共享元数据接口（本轮没有另造model）；native IPC读写，Web保留IDB；原生异常不回退伪成功。
- [x] 3. 项目媒体引用编解码。snapshotAssets按字段白名单编码/水合；绑定Desktop storage；Provider引用附件缺失或身份冲突禁止提交。覆盖>16MiB data URL和独立poster。
- [x] 4. 最终验证及证据：完整verify、Rust、release；原图hash、新WebView恢复、缺失保护与Web IDB；新增素材库失败重试UI后刷新证据。最终桌面证据见 `docs/evidence/native-assets-2026-09-18/native-acceptance.json` 与 `build-artifacts.json`。
- [ ] 5. 复核与PROGRESS/storage文档。独立review agent连接中断未返回结论；主代理完成逐项复核，不冒称独立审查通过。T3b仍未完成。

Ruling: 用户唯一工程约束优先，只在D:/kk-studio-next当前codex分支工作；不建立第二checkout，不全量stage/commit已有dirty。
Ruling: 首阶段保留内存data URL以接现有UI和Provider；耐久快照与native文件分离。内存预览按需缩略属于后续性能优化，不能冒称本轮已经实现。
Ruling: 本阶段T3a不接受旧目录/IDB自动迁移；新数据和已有嵌入内容保护路径分开。
