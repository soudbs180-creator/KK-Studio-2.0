# BACKEND-TEXT-NODE / TASK-RULES-003 implementation plan

1. 已核对 root/branch/dirty 状态、现行规则、roadmap、文本 seam 与图片 TaskHost；baseline 保存在工程外 backend-text-baseline。基线 lint/typecheck/unit 运行记录在 verification。
2. 在独立登记 worktree 完成 Rust task_host text 分支和功能 registry 校验；主代理实现 Web 文本 SSE transport、连接 modality 校验、App 共享执行/Canvas 接线、文本恢复。先失败测试，再最小实现。
3. 复用现有组件与样式，仅改变文本生成行为和准确状态/禁用文案；无新设计。本文本模型选择复用已保存连接模型，缺合适模型提示设置，不假设图片模型能聊天。
4. 运行单测、lint/typecheck、完整 verify、Rust fmt/test/check；浏览器按生产预览 HTTP fixture 验证提交、文本、取消、断流、离线、重载与图片回归。证据另存本次目录，避免覆盖旧证据。
5. 独立审查实际修改，修复 blocker；同步卡片/registry、账本、Project State/Handoff/PROGRESS 与勘误。保持未提交；真实原生运行证据未取得时不标 REAL。

重点回归：未知受理/重试、跨项目迟到结果、流式 UTF-8/EOF、凭据身份变化、图片默认兼容、REAL证据及畸形登记输入。
