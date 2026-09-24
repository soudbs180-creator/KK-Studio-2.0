# Intent: Google 对话与生图

- Task ID: TASK-AGENT-004
- 状态: READY
- 日期: 2026-09-23
- 用户原话: “之前codex可以调用，现在加入谷歌的”；希望登录后生成图片，了解官方限制后明确选择“接受 API Key，先把对话和生图接通”。用户补充了 Interactions 图片调用示例，并要求以解决实际问题为主。
- 授权: 在 KK 中实现 Google API Key 配置、连续对话、图片输入、生图及结果归档；本地工程与隔离测试自主执行。没有付款、生产发布或读取网页登录令牌授权。
- Outcome: 在设置填写一次 Google API Key，在项目对话切换 Google，直接对话/生图；图片进入当前画布及本地素材。
- Scope: 官方 Interactions REST、现有凭据库/请求内存、项目持久化、画布桥与共享输入组件。保留 Codex 默认行为。
- Non-goals: Google 网页登录复用、CLI 登录、视频/音频生成、订阅配额转换、云端部署。
- 验收: 文字与图片真实协议接线；连续对话 ID；图片参考；错误/取消/未知不自动重试；项目隔离；Key 不进入快照/日志；Web 交互测试；完整项目检查。
- 外部条件: 本轮未提供 Google Key；真实 Google 付费请求与用户结果验收必须单列，fixture 不作真实请求证据。
- Spec: [spec](spec.md); Plan: [plan](plan.md).
