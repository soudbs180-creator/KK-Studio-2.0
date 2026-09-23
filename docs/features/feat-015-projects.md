# 项目与项目包（FEAT-015）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-09-22
- 关联任务：T3a、T3b、T9、TASK-DS-002

## 用户可见入口

- 侧栏项目列表/分组、项目包导入导出（ProjectPackageActions）、启动恢复。

## 代码位置

- 前端：`src/features/projects/projectPackage.ts`、`nativeProjectPackageAdapter.ts`、`src/features/creation/storage.ts`、`useCreationStorage.ts`、`snapshotCodec.ts`
- Desktop Rust：`src-tauri/src/project_package.rs`、`project_package_snapshot.rs`、`creation_storage.rs`、`storage_paths.rs`
- 数据根：`%APPDATA%/kk-studio`（creation-v2 格式）

## 测试与证据

- 单测：`projectPackage`、`projectCanvas`、`snapshotCodec`
- 浏览器：`project-package`、`desktop-data-stability`
- Rust：`project_package_failure_tests.rs`
- 证据：T3a/T3b verification

## 当前能力

- Desktop 原生素材、完整项目包与隔离恢复验收通过；损坏快照不会静默变空项目。

## 差距与后端化

- T9：Web 本地版项目包文件适配、浏览器容量/离线、跨 origin 项目包；Web 现存 Desktop 专属入口需收掉。

## 变更记录

- 2026-09-21：创建卡片，Desktop REAL、Web 缺口记为 PARTIAL。

- 2026-09-22（TASK-DS-002）：目录和设置控件按Design System 1.1迁移；新增 `tests/browser/design-system-pages.spec.ts`，Web与实际Tauri证据见 `docs/changes/2026-09-22-design-system-pages/verification.md`。桌面重启已验证偏好和本地Skill记录保留；本证据不覆盖Provider/GPU或任务宿主恢复，功能状态保持PARTIAL。
