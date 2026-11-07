# 主线同步门禁修复计划

1. 复用工作树的测试在脱离分支时临时挂上分支名，断言结束后恢复脱离状态。
2. 补齐两套缺文档的历史变更包，并新增一条本分支任务，证据指向所有新增变更包的验证记录。
3. schema 同步先按换行归一化比较，内容相同则不写文件。
4. 本地跑失败的单测、交付检查和治理检查，再推到审查分支重跑 GitHub 三项检查。

## 2026-11-06 主线收口续验

- [x] 只读核对 main / origin/main / 全部 worktree / dirty / 未推送提交及 PR #83 当前 HEAD；保留全部分支与旧数据。
- [x] 根据 quality 42232887750 的 format:check 日志格式化六文件；补本地五文件换行和cargo fmt明确指出的三文件格式。未改行为/门禁；复用现有审查分支。
- [x] 全量建立开放 PR、89 个远端分支与 main / origin/main / #83 的包含关系；独有提交保留，不执行合并或删除。
- [x] 核对现有 222 项任务与第二阶段、六支柱源码证据；当前事实写回 PROJECT_STATE、task-ledger 和 AI_HANDOFF，历史记录追加勘误。
- [ ] 04 设置 / 05 手机端按当前 Figma 读取 → 本地映射 → 浏览器 / Native 验收；读保护与迁移失败原件保留。
- [ ] 运行现有完整 verify、相应原生门禁及当前 SHA 独立审查；推送现有审查分支后核验 Hosted。用户未授权本轮合并、删除或发布。

### 2026-11-07 独立审查门禁修复范围

独立审查确认 `check-ui-standards.mjs` 的 `maxLines` 覆盖了 RULE-READ-FIRST 的 300 行硬限制，且未登记 CSS 的 rawPx 没有默认零预算。先恢复硬限制并增加反例测试，再按现有职责拆分 AgentFoldbackCard、CanvasNodeItem、ProviderModelCatalog、ProfileUsagePage；仅迁移存量颜色/行内样式豁免，累计预算不得增加。标题栏现有 37/19px 须读取当前 Figma 后使用现有或等值派生 Token；SVG stroke 的单位乘法按 SVG 语义处理。不得更改 UI 布局、数据或公共接口，不放宽任何基线。该修复完成后重新完整验证，上一轮绿色不能替代最终源码验收。
