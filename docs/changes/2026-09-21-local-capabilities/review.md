# Review：本地 Skill、MCP 与 ComfyUI 能力

- Task ID：CAP-001
- 审查状态：2.1.0 集成时补齐的历史包范围核对；不追认当日独立审查。

该包的 `verification.md` 记录当时 187 项 Node、193 项浏览器测试及桌面构建结果。它们只证明当时的候选与所列能力，不是当前 2.1.0 提交的测试结果；当前树的门禁另见 `docs/changes/2026-09-23-release-2-1-0/verification.md`。

Skill 任意执行、MCP stdio/OAuth 和 Agent 自主工具调用均不在该任务范围；真实 ComfyUI 提交、恢复、云端能力和完整视觉验收尚无本包同态证据。审查结论：作为集成来源记录可以提交，能力边界继续按现行功能卡和任务账本标示，不能借版本更新提升为 REAL。
