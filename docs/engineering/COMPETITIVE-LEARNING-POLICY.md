# 开源参考与接入

沿用 [R-OSS 归因记录](../../config/oss-attributions.json) 和 `npm run governance:check`。历史任务 `TASK-OSS-GOVERNANCE-RULE-20261111` 的许可与归因校验是本门禁的基础。

- 在引用上游前核对仓库地址、不可变提交、版本、原许可和依赖。静态借鉴以 `inspired` 记录。GPL、LGPL 与 AGPL 来源保留为受限参考。
- 新增实际 vendored 或 adapter 组件置于 `src/integrations/oss/<组件>` 或 `vendor/<组件>`，在同一归因记录的 `usedInModules` 中列出该目录。调用外部服务的内部协议客户端保留自身现有边界。
- 实际接入在同一记录增加 `admission`。必填 `commit`（40 位 Git SHA）、`version`、`licenseFile`、`dependencies`、`inputs`、`implementation` 和 `receipt`。文件引用采用 `{ "path": "仓库相对路径", "sha256": "64位哈希" }`。文本可显式加 `"text": true` 并按 UTF-8、LF 计算。无运行依赖时提交包含空依赖列表的真实依赖清单并锁定摘要。
- `receipt` 引用 JSON。由 `scripts/governance/oss-attributions.mjs` 的 `admissionFingerprint(record)` 计算 `admissionSha256`。`runs.upstream` 与 `runs.candidate` 各记实际 `command` 与 `exitCode`。每个 `cases` 项记录唯一 `id`、已锁定的输入路径 `input`、`criteria`、不同文件中的两侧输出引用 `upstream` 与 `candidate`、`result`。准入要求这些对照片段均通过。原始运行、边界条件、预期拓扑或误差标准由独立审查复核。门禁检查本地内容与报告结构，产品结论以实际运行和独立审查为准。
- 官方 `e4383a1e` 已纳入的三个 Infinite Canvas vendor 组件单独标记。历史豁免只适用于三个已命名且内容与该提交一致的目录，缺失 Git 基准时拒绝通过。Proxy 与上游审计参考有五项可复验的环回对照，独立来源和全产品对照仍为 PARTIAL。
