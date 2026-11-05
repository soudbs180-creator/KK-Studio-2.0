# Intent：六支柱生产接线续作

- Task ID：TASK-E2E-WIRING-20261104
- 日期：2026-11-04；状态：IN_PROGRESS；交付包角色：current。
- 请求来源：用户粘贴的《KK Studio 2.0 全量续作与端到端真接线任务指令》及后续“继续”。
- 授权：按 P0→P4 实现、测试、审查、合流；技术方案自主执行。
- Owner / branch / worktree：root / codex/TASK-E2E-WIRING-20261104 / D:/kk-studio/KK-Studio-2.0。
- Base：6719c6d1；main 原有 M3/M4 dirty 已保留到当前分支；未复制新工作树。
- 关联：[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)。

## 用户原意与验收

消除只被测试调用的孤立模块和 harness 内联替身。记忆、网关、扩展、Agent、画布和分镜能力必须通过正式组件/服务操作真实状态；保留既有数据、凭据边界、Figma 规范和手机聊天/桌面画布分工。

1. P0：确定性记忆落盘、作用域、迁移、前置检查和管理链路。
2. P1：组件、网关冷却/回滚、扩展插槽、Agent 三段式授权与遥测接线。
3. P2：34 项真实画布操作、蓝图映射和内联引用。
4. P3：分镜/一致性、镜头参数、视频切镜和既有阶段 3 去演示整合。
5. P4：harness 纯转出、全门禁、1421 双视口、当前 Tauri 与 main 合流。

每项须提供真实调用链和验证；局部通过不改变整体 PARTIAL 状态。外部计费调用按既有授权边界处理，尚未执行的 live 验收保持 NOT VERIFIED。
