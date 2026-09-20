# Intent

- ID：desktop-data-stability-20260916
- 状态：Approved — 用户在 Launch Readiness Audit 后指示“继续下一步”。
- 用户问题：读失败后的重试可能覆盖本地项目；画布位置/连线/视口不保存，重开后新增节点 ID 重复。
- 预期结果：完成审计 T1/T2 的数据保护与图恢复闭环，为 Desktop 最小可用流程提供可靠基础。
- 不在范围内：Provider/ComfyUI 新接入、VPS 变更、Mobile、旧数据迁移、全量提交现有工作区。
- 设计：沿用 Workspace 404:28667、Landing 410:59708 和现有 tokens/保存反馈；恢复错误状态属于工程补充。
