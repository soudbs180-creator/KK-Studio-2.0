# ADR-005：Agent 图片原件与画布视图边界

日期：2026-09-23。任务：TASK-AGENT-003；本地未提交候选，不改变存储身份。

现有 infinite-canvas Agent 已支持 attachments → Codex localImage；KK 前端此前固定发送空附件，select_nodes/set_viewport 也未接实际控件。本轮在 KK 适配层接通这些契约，继续使用现有 vendor、MIT 许可、素材仓库和 Design System 1.3 共享输入框，不引入上游整套 UI、模型或持久化格式。

Agent 与 API 的未发送草稿隔离。Agent 图片由用户本地选择或显式引用已归档画布素材；发送前冻结列表、重新读取原件并验证 MIME、字节数、可解码尺寸和请求总量。缺失原件不回退缩略图；不读取任意外部 URL。最多 6 张，单张 8 MiB，附件编码总量 28 MiB，给上游 30 MB 请求限额留出正文空间。批次导入任一失败整批不提交，错误阻止发送，用户可重新选择或明确忽略未加入的图片。取消、项目/连接/模式切换和卸载使迟到读取失效。图片只随当前明确提交的消息进入 Agent；消息保留文件名与画布引用元数据，不写入凭据。

草稿目前按项目保存在页面内存中，不承诺刷新恢复；已归档图片仍由原有素材库保存。该边界没有新增快照 schema。素材内容去重和原件验证集中在 agentAttachments；共享附件 hook 通过显式 strictBatch 开关保留 API 默认行为。

Canvas 通过项目作用域的 AgentCanvasBinding 暴露当前选择/视口和受控更新。命令先验证所有节点、有限坐标及 0.2–4 缩放；应用时取消进行中的指针手势，提交控件状态后再回执。选择/视口快照来自实际控件，视口持久化继续使用现有 Canvas 机制。binding 在卸载或项目切换时撤销。

KK 内部沿用 `{x, y, scale}`，上游 Agent/MCP schema 使用 `{x, y, k}`。仅在 agentApi/agentHost 边界转换；保留内部 scale 操作兼容，不修改 vendor schema。真实随包 MCP 复现过 k/scale 不匹配，修复后有独立协议断言与原生 DOM 验证。

替代方案：搬入上游工作区会替换 KK 的 UI/数据模型；把缩略图当原件会掩盖丢失；只改 Agent 快照会产生画布与回执不一致，均不采用。跨平台证据与遗留边界见 [验证](../../changes/2026-09-23-agent-attachments/verification.md)。
