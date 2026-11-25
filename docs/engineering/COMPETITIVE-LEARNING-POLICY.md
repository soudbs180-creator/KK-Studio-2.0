# 开源参考与接入

沿用 [R-OSS 归因记录](../../config/oss-attributions.json) 和 `npm run governance:check`。历史任务 `TASK-OSS-GOVERNANCE-RULE-20261111` 的许可与归因校验是本门禁的基础。

- 在引用上游前核对仓库地址、不可变提交、版本、原许可和依赖。静态借鉴以 `inspired` 记录。GPL、LGPL 与 AGPL 来源保留为受限参考。
- 新增实际 vendored 或 adapter 组件置于 `src/integrations/oss/<组件>` 或 `vendor/<组件>`，在同一归因记录的 `usedInModules` 中列出该目录。调用外部服务的内部协议客户端保留自身现有边界。
- 实际接入在同一记录增加 `admission`。必填 `commit`（40 位 Git SHA）、`version`、`provenance`、`licenseFile`、`dependencies`、`inputs`、`implementation`、`flows`、`ui` 和 `receipt`。文件引用采用 `{ "path": "仓库相对路径", "sha256": "64位哈希" }`。文本可显式加 `"text": true` 并按 UTF-8、LF 计算。无运行依赖时提交包含空依赖列表的真实依赖清单并锁定摘要。
- 许可证使用原许可文本及明确命名的 `LICENSE`、`COPYING` 或 `NOTICE` 文件。门禁对照声明的 SPDX 许可检查其特征文本，上游出处、许可适用范围、附加条款和兼容性由审查复核。组件目录内所有 Git 跟踪或未忽略的文件须列入许可、依赖或实现锁定集合。将运行收据、样本及产物置于组件目录之外，以便实现与运行记录分别复核。
- `provenance` 锁定隔离检出的 JSON 记录（`repoUrl`、`commit`、`version`、Git `tree`）。上游地址使用真实仓库，保留示例域拒绝准入。
- `flows` 列出每条流程的稳定 `id` 与 `cases`，每个计划用例指定全局唯一 `id`、锁定的 `input` 及 `compare`。门禁读取两侧输出，支持 `{kind:"bytes"}`、`{kind:"json",expected:...}`（可省略期望值）及 `{kind:"numeric-abs",maxDifference:...}`。结果取自输出和声明的比对条件。
- `receipt` 引用 JSON。`admissionFingerprint(record)` 计算 `admissionSha256`。`runs.upstream` 和 `runs.candidate` 各记录实际 `command`、`exitCode` 和锁定的 `log`。收据 `cases` 每项含 `id`、`input` 与不同文件的 `upstream`、`candidate` 输出引用。用例、输入与计划完整对应。
- `ui` 申报 `headless`（明确 `reason`）或 `interactive`（可见流程 `flows` 与受影响 `controls`）。控件 `notApplicable` 按状态写实际原因。交互型在收据 `uiEvidence` 中锁定浏览器或原生界面的结构化 `observation`。每项记录 `id`、`entryPoint`、`action` 和 `observed`，覆盖五种业务状态、适用控件六态、390/1099/1920 响应式布局及实际功能派发。标识及字段格式见定向测试。
- 离线门禁核对内容摘要、覆盖、受控比对及结构化观测。独立审查核对上游公开修订、检出及运行真实性、流程和参数覆盖、误差标准、UI 适用性与行为，并在任务台账绑定精确提交。
- 官方 `e4383a1e` 已纳入的三个 Infinite Canvas vendor 组件单独标记。历史豁免只适用于三个已命名且内容与该提交一致的目录，缺失 Git 基准时拒绝通过。Proxy 与上游审计参考有五项可复验的环回对照，独立来源和全产品对照仍为 PARTIAL。
