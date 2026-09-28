# ADR-008：三端独立版本与设备本地数据目标

- 状态：ACCEPTED（产品与版本目标；本地服务、账号和 Mobile 实现状态见账本）
- 日期 / Task ID / Owner：2026-09-28 / TASK-VERSION-001 / root
- Intent / Spec / Plan：[交付包](../../changes/2026-09-28-platform-versioning/intent.md)、[规范](../../changes/2026-09-28-platform-versioning/spec.md)、[计划](../../changes/2026-09-28-platform-versioning/plan.md)

## 背景与选择

用户确定 Desktop → Web → Mobile 的功能交付顺序，三端版本独立递增，现阶段均为 `2.1.1`。当前一个 `package.json` 版本同时被网页和桌面 UI 使用，无法表达独立发布；Web 仍以 IndexedDB 为项目/资产持久源，账号仅演示，Mobile 没有独立运行产物。

采用单仓库共享核心契约与独立平台版本源。桌面可以免登录离线使用，也可以选择登录；Web/Mobile 的目标使用条件是登录。个人项目和素材留在用户设备：Desktop 使用原生仓库，Web 安装本机伴随服务保存，Mobile 使用设备本地持久层。服务账号用于身份与可选能力，不自动意味着项目数据上云。Mobile 对齐 Web 核心能力但按设备限制裁剪与优化。

## 取舍与实施边界

| 方案 | 结果 |
| --- | --- |
| 继续共用根 package 版本与 Web 浏览器持久化 | 不能表达三端独立交付或用户指定的数据边界；不采用为目标 |
| 三条长期产品分支 | 共享代码会长期漂移；不采用 |
| 单主线、三端版本源与 Web 本机伴随服务 | 版本能按产物递增，数据目标可分阶段迁移；采用 |

本次只建立版本命令、元数据、运行态显示与架构任务。当前 Web IndexedDB 及演示账号保持原行为，不做静默数据迁移；本机服务必须先实现安全的本地进程通信、身份绑定、数据目录、备份、导入与异常恢复，再将 Web 持久源切换。Mobile 应用形态与真机验收由 T12 决定。现有存储 key、Tauri identifier、数据目录和项目包 schema 不因版本源切换改变。正式发布与 VPS/云端状态另行验收。
