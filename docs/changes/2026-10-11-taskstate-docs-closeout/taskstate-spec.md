# Spec：统一任务态成本回执边界

## 回执结构

`TaskCostReceipt` 必须包含 `kind`、`amount`、`currency`、`source`、`providerId`、`receiptId`、`receivedAt`、`taskId` 和 `idempotencyKey`。

- `kind` 仅允许 `estimate` 或 `actual`。
- `amount` 必须是有限非负数，范围为 `0..1_000_000_000`。
- `currency` 为三位大写代码；不做汇率猜测。
- `source` 仅允许 `provider` 或 `fixture`；fixture 不构成真实账单证据。
- 身份字段采用有界不透明 ID，禁止 URL、等号和凭据形态；回执身份必须与外层任务和幂等键一致。

## 应用与持久化

- 相同回执重复应用返回 `duplicate`；已存在不同内容时返回 `receipt_conflict`。
- 跨任务或跨幂等键回执返回 `task_mismatch`，不改变任务。
- 只有 `source=provider` 且 `currency=USD` 才派生 `estimatedCostUsd` / `actualCostUsd`；fixture、非 USD、缺失或非法回执保持未知。
- `estimatedCostQuote` 与 `actualCostReceipt` 在 Web 快照和 Tauri portable package 中保留；旧的有限非负标量仍兼容读取，但不凭空补回执来源。

## 验收边界

本轮验收覆盖单测、快照读回和 native package round-trip。真实 Provider adapter/webhook、真实账单、汇率、Desktop WebView 和用户验收不在本轮范围。
