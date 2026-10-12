# TASK-PROV-006 — plan

1. 核对原生提交路径：App.tsx native 提交前 assertSubmissionConnection（skipCapacity）、
   task_host.rs submit 容量仅 text、health 回执按 id 直写。
2. Rust：submit 容量门禁覆盖全部请求；image 容量测试 + text 回归测试。
3. TS：markProviderConnectionFailure/Healthy 增加 expected 身份保护；
   App.tsx 两处回执传任务绑定身份。
4. 门禁：tsc、providerHealthIdentity/providerHealth/providerSubmission 单测、
   cargo test task_host。
5. 交付包五件 + 账本 PROV-006 更新（DONE/PARTIAL 按验证结果）+ 提交。
