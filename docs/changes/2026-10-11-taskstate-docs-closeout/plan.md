# Plan：TASK-DOCS-HISTORY-001 最小收口

1. 读取 `docs/governance/MARKDOWN_AUDIT.md` 和账本中的原始 37 项分类，确认源文件与历史提交。
2. 只修复当前仓库能证明存在的 29 个文件目标：归档链接改为 `../evidence/release-2026-09-09/`，源码/脚本链接去除不可验证的当前行号，并保留历史行号文本。
3. 对 8 个日志链接检查 Git tracked 状态和当前工作树状态；不添加被忽略的日志副本。
4. 运行 `node docs/changes/2026-10-11-taskstate-docs-closeout/check-docs-history.mjs --write`，保存逐项 JSON 清单与来源提交。
5. 由父任务将结果同步到 TASK-DOCS-HISTORY-001 账本；独立审阅完成前保持 REVIEW/PARTIAL。
