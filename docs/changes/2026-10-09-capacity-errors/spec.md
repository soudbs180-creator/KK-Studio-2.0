# TASK-PROV-007 — spec

## Rust（src-tauri/src/task_host.rs）

- 失败响应（非 2xx）保留上游 `error.message`：新增 `upstream_error_detail(body)`
  （serde_json 提取 `/error/message`，trim、去空、400 字符截断），失败
  `RunError` message 变为 `供应商返回了失败响应（HTTP <status>）：<原始消息>`；
  分类（rate_limited/unauthorized/forbidden/…）与 Retry-After 保留既有逻辑。

## TS（src）

- `imageGeneration.ts`：`providerError` 导出并接受 `detail`（上游 body 的
  `error.message`，调用点读取失败响应文本后传入）；401/403/429/5xx/4xx 消息
  均优先携带原始错误。
- 429 语义：无 Retry-After → `retryable: false`（冷却后手动重试，不盲目重试）
  且消息提示"连接已进入冷却，恢复后需手动重试"；有 Retry-After →
  `retryable: true` 并提示秒数。
- `App.tsx`：新增 `capacitySwitchHint(currentId)`——失败提示为
  `rate_limited` 时附当前可用连接（排除 disabled/quarantined/cooldown）
  与切换引导，终态与 catch 两处消息均接入。

## 测试

- Rust：`upstream_error_detail` 提取/空 body/空白消息/中文/400 截断。
- TS（providerError.test.ts）：429 保留原始错误 + Retry-After 驱动、
  429 无 Retry-After 不标记可重试、401/500 保留原始错误、无 body 回退模板。
