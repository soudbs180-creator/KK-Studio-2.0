# TASK-MOD-P0：模块化治理基线

- 用户要求（2026-10-28）：检查外部 AI 的整顿文档，纠正错误后开始优化项目。
- 来源：用户提供的 `modularity_execution_spec.md` 与 `standards_and_repo_organization.md`，分析目录标识 `ce87a6c0-3893-44ac-a478-19a693f30412`；早期审计和评审已被执行规范取代。
- 目标：先把模块边界变成自动门禁，再按依赖推进能力契约和重构。
- 本卡范围：P0，治理脚本、配置、开发依赖、故障注入测试、现行规范、ADR 与账本。产品源码、UI、用户数据、证据迁移均不在本卡。
- 工作基线：本地 `main@c2a0228a57be66b982d889c6710faa32cde49b7c`。远端 `origin/main@4610c3339db436147006171aec08aad4cfdfb679` 与本地分叉（本地113/远端7独有提交），本卡不能夹带113项历史整合。
- 主 checkout 的21个 dirty 文件已在工程外保存 SHA-256 清单；本卡使用独立任务树，不提交或覆盖它们。
- 验收：[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)。
