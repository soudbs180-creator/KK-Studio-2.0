# Intent — TASK-GOV-002

- 状态：用户已要求落实项目治理，普通技术工作在授权范围内。
- 用户原意：由 AI 全面负责工程，用户只提出想法、UI/交互与测试反馈；不同 AI 都必须理解自然语言后生成专业任务；制定分支保护、多端核对合并、AI代码审核和高质量规则；确认版本后收敛到完整最新主线。
- 补充原意：产品代码与既有证据也要检查，发现以前规则逻辑冲突需要修改，保证规则一致。
- 本次目标：审计最新主线，落地共同AI入口、流程/模板/架构审查、Git防线和CI、修正证实的代码/文档冲突；核实真实服务器保护。
- 非范围：全面实现T5/T6/云服务、重设计UI、删除历史/分支、自动升级GitHub套餐、将私有仓库公开、部署生产或调用付费模型。
- 专业 brief：Implement a model-neutral AI operating contract, risk-based autonomous SDLC, immutable main/release workflow, cross-device reconciliation and executable regression gates. Audit actual source and canonical documents; fix scoped conflicts with evidence, preserve dirty work and historical provenance.
- 验收：入口统一、普通任务无需逐阶段审批；真实临时repo推送阻止用例通过；PR变更包门禁存在；存储目录契约一致；现行规则互相不冲突；托管保护的支持状态有当次API证据。
