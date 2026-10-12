# TASK-PROV-007 — plan

1. 勘察错误链：imageGeneration.providerError（模板化）、task_host 失败响应
   （统一文案）、App.tsx 失败提示（无切换引导）、generationQueue.retryDelayMs。
2. Rust：`upstream_error_detail` 提取上游错误并注入 failure message；测试。
3. TS：`providerError(response, detail?)` 导出 + 调用点读 body；429 无
   Retry-After 改 retryable=false；App.tsx `capacitySwitchHint` 接入两处
   rate_limited 失败提示。
4. 门禁：tsc、providerError/providerSubmission/providerHealth 单测、
   cargo test task_host。
5. 交付包五件 + 账本新增 PROV-007（DONE）+ 提交。
