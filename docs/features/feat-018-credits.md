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
- 当前口径（与派工板 `board.md` §5 一致）：积分方向是「当前本地积分/用量，云端后置」，**不是隐藏积分入口**。保留「套餐与积分」本地页，去掉 Prototype / 假云端按钮；`creditsLocal` 默认开、`creditsCloud` 默认关。本地积分/用量不依赖服务器；云端计费、平台额度与 VPS 用量控制面统一后置到 ph3-account-cloud。平台模式（云端额度/计费）保持禁用，不作为当前能力。本卡 PROTOTYPE 状态与 registry 真实度不升级，待本地积分实做交卷并补运行证据后再评估。

## 差距与后端化（本地当前 / 云端后置）

- 口径分层：当前先做本地积分/用量（本地能力，不依赖服务器）；平台账户路由、真实计费集成、货币账单、管理后台与 Web 云端积分/会员/用量控制面属于 ph3-account-cloud，后置，必须提供真实服务证据，不能以本地演示余额或 mock 作为完成依据。
- 原「Wave 3 需要服务器/部署」的定位只适用于云端部分；上线前云端平台模式保持禁用，本地积分/用量可用。
- 依赖身份体系（FEAT-017）与 T10 部署。

## 变更记录

- 2026-09-21：创建卡片，状态 PROTOTYPE。

- 2026-10-15：按UI反馈移除首页画布生成参数与无调用旧入口；额度/隐私数据字段和平台拒绝规则保留，能力状态不升级。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。

- 2026-11-09（ph1-gov-docs 口径同步）：按派工板 board.md §5，把积分口径由「原型演示壳 + 云端计费后端化 / 隐藏导航」同步为「当前本地积分/用量、保留本地页与导航、云端计费后置 ph3-account-cloud」；仅改口径文字，不改功能状态、registry 与证据。
