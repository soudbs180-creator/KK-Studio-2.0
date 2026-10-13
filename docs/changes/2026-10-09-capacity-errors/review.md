# TASK-PROV-007 — review

## 独立审查要点

1. **原始错误保留**：Rust 侧 `upstream_error_detail` 仅注入失败 message，
   不改变 failure_class/status/retry_after 契约；TS 侧 `providerError` 的
   detail 只是消息增强，status/failureClass/retryAfterSeconds 语义不变；
   body 读取失败（非 JSON）回退模板，不会吞掉分类。
2. **不盲目重试**：429 无 Retry-After → `retryable: false`；连接进入既有
   cooldown（markProviderConnectionFailure 默认 30s），冷却期内
   assertSubmissionConnection 拒绝提交；有 Retry-After 仍可重试并提示秒数。
   未改动 generationQueue/worker 的指数退避（该路径不属于 BYOK image）。
3. **切换入口**：`capacitySwitchHint` 只读 readProviderConnections 过滤
   disabled/quarantined/cooldown，不影响连接状态写入；消息拼接不改变任务
   终态语义。
4. **与 PROV-006 解耦**：007 未触碰提交门禁（task_host submit、health 回执
   身份校验）；两分支改动文件有交集（task_host.rs / App.tsx）但 hunk 独立，
   三路合并按任务 ID 各自保留。
5. **证据**：Rust 21/21、TS 20/20（5+15）、tsc 通过；限制如实列出。

## 结论

无 P0/P1。实现满足 capacity 分类、原始错误保留、无 retry-after 不盲目重试
与切换引导；独立 usage 命令与完整 verify/push 按限制待后续。
