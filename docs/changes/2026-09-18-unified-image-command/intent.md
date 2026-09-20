# Intent

- ID：T4
- 状态：Implemented，本地产品链验收完成；真实付费 Provider 由 EXT-PROVIDER 单独验收。
- Figma：0nU0A7pq6eyjwfwm1TtWkO / Workspace 404:28667；本次成功读取，但只返回 Frame 边界，未取得完整子层设计上下文。
- 用户问题：首页和对话可生成，画布、结果编辑和上传重绘却仍走本地图片 demo；任务状态不能准确归属来源节点，配置连接被误认为已经验证。
- 预期结果：所有图片入口执行同一提交检查、审批、固定连接、HTTP 请求、归档和状态流程；明确历史生成验证与当前配置的区别。
- 不在范围内：真实付费 Provider 验收（EXT-PROVIDER）、ComfyUI（T6）、跨进程持久 TaskHost/unknown 恢复（T5）、UI 重设计。
