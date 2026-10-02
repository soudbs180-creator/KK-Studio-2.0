# Intent：全项目任务盘点与可本地闭环项收口

- Task ID：TASK-AUDIT-20261003。
- 状态：IN_PROGRESS；日期：2026-10-03。
- 用户来源：“请对当前项目做一次完整的任务盘点与执行，确保质量”。
- Owner：root；分支：`codex/TASK-AUDIT-20261003`。
- Worktree：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`。
- [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md) · [Review](review.md)。

本轮以 `docs/governance/task-ledger.json` 和 `docs/features/features.registry.json` 为事实源，逐项核对 92 个登记任务和 34 个功能卡，区分本地可验证实现、外部条件阻塞和仍未开工项。对能够在当前仓库完整闭环的缺陷，按测试先行补齐实现、错误处理、边界行为和证据；对真实 Provider、ComfyUI、VPS、Mobile、用户视觉验收等依赖外部条件的任务保留真实状态，不用 mock 或静态代码冒充完成。

本轮的可交付收口包括：

- MCP 注册表在多实例写入时不静默覆盖，保持 50 项上限、凭据不落盘，并为旧版超限配置提供无损查看、导出和显式恢复路径。
- MCP 客户端支持 `server/discover` 现代协议与 2025-11-25 legacy initialize 的明确协商，鉴权/服务故障不误回退，保留现有传输安全、超时、大小和分页约束。
- 编排器移除 `plan_replan` 占位逻辑，生成持久的新计划，保留已成功项，重新排队失败/部分失败项及其依赖下游，并提供幂等结果。
- 任务台账、进度、状态和变更证据与真实验证结果同步，生成治理视图并通过全部可运行检查。

本轮不承诺外部系统验收，也不合并其他候选分支的大范围改动。任何仍依赖凭据、运行服务、真实机器或用户选择的任务，都在最终状态报告中列明阻塞条件和下一步优先级。
