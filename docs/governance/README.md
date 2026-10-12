# 治理入口

本目录保存项目治理的索引和机器可读状态。先读 [`AUTHORITY_MAP.md`](AUTHORITY_MAP.md) 了解规则层级与领域权威，再按问题进入唯一来源。

- [`PROJECT_STATE.md`](PROJECT_STATE.md) 记录带日期的当前事实和验证边界。
- [`SPEC_BASELINE.md`](SPEC_BASELINE.md) 指向现行架构、数据、UI 与工程规范。
- [`task-ledger.json`](task-ledger.json) 是任务状态、负责人、依赖、验收和证据的机器权威；`TASK_LEDGER.md` 是生成视图。
- `docs/features/features.registry.json` 和 `docs/features/feat-*.md` 是产品能力状态的权威；`docs/features/README.md` 是生成看板。
- [`AI_HANDOFF.md`](AI_HANDOFF.md) 是安全恢复的最短入口；`KNOWN_ISSUES.md` 和 `MARKDOWN_AUDIT.md` 保存专项问题与链接审计。
- [`legacy-document-index.json`](legacy-document-index.json) 索引历史重复进度文件和旧 superpowers 计划，旧文件本身保留。
- [`docs/reference/competitor/INDEX.md`](../reference/competitor/INDEX.md) 是竞品与外部研究目录；关键词命中、负向诊断和本地集成证据不会被自动标为研究。

修改 `MEMORY-CONTRACT.md` 时，必须同时更新 [`MEMORY-GOVERNANCE.md`](../MEMORY-GOVERNANCE.md)、[`DATA-STORAGE.md`](../architecture/DATA-STORAGE.md)、FEAT-020 卡片与功能 registry、相关实现和测试；使用 `node scripts/governance/check-policy-sync.mjs --base <full-base-sha>` 对比 base 与 head 执行门禁。该门禁只检查文件同步，不替代真实运行验证。

功能行为变化仍需同步对应 `docs/changes/<date>-<task>/` 记录和 `docs/PROGRESS.md`。生成文件不要手改。
