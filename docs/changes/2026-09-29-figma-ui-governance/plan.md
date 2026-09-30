# Plan：新版 Figma UI 治理的集成承接

本文件于 2026-09-30 补录，原候选的实施依据为本目录 [spec](spec.md)、[audit](audit.md) 和 [verification](verification.md)。旧证据保留，最终候选验收统一进入 [项目落地计划](../2026-09-29-project-landing/plan.md)。

1. 核对四页治理基线及 UI_INDEX、tokens、共享组件、实际 App 路由的依赖链。
2. 将未提交候选保存为可追溯 snapshot，承接最新 main 的存储、图片比较、伴随服务和平台版本。
3. 修正禁用反馈、批量/数据模式入口、侧栏离散宽度、移动可达性、composer 动态重叠及当前测试 fixture。
4. 分别重建 production dist 与 Tauri release，运行 390/1099/1920、键盘/焦点和本地数据恢复回归。
5. 同步任务、功能卡和版本；绑定最终 SHA 的独立审查及 verify/delivery 后通过集成 PR 合并，刷新实际交付产物。

旧 Web 定向通过不代替本轮全量结果；当前结果以 [集成 verification](../2026-09-29-project-landing/verification.md) 和最终 PR 收据为准。技术裁定及失败边界保存在集成 plan，不能修改旧 SHA 冒充本轮审查。
