# Plan

当前阶段：源修复和独立 worktree 验证已完成，下一步在受保护的本地 `main` worktree 中快进引入治理基线、压缩合入本任务源码，并以主线产物重新执行验证。

依赖：已验收86c40d0 → 并行只读Git审阅/独立浏览器测试 + 主代理修复 → 合并测试 → verify/review → 任务提交 → main整合 → 主线复验与Tauri证据 → 状态同步。

主代理独占App/registry/submission/imageGeneration/ConversationPanel/治理文档；测试代理独占新provider-scheduling.spec.ts（独立测试worktree）。固定1421/1423由主代理串行使用。
