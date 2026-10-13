# TASK-PROV-006 — review

## 独立审查要点

1. **门禁前置**：容量检查在 journal 写入之前执行，拒绝时无 journal、无 POST；
   浏览器侧 assertSubmissionConnection（skipCapacity）仍负责身份/health，
   两层职责清晰（浏览器=身份+health，原生=运行容量），未重复实现。
2. **不污染新配置**：health 回执按任务绑定身份（baseUrl/credentialRef）与
   当前连接比对，不匹配返回原数组；disabled/quarantined 既有保护保留；
   测试覆盖 failure（rate_limited/unauthorized）与 healthy 双向。
3. **容量生命周期**：jobs map 在原生进程（reload 不释放），run() 终态/取消
   移除（既有实现），未引入新队列或 TTL；text 回归测试保持通过。
4. **范围克制**：未改 assertSubmissionConnection 语义、未改 unknown 重试策略、
   未动生成请求本体；diff 仅 3 个文件 + 测试。
5. **证据**：Rust 21/21、TS 15/15、tsc 通过；限制如实列出（完整 verify、
   真实 Tauri fixture、push 待 remote gate）。

## 结论

无 P0/P1。实现与验收一致；未知全量回归与远端门禁按限制待后续执行。
