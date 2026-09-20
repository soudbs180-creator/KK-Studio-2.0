# Spec — TASK-GOV-002

- 规范：AGENTS/AI_RULES、engineering流程、BRANCH-POLICY、REVIEW为共同规则；兼容入口只路由。task-ledger为机器任务源，历史证据有时间/提交范围。
- 自主权：AI自行做需求转译、技术方案、实现和验证；用户保留产品结果判断及真实高影响授权。不给普通文档逐阶段加审批。
- 分支：origin/main唯一新基线；从已fetch的40位SHA新建codex任务worktree，PR合并；默认不删除，禁止force/历史覆盖；发布只最新入口，保留不可变tag与回滚。
- 单用户评审：独立AI上下文不等于独立GitHub身份；不要求同一owner自approve。可用时强制PR/current checks，required approvals=0；真正不同身份时升级审批模式。
- 自动门禁：复用已有check-governance/import boundaries/ledger，不替换成简化版本；新增pre-push安装器、真实临时repo测试、delivery结构门禁；代码和规则变动均有变更包/review/账本。
- 审计边界：产品代码、产品测试、Figma历史节点、旧截图、既有证据和其他人的提交只读核对；本任务只改变治理规则、执行脚本、模板和规则场景测试，不修产品行为、不改既有测试、不覆盖既有证据、不接管其他提交。发现产品缺口只登记 follow-up。
- 平台：不改变产品 UI、数据契约或其他任务；对规则脚本和模板运行相关检查。当前真实服务、Mobile、TauriTaskHost完整运行验收不会自动被本轮关闭。
- 失败：既有CI失败必须披露、定位；测试修复保留有效断言。remote rulesets若403仅记录BLOCKED，不用hook替代远端保护。
