# TASK-AGENT-003 · Agent 图片与画布控制
用户原意：继续最近 Codex/Agent 未完成清单，先核验旧完成记录，并借助 infinite-canvas 的现成能力实现。
本轮交付：在现有对话输入框添加本地图片或显式引用画布图片，让 Codex 读取图片；MCP 可以选择节点和调整真实视口。
当前实现已有 vendor 附件 → Codex localImage，KK 前端却固定 attachments: []；select_nodes/set_viewport 被拒绝。
本轮范围是该缺口；TTS、视频、其他账号、任意网页自动化、附件导入节点工具仍在后续清单。
用户“开始吧”授权实施已评估方案，普通技术步骤自主执行。保留脏工作区和凭据身份；不 commit/push。
