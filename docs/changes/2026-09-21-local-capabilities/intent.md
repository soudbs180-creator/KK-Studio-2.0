# Intent

- ID：CAP-001
- 状态：Implemented（部分能力仍为 Prototype）
- Figma URL/node：无新增 Figma 节点；沿用现有 Settings、Catalog、Composer 入口
- 用户问题：MiniMax Design 的本地 Skill、MCP 工具和 ComfyUI 工作流入口在 KK Studio 中缺少可复用的真实交互，用户无法安装本地能力、发现 MCP 工具或管理自己的工作流元数据。
- 预期结果：提供可审阅的本地 Skill 库、真实 MCP Streamable HTTP 握手/工具发现/确认调用，以及本地 ComfyUI 工作流导入、导出、删除和运行请求入口；每个未接入的外部能力都显示明确边界。
- 不在范围内：任意 Skill 执行或脚本运行、stdio/OAuth 自动授权、Agent 自主工具调用、远程 Skill 市场、云端同步、真实 ComfyUI/Tauri 提交与恢复、付费 Provider、MiniMax 私有实现搬运和完整 Figma 视觉复刻。
