# 文档入口

KK Studio 的文档按用途分层，当前工程的事实以代码、Figma 和验证记录为准。

- `architecture/`：运行时架构、数据存储和数据分级。
- [`architecture/LEGACY-MIGRATION.md`](architecture/LEGACY-MIGRATION.md)：旧工程能力的 keep/migrate/rebuild/reject 清单和 ProjectGraph 导入边界。
- `engineering/`：开发命令、AI-native SDLC 和评审规则。
- `changes/`：一次可审计的需求交付包，包含 intent、spec、plan、verification。
- `templates/`：后续需求使用的文档模板。
- `reference/`：Figma、截图和外部参考的索引。
- `archive/`：整合前进度和历史材料，只读保存，不作为当前状态。
- `governance/`：项目级当前状态、规范索引、任务账本、已知问题和 AI 交接；不重复 feature change evidence。
- `UI-ALIGNMENT.md`、`UI-STANDARDS.md`：当前 UI 还原与交互验收规则。

状态入口是 [`PROGRESS.md`](PROGRESS.md)。任何新功能在合并前都必须把实现和验证结果写回该文件。
