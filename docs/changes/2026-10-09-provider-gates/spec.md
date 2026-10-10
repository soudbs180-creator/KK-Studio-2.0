# TASK-PROV-006 — spec

## Rust（src-tauri/src/task_host.rs）

- `submit`：容量门禁从 text 独占改为全部请求（text/image/legacy image）——
  运行中 jobs 按 `credential_ref` 计数 >= `concurrency_limit` 时拒绝
  `capacity: 原生连接并发已满`，且发生在 journal 写入之前（无效连接零 POST）。
  jobs 在 `run()` 终态/取消时移除（既有行为），reload 不清空（原生进程持有）。

## TS（src）

- `providerRegistry.ts`：`markProviderConnectionFailure(id, failure, expected?)`
  与 `markProviderConnectionHealthy(id, expected?)` 增加可选身份快照
  `{ baseUrl?, credentialRef? }`；当前连接与 expected 不匹配时不写（返回原数组）。
- `App.tsx`：两处 health 回写（终态成功/失败、catch 失败）传入
  `task.providerBaseUrl` / `task.providerCredentialRef` 作为 expected。

## 测试

- Rust：image 容量拒绝（live native jobs 存在时 submit 返回 capacity:，
  journal 未写入）；text 容量回归。
- TS（providerHealthIdentity.test.ts）：expected 匹配正常回写；baseUrl 或
  credentialRef 变更的迟到回执不污染新配置（failure/healthy 双向）。
