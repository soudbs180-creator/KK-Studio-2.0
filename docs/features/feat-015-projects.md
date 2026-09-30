# 项目与项目包（FEAT-015）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-09-25
- 关联任务：T3a、T3b、T9、TASK-DS-002、TASK-PROJECT-SIDEBAR-001

## 用户可见入口

- 项目库和侧栏中的真实本地项目、侧栏会话文件夹、项目包导入导出（ProjectPackageActions）、启动恢复。

## 代码位置

- 前端：`src/features/projects/projectPackage.ts`、`nativeProjectPackageAdapter.ts`、`sidebarProjectModel.ts`、`src/features/creation/storage.ts`、`useCreationStorage.ts`、`snapshotCodec.ts`、`src/components/SidebarProjectGroups.tsx`
- Desktop Rust：`src-tauri/src/project_package.rs`、`project_package_snapshot.rs`、`creation_storage.rs`、`storage_paths.rs`
- 数据根：`%APPDATA%/kk-studio`（creation-v2 格式）

## 测试与证据

- 单测：`projectPackage`、`projectCanvas`、`snapshotCodec`
- 浏览器：`project-package`、`desktop-data-stability`、`sidebar-real-projects`、`sidebar-project-groups`
- Rust：`project_package_failure_tests.rs`
- 证据：T3a/T3b verification

## 当前能力

- Desktop 原生素材、完整项目包与隔离恢复验收通过；损坏快照不会静默变空项目。候选分支侧栏和搜索改从同一份 `CreationSnapshot` 读取真实项目；侧栏可创建、打开、改名和确认删除，空库没有演示项目。该候选尚未进入主线与正式桌面安装包。

## 差距与后端化

- T9：Web 本地版项目包文件适配、浏览器容量/离线、跨 origin 项目包；Web 现存 Desktop 专属入口需收掉。
- TASK-PROJECT-SIDEBAR-001：文件夹收纳、改名、置顶、成员移动仍是会话态，刷新后恢复未分组；持久分组需要 Web/原生快照和项目包迁移，尚未实现。候选的真实项目操作已在隔离 fresh Desktop 中验证，仍待独立复核、PR 合入和用户产品验收。

## 变更记录

- 2026-09-21：创建卡片，Desktop REAL、Web 缺口记为 PARTIAL。

- 2026-09-22（TASK-DS-002）：目录和设置控件按Design System 1.1迁移；新增 `tests/browser/design-system-pages.spec.ts`，Web与实际Tauri证据见 `docs/changes/2026-09-22-design-system-pages/verification.md`。桌面重启已验证偏好和本地Skill记录保留；本证据不覆盖Provider/GPU或任务宿主恢复，功能状态保持PARTIAL。
