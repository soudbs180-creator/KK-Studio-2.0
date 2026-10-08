# Intent：项目建设目标与验收基线

- Task ID：TASK-GOV-GOALS-001。
- 状态：IMPLEMENTED；日期：2026-10-03。
- 请求来源：用户要求为项目明确建设目标、用户主路径、实现规范、链路状态、质量和交付验收，并在实现/修复过程中严格遵循。
- Owner：root；分支：`codex/TASK-AUDIT-20261003`。
- [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md) · [Review](review.md)。

## 用户原意

项目需要一份清晰的建设目标和验收标准，避免范围蔓延、半成品代码、假完成和入口到结果的断链；实现完成后要能直接运行并通过基础冒烟，剩余风险必须如实列出。

## AI 工程转译

建立一个项目级治理入口，定义 KK Studio 的核心用户路径和完成标准，并把代码、UI、状态链路、质量门禁、文档交付和外部边界写成可检查的规则。新增确定性 `goals:check`，要求入口文档存在、包含关键状态/门禁词，并与任务账本中的治理任务关联；不改变产品运行时数据格式或外部服务语义。

## 目标与非目标

- 预期结果：任何后续任务都能从一处定位产品目标、范围、主路径、平台边界和验收门禁。
- 包含范围：`docs/governance/PROJECT_GOALS.md`、治理检查脚本、package/lint 接线、任务账本和本 change package。
- 明确不包含：真实 Provider/GPU、ComfyUI、VPS、Mobile、第三方 MCP、账号/计费/云同步或用户最终视觉验收；这些继续由现有任务和外部条件负责。
- 受影响平台/模块：治理文档与本地门禁；不改变 Web/Desktop/Mobile 运行时实现。
