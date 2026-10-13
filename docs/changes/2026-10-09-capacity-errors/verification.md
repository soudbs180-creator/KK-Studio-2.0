# TASK-PROV-007 — verification

## 实现

- Rust `src-tauri/src/task_host.rs`：`upstream_error_detail(body)` 提取上游
  `error.message`（trim/去空/400 截断），非 2xx 失败 message 变为
  `供应商返回了失败响应（HTTP <status>）：<原始消息>`；分类与 Retry-After
  保留既有逻辑。
- TS `imageGeneration.ts`：`providerError` 导出并接受 `detail`，调用点读取
  失败响应 body 的 `error.message`；429 无 Retry-After 时 `retryable: false`
  并提示"连接已进入冷却，恢复后需手动重试"，有 Retry-After 时提示秒数。
- `App.tsx`：`capacitySwitchHint`（排除 disabled/quarantined/cooldown 的
  可用连接）接入终态与 catch 两处 `rate_limited` 失败提示。

## 验证结果

| 层 | 结果 |
| --- | --- |
| Rust `cargo test task_host` | 21/21 PASS（新增 upstream_error_detail 提取/空 body/空白/中文/400 截断） |
| TS `providerError.test.ts` | 5/5 PASS（429 原始错误+Retry-After；429 无 Retry-After 不重试；401/500 原始错误；无 body 回退模板） |
| providerSubmission + providerHealth 回归 | 15/15 PASS |
| `tsc -b` | PASS |

## 验收对照

1. 上游 capacity/429 分类为容量状态、原始错误与状态完整保留 —
   PASS（failureClass=rate_limited + status + 原始 message，浏览器与原生
   路径均保留）。
2. 刷新 models/usage 实时可用性、界面明确显示可用模型与禁用原因 —
   PARTIAL（可用性由连接健康派生，失败提示显示当前可用连接与切换引导；
   无独立 usage 命令，实时可用性为连接级）。
3. 降级选择与明确切换入口，无 retry-after 不盲目重试 —
   PASS（rate_limited 提示附可用连接引导切换；429 无 Retry-After 不再
   retryable，连接进入既有 cooldown 门禁）。
4. 与 PROV-006 互不冲突、相关回归通过 —
   PASS（007 未改提交门禁与回执身份逻辑；两侧测试独立通过）。

## 限制

- 可用性展示为失败提示级（无独立 usage 命令/轮询刷新）。
- 未跑完整 `npm run verify`；push/PR 受网络限制待 remote gate。
