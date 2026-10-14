# 积分、订阅与平台额度（FEAT-018）

- 状态：PROTOTYPE
- 领域：platform
- 最近更新：2026-10-09
- 关联任务：BACKEND-PLATFORM、T10

## 用户可见入口

- 账号弹窗积分/订阅区、隐私说明、任务审批示例单价。

## 代码位置

- UI：`src/components/AccountPopup.tsx`、`GenerationPrivacyNotice.tsx`、`TaskExecutionApproval.tsx`、`TaskWorkbenchContent.tsx`
- 前端拦截：`src/features/creation/imageTaskCommand.ts`（平台模式显式提示不上传/不扣费）
- 服务端已建未上线：`src/features/generation-server/schema.sql`（credit_accounts/reservations/settlements、gateway_settings、provider_request_logs）、`repository.ts`、`http.ts`

## 测试与证据

- 浏览器：`task-intent`（验证平台模式被拦截）
- 单测：`generationServer*.test.ts`（额度/结算逻辑在独立后端测试通过）

## 当前能力

- 本地演示余额；独立 Gateway 内的额度预留/结算/熔断逻辑完整且有测试，但未对外服务。

## 差距与后端化（Wave 3）

- 平台账户路由、真实计费集成、货币账单、管理后台；Web 的积分、会员与用量控制面目标部署在 VPS，必须提供真实服务证据，不能以本地演示余额或 mock 作为完成依据。上线前平台模式保持禁用。
- 依赖身份体系（FEAT-017）与 T10 部署。

## 变更记录

- 2026-09-21：创建卡片，状态 PROTOTYPE。

- 2026-10-15：按UI反馈移除首页画布生成参数与无调用旧入口；额度/隐私数据字段和平台拒绝规则保留，能力状态不升级。
