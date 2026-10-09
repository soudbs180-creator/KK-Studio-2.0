# 已知问题索引

本页只做问题到任务账本的一对一映射。目标、显示状态、负责人、优先级、处理结论、下一步、依赖和证据的唯一来源是 [`task-ledger.json`](task-ledger.json)；[`TASK_LEDGER.md`](TASK_LEDGER.md) 是生成视图。历史报告中的 PASS/FAIL 只对原记录提交和范围有效，不改变当前账本。

## 开放问题映射

- `TASK-WINDOWS-ENTRY-RECOVERY-003` — 继续定位Hosted Windows入口未正常退出的原始原因
- `TASK-IMAGE-EDIT-VERIFY-002` — 图片编辑真实模型与移动设备效果验收
- `T6` — Desktop ComfyUI最小链实现
- `EXT-PROVIDER` — 真实 Provider/GPU 生成验收
- `EXT-COMFY` — 真实 ComfyUI/模型验收
- `T7` — Desktop可用版本及安装恢复验收
- `T8` — 成熟Core职责和平台能力边界
- `T9` — Web本地版及浏览器容量/离线能力
- `T10-PREP` — VPS发布、备份回滚与部署配置准备
- `T10` — VPS staging和生产实机验收
- `T11` — 旧Web/Vercel切换与退役
- `T12` — Mobile 独立形态与手机适配
- `UI-001` — UI tokens和共享组件契约
- `UI-003` — 示例任务/账号与真实服务边界
- `UI-004` — 逐页对齐、IA和最终视觉运行态
- `PERF-001` — 原生素材缩略图/分页及内存IO
- `TASK-CAP-001` — 本地 Skill/MCP/ComfyUI 能力补齐
- `TASK-MINIMAX-001` — MiniMax Design 交互审计与本地技能/MCP复刻
- `TASK-MCP-PROTO-001` — MCP 2026 协议协商与旧版兼容
- `BACKEND-IMAGE-PARAMS` — 图片比例与清晰度真实透传供应商
- `BACKEND-TEXT-NODE` — 文本节点接入统一任务宿主
- `BACKEND-MEDIA-001` — 视频与音频节点真实生成链
- `BACKEND-MCP-AUTO` — MCP 工具自动调用编排
- `BACKEND-PLATFORM` — 平台账号/积分/云同步/记忆/代理后端
- `BACKEND-ASTRA-001` — Astra 研究助手实现
- `BACKEND-CONVERSATION` — 对话面板文本多轮能力与实际状态收敛
- `TASK-DS-001` — Design System校正与公共UI对齐
- `TASK-AGENT-001` — 默认 Codex 主 Agent 与 KK 生成任务接入
- `TASK-AGENT-002` — 桌面本地 Agent 托管与其他登录软件适配
- `TASK-DOCS-HISTORY-001` — 历史 Markdown 链接与缺失日志勘误
- `TASK-ORCH-003` — 编排器驱动生成执行与计划门禁
- `TASK-CANVAS-001` — 画布交付契约与当轮产物收集
- `TASK-TASKSTATE-001` — 统一任务态契约定稿
- `TASK-TASKSTATE-002` — 供应商成本报价回执接入
- `TASK-LOCAL-SERVICE-001` — Web 本机伴随服务与既有浏览器数据迁移
- `TASK-PROJECT-SIDEBAR-001` — 侧栏项目列表与真实项目数据统一
- `TASK-PROV-003` — Codex Provider 配置注入与 model catalog 落盘（agent 侧接线）
- `TASK-PROV-004` — Claude Code settings.json 落盘（agent 侧接线）
- `TASK-AGENT-004` — Google Interactions 对话和生图
- `TASK-AGENT-005` — Gemini CLI 账号登录通道（免 API Key 对话）
- `TASK-MEMORY-001` — 本地长期记忆服务接入对话
- `TASK-MEMORY-002` — 跨产品共享本地记忆（本机共享）
- `TASK-PROV-005` — Desktop 供应商非秘密配置 durable 保存与恢复
- `TASK-PROV-006` — Desktop image 提交连接门禁与 health 统一
- `TASK-VERIFY-CONCURRENCY-002` — 浏览器并发失败原因与隔离复核
- `TASK-VERIFY-ORIGIN-003` — 浏览器验收端口与服务来源契约一致性
- `TASK-DOCS-STRUCT-001` — AI 协作规则文档结构收敛
- `TASK-AI-GATEWAY-001` — 统一多平台 AI 模型接入：凭证、通道契约与豆包 Ark 适配器
- `TASK-PROV-BYOK-001` — 用户自有 API 产品化接入

新增问题必须先登记唯一任务 ID，再补充证据和验收；不得只在本页添加第二套状态。
