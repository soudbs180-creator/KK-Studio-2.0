# Agent 画布同步最小修复计划

> 执行方式：本会话直接实现，最后由独立上下文审查。用户已授权本范围执行。

Goal：已挂载画布正确接收 Agent 图变更并可重载恢复。

Architecture：复用现有 Canvas 状态；在 render 条件更新中合并上次外部图、当前外部图和本地交互差异。持久化 schema 与项目身份不变。

- [x] 复用 agent.spec.ts 的 loopback fixture，在 production 1423 保存真实 DOM/IndexedDB 失败证据。
- [x] 为图差量与本地交互保护补最小纯函数回归，观察失败后修复现有 hooks。
- [x] 验证节点位置、reference/result 连线、删除、用户新增/取消/undo 及权威存储重载，保存截图与 DOM 几何。
- [x] 运行类型、lint/UI、相关单元/浏览器、构建和治理门禁；同步版本与功能证据。
- [x] 独立复核任务 diff；仅在原文件仍匹配快照时回写本任务补丁，保留原 index 与无关改动。

Review focus：新增/undo 的临时默认位置、同 ID 边换端点、Agent 编辑发生在拖动取消期间、result 边回归、等值图回声。

本轮共享源码与 Web 专项完成；完整检查的独立宽图失败、Desktop/Tauri 2.1.18 及真实 Provider 另列未验证，不将门禁整体记 PASS。
