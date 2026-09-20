# Spec — TASK-GOV-002

- 规范：AGENTS/AI_RULES、engineering流程、BRANCH-POLICY、REVIEW为共同规则；兼容入口只路由。task-ledger为机器任务源，历史证据有时间/提交范围。
- 自主权：AI自行做需求转译、技术方案、实现和验证；用户保留产品结果判断及真实高影响授权。不给普通文档逐阶段加审批。
- 分支：origin/main唯一新基线；从已fetch的40位SHA新建codex任务worktree，PR合并；默认不删除，禁止force/历史覆盖；发布只最新入口，保留不可变tag与回滚。
- 单用户评审：独立AI上下文不等于独立GitHub身份；不要求同一owner自approve。可用时强制PR/current checks，required approvals=0；真正不同身份时升级审批模式。
- 自动门禁：复用已有check-governance/import boundaries/ledger，不替换成简化版本；新增pre-push安装器、真实临时repo测试、delivery结构门禁；代码和规则变动均有变更包/review/账本。
- 冲突修正：TS/JSON/Rust tasks目录一致；文档中的Web存储、Desktop原生链、损坏会话与已完成T3a/T3b按当前证据修正；旧Figma节点和前端阶段标历史；npm-only。
- 平台：不改变产品UI；对规范/测试/契约修改运行相关测试及完整verify。当前真实服务、Mobile、TauriTaskHost完整运行验收不会自动被本轮关闭。
- 失败：既有CI失败必须披露、定位；测试修复保留有效断言。remote rulesets若403仅记录BLOCKED，不用hook替代远端保护。
