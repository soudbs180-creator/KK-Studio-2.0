# Cherry Studio 红框功能融合

当前执行至冻结源码 `7daeba25`，本机正式 Native6、真实 Ollama13 和隔离 NSIS 生命周期已有 PASS；最新完整验证、不同产物身份、Hosted 及最终验收的状态以 [最终记录](mainline-final-status.md) 为准。以下旧阶段保留执行时边界，不提前标 DONE。

日期：2026-10-13。任务：TASK-CHERRY-RED-001。

用户授权实际实施，以 KK 为唯一主体。近期范围为多供应商/本地模型、少量编程/图片/视频助手与自定义、多模型对话、MCP、Windows/macOS/Linux、即装即用、既有主题、透明窗口、Markdown 与本地内容分享。框外 OCR、知识库、WebDAV、语音、市场与 Mobile 保留后续可选。

助手不追求 300 个数量；用户明确选择少量常用角色，后续逐步扩展。只采纳免费开源实现；不调用付费服务，不采购许可证或证书，不把网站账号等同 API 资格。

普通技术设计和实现按本次总指令自主完成；不逐阶段重复请求批准。重大产品语义、破坏性迁移、重要数据删除和外部发布仍受保护。

基线：当前已提交 HEAD 51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c；隔离分支 codex/TASK-CHERRY-RED-001；主工作区的未提交 UI/版本改动保持原位。本任务改动只在隔离 checkout 实施，整合时单独处理与最新主工作区的差异。

默认新 worktree 门禁返回 ACTIVE_WORKTREE_BUDGET_EXCEEDED (59/4)，生成物 23638559196 bytes。现有候选仍挂开放任务，未接管。按 WORKTREE-LIFECYCLE 允许的受控环境配置，仅创建本任务一个 checkout：单次 maxActive=60、maxGenerated=32 GiB；环境变量随后恢复，默认规则未修改。创建前 D 盘可用约 882 GB；不删除旧 worktree、缓存或用户数据。原生工具不支持指定仓库规定的容器 worktree 落点，因此使用 Git 的固定路径创建。

验收以真实调用链、故障/取消/恢复测试及运行证据为准。没有设备、凭据或第三方接口的能力保持未验；不以编译替代三平台验收。
