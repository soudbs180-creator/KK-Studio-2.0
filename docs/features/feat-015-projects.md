# 项目与项目包（FEAT-015）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-18
- 关联任务：T3a、T3b、T9、TASK-DS-002、TASK-PROJECT-SIDEBAR-001

## 用户可见入口

- 项目库和侧栏中的真实本地项目、持久项目分组、项目垃圾箱、项目包导入导出（ProjectPackageActions）、启动恢复。

## 代码位置

- 前端：`src/features/projects/projectPackage.ts`、`nativeProjectPackageAdapter.ts`、`sidebarProjectModel.ts`、`src/features/creation/storage.ts`、`useCreationStorage.ts`、`snapshotCodec.ts`、`src/components/SidebarProjectGroups.tsx`
- Desktop Rust：`src-tauri/src/project_package.rs`、`project_package_snapshot.rs`、`creation_storage.rs`、`storage_paths.rs`
- 数据根：`%APPDATA%/kk-studio`（沿用 `creation-v2.json` 文件名，当前已迁移快照 schema 3、repository format 2；旧文件名不代表仍是v2）

历史2.1.38实际9项目/11聊天，旧资料已可编辑，完整canonical数据在正常关闭重开后保持；[本轮验证](../changes/2026-10-18-local-guards/verification.md)。当时侧栏pin/sort为会话useState；本轮持久化结果见下文，真实新回复仍按聊天迁移任务开放，不据本地恢复提升为REAL。

## 2026-10-18 当前有界本地验证

Desktop/Web2.1.39/source793ddaf3：项目/文件夹pin及manual/recent/priority排序在同CreationSnapshot/CAS持久化，存储未就绪/冲突时真实禁用。Web侧栏32PASS、820窄屏键盘/重载通过；fresh官方Native真实项目/组操作和priority/pin/unpin跨四次正常启闭保持，项目包新root完整往返保留偏好。宽图共享几何按真实主体修复，四比例Web24与fresh Native宽图6状态SVG/DOM/实际拖线/端口和生成按钮命中PASS。完整verify851浏览器及原用户库9项目11聊天21消息保全见[本轮验证](../changes/2026-10-18-sidebar-canvas/verification.md)。原任务仅本地技术完成，不提升本功能成熟度/runtimeEvidence；真实Provider/Hosted/发布及用户整体接受另验。

## 测试与证据

- 单测：`projectPackage`、`projectCanvas`、`snapshotCodec`
- 浏览器：`project-package`、`desktop-data-stability`、`sidebar-real-projects`、`sidebar-project-groups`
- Rust：`project_package_failure_tests.rs`
- 证据：T3a/T3b verification

## 当前能力

- 当前候选 `13efa3fe→00e00e40` 在同一 `CreationSnapshot` 中持久化项目分组、成员和手动名称，项目库与侧栏共用打开、改名、移动分组、移入垃圾箱、恢复菜单；删除组只解除归属，恢复为空组。删除项目保留完整画布数据，手动名不会被自动命名覆盖。`7442c4fb` production1423三组Edge27/27首试和Native存储/包169项通过，精确子范围独审Approved；旧失败保留。历史fresh Tauri不替代本次新Native界面与产物验收，见[统一验证](../changes/2026-10-15-kk-unified/verification.md)。

## 差距与后端化

- T9：Web 本地版项目包文件适配、浏览器容量/离线、跨 origin 项目包；Web 现存 Desktop 专属入口需收掉。
- TASK-PROJECT-SIDEBAR-001本地技术验收已由本轮关闭；统一仓库协调、真实新回复和用户整体产品验收仍由各自任务承接，功能主状态保持PARTIAL。

## 变更记录

- 2026-09-21：创建卡片，Desktop REAL、Web 缺口记为 PARTIAL。

- 2026-09-22（TASK-DS-002）：目录和设置控件按Design System 1.1迁移；新增 `tests/browser/design-system-pages.spec.ts`，Web与实际Tauri证据见 `docs/changes/2026-09-22-design-system-pages/verification.md`。桌面重启已验证偏好和本地Skill记录保留；本证据不覆盖Provider/GPU或任务宿主恢复，功能状态保持PARTIAL。

- 2026-09-30：集成版本当前验证与剩余边界见 [落地验证](../changes/2026-09-29-project-landing/verification.md)。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。
