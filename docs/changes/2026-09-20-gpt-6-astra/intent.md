# Intent

- ID：GPT6-ASTRA-20260920
- 状态：Draft；用户本次要求制定计划，未实施模型迁移。
- 用户问题：为当前 KK Studio 项目制定迁移到 GPT-6 Astra 的计划。
- 预期结果：以 `gpt-6-astra` 承担对话、参考图分析和规划；通过 Responses 接入，后续经过业务门禁调用既有图片生成服务。图片模型仍负责输出图片。
- 规划假设：“项目迁移”指应用自身的模型接入。当前 Codex 任务的模型选择不是本计划的改动对象。
- Source of truth：2026-09-20 复核的本地稳定 main、该主线 AGENTS/governance/PROGRESS 与官方 OpenAI 文档。原 dirty checkout 初稿仅为历史来源；详见 spec.md 与 branch-rules-audit.md。
- 本轮补充请求：检查适用规则、校正实施基线并同步 GitHub；用户指定 https://github.com/soudbs180-creator/KK-Studio-2.0 作为 2.0 远端；本轮只同步白名单文档，不修改旧仓库、不整库上传。
- Figma URL/node：沿用文件 `0nU0A7pq6eyjwfwm1TtWkO` 的 Workspace `404:28667`、Landing `410:59708`；本次没有修改 UI，没有读取新的 Figma 设计上下文。实施新增对话/创作模式前必须读取最新对应 Frame。
- 不在范围内：全局替换所有模型、修改历史任务的模型、替换图片/视频/音频模型、重新设计页面、上线 VPS、实现计费、全面接入 ComfyUI、接入个人订阅登录、启用电脑控制或任意 MCP 工具。
- 文档：spec.md 为拟议设计，plan.md 为实施顺序，verification.md 区分本次调研与未来验收。
