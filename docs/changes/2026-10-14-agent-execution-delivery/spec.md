# 有界实现契约

- Task ID：TASK-AGENT-UX-20261014
- 状态：READY；日期：2026-10-14
- 来源：[intent](intent.md)、[UI 索引](../../UI_INDEX.md)、既有 AgentEvent/AgentChatItem、CreationTask 与 useCreationStorage。

## 执行过程

- 复用 activity 事件与 AgentChatItem.detail，保留 phase、item/turn/thread 归属及明确结果信息。
- 相同活动更新同一记录；已完成阶段不被迟到更新回退；旧会话不污染新会话。
- 沿用 details/summary、已有语义 tokens 与正文消息。审批与停止保持现有入口。
- completed 只表示阶段结束，成功/失败依据明确 status、exitCode 或 error；停止请求不冒充已停止。

## 生成与保存

- 复用 CanvasHud.projectStatus、真实任务回执与唯一 saveState。已归档数量不能当作 Provider 返回数量。
- Web 响应解析/原生成功回执后可显示结果正在保存；无法观测的原生内部阶段保持生成中。
- 执行过程的暂态反馈不写 snapshot，不改变任务状态、重试资格或幂等键。
- 只有资产归档与当前 revision 保存确认才显示结果已保存；保存错误与生成失败分别保留。
- partial、unknown、offline、cancelled 与 interrupted 不显示整体成功。Prototype 文案保持明确。

## 验收

单元覆盖合并/乱序/失败证据与状态优先级；浏览器覆盖展开、审批、停止、迟到、归档延迟、保存失败/重试/重载与三档宽度。Desktop 与 Web 分别保留运行边界；真实外部 Provider 不由 fixture 代填。无数据迁移或新的 ADR。
