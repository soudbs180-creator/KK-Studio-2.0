# Intent：TASK-TASKSTATE-001/002 最小收口

本轮只收口统一任务态的成本契约基础，不扩展 Mobile、VPS、Astra、MCP、真实 Provider 联调或发布验收。

- TASK-TASKSTATE-001：保留既有 9 态、重试门禁和未知成本语义，补齐可复用的成本回执边界与快照回载。
- TASK-TASKSTATE-002：增加 `estimate` / `actual` 回执结构，绑定任务身份和幂等键；只把真实来源的 USD 回执投影到旧美元字段。
- fixture 只证明 schema、持久化和幂等行为；真实供应商报价、账单、币种换算与每平台运行仍单独保持 `NOT_VERIFIED`。
