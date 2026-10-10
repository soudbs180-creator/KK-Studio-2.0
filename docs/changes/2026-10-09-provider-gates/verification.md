# TASK-PROV-006 — verification

## 实现

- Rust `src-tauri/src/task_host.rs`：`submit` 的容量门禁从 text 独占改为全部
  请求（text/image/legacy），运行中 jobs 按 credential_ref 计数 >=
  concurrency_limit 即返回 `capacity:` 且不写 journal；jobs 在 run() 终态移除
  （既有行为，reload 不清空）。
- TS `providerRegistry.ts`：`markProviderConnectionFailure` /
  `markProviderConnectionHealthy` 增加可选 `expected { baseUrl?, credentialRef? }`，
  身份不匹配时不写；`App.tsx` 两处 health 回执传入任务绑定身份。

## 验证结果

| 层 | 结果 |
| --- | --- |
| Rust `cargo test task_host` | 21/21 PASS（新增 image_capacity_rejects_with_live_native_jobs；text_capacity 回归通过） |
| TS `providerHealthIdentity.test.ts` | 5/5 PASS（expected 匹配回写；baseUrl/credentialRef 变更的迟到回执不污染；healthy 双向） |
| providerHealth + providerSubmission 回归 | 15/15 PASS |
| `tsc -b` | PASS |

## 验收对照

1. 同账号 image 提交前复查身份、禁用/隔离与容量，无效连接零 POST —
   PASS（浏览器 assertSubmissionConnection 既有；原生 submit 容量门禁覆盖
   image，超容在 journal 前拒绝 = 零 POST）。
2. 原生结构化失败正确回写当前账号 health，旧身份/迟到回执不污染新配置 —
   PASS（failure/healthy 均校验 expected 身份；身份变更回执被忽略）。
3. 原生进程持有运行容量，reload 不释放；取消/终态释放而不新增任务队列 —
   PASS（jobs map 在原生进程；run() 终态移除；未新增队列）。
4. unknown 保持禁止普通重试，已归档原件保留 — 未改动（T5 既有语义）。

## 限制

- 未跑完整 `npm run verify`；push/PR 受网络限制待 remote gate。
- 真实 Tauri fixture 全量验收（带生成请求的端到端）未在本轮执行，
  容量/身份保护以单元与回归测试覆盖。
