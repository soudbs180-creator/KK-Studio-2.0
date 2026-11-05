# 六支柱接线 Implementation Plan

- Task ID：TASK-E2E-WIRING-20261104；状态：IN_PROGRESS；日期：2026-11-04。
- Goal：把用户清单中的生产模块连接到实际运行入口。
- Architecture：复用现有 feature slice 和原生持久化；以 P0→P4 的依赖顺序推进。
- Tech Stack：TypeScript、React、Tauri/Rust、Zod；Dagre 3.1.3（MIT）布局、MP4Box 2.5.0（BSD-3-Clause）/ts-ebml 3.0.2（MIT）解复用，外部实现封装在 feature adapter。未复制 AGPL 参考实现。
- Spec：[spec.md](spec.md)；base 6719c6d1；当前分支 codex/TASK-E2E-WIRING-20261104。

## 执行清单

- [ ] P0：`memory/kkMemoryStore.ts`、schema/driver、Rust scoped_memory、memoryService/agentConnection、AgentHost；覆盖首次写、V1 迁移、CAS 冲突、损坏/未来版本、会话隔离、关闭和临时聊天。
- [ ] P1：主入口桥初始化和四处插槽、既有设置启停；真实网关冷却/聊天回滚、Agent 编排/授权/遥测；定向回归。
- [ ] P2：画布操作 schema/dispatcher 和 agentCanvas 真实状态适配；floorplan、引用编译与业务 UI；非法载荷及持久化恢复测试。
- [ ] P3：工作流/镜头/视频生产模块与业务节点；审查并吸收阶段 3 已提交与 dirty 内容，去掉演示 fallback；取消/失败/恢复验证。
- [ ] P4：harness 纯生产转出；typecheck/lint/ui:check/format:check/test/test:e2e/build/verify、Rust、1421 桌面1440×900/手机390×844、当前 Desktop 验收、独审与合流。

## 协调与风险

root 负责实现、集成与文档；独立上下文负责只读预审，共享文件修改串行。现有阶段 3 树保持，最终验证与合流前不删除。备份/迁移使用隔离夹具，禁止用用户记忆文件作测试。失效快照不得覆盖后来的写入。关闭记忆与切换聊天后不注入迟到结果。

## 当前基线

2026-11-05 续作已实现回滚 UI/真实 Codex revert、Stage 授权执行、34 原子操作、Floorplan、引用双向绑定、模型分镜/资产投影、光学提示词、WebCodecs 全帧切镜。harness 已清空全部内联行为，仅生产 re-export，增加 AST 防回流检查。以下是前序时点记录；最新验收以 verification 的 11-05 记录为准，完整门禁、Desktop、正式独审及合流尚未收口。

首次不存在的CAS和原接口接线问题已修复并有回归。verify-3曾完整通过；后续记忆范围管理含新UI与StrictMode修复，最新候选须重跑完整门禁。整体清单仍未完成，具体证据与剩余项见 [verification](verification.md)，不得沿用旧绿灯。
