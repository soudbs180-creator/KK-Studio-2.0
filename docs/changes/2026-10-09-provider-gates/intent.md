# TASK-PROV-006 — intent

## 问题

图片原生提交在浏览器侧已由 `assertSubmissionConnection` 复查身份/health/容量
（App.tsx native 提交前调用），但原生 `task_host.rs` 的 submit 只有 text 走容量
门禁，image 无运行中任务计数；且失败/成功 health 回执仅按连接 id 写入，若期间
用户更换了 baseUrl/credentialRef，旧任务迟到回执会污染新配置。

## 目标

1. 原生 image 提交前同样复查运行中容量（jobs map 按 credential_ref 计数），
   无效/超容连接零 POST。
2. 原生 401/403/429 等结构化失败与成功回执回写 health 前校验任务绑定身份
   （baseUrl/credentialRef）与当前连接一致，旧身份/迟到回执不污染新配置。
3. 原生进程持有运行容量（reload 不释放），取消/终态释放，不新增任务队列。

## 非目标

- 不改浏览器侧门禁（assertSubmissionConnection 语义保持）。
- 不新增队列；unknown 普通重试禁止语义保持（T5 已实现）。
