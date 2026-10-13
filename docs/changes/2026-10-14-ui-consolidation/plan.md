# Plan

- Task ID: `TASK-UI-CONSOLIDATE-20261014`
- 本轮唯一可写工作树：`D:/kk-studio/.worktrees/branch-consolidation-20261011`，复用原干净 consolidation checkout；原 master ref 保留。不新增工作树、不操作原用户资料。

| 顺序 | 范围/文件 | 继续条件 |
| --- | --- | --- |
| 1 | 全 refs/worktree/dirty 清单、alternate-index recovery commits、Git bundle、主目录源码冻结 | 原 HEAD/index/status/hash 保持，bundle verify 成功；volatile 明示 |
| 2 | 当前日常 2.1.17 候选构建与源码包；本交付包、ledger、Project State/Handoff | 当前版本/typecheck/build/单测证据，源码输入与冻结快照相符 |
| 3 | 最新 main 的逐任务承接：PR55/56 与本机候选的内容映射；禁止粗合历史祖先链 | 新组合依赖/owned files 明确，不覆盖主线已审修复；当前 SHA 完整门禁 |
| 4 | tokens/shared buttons/inputs/model controls；UI_RULES、DESIGN-SYSTEM、DESIGN_TOKENS 的当前唯一规则 | 绿色/中性 Primary/胶囊/方形上传/克制 focus 的 RED→GREEN 与浏览器证据 |
| 5 | SettingsPanel/SectionData/Sections、ProviderPresetSelector/目录、CLI 状态 | 2/3栏与独立草稿保持；8协议官方研究；没有无效装饰按钮 |
| 6 | 标签候选按明确提交/文件提取；收藏兼容；卡片顶部动作；两个固定大小独立面板；搜索 | 原 favorite/liked/task/asset 身份保持；拖动、长文案、持久化和失效状态通过 |
| 7 | 资源库/存储/使用记录的真实只读统计与缺证据状态 | 原件去重计量，分页不伪装全库，真实路径/未知 token 诚实展示 |
| 8 | Desktop/Web 当前 UI 与生成链；Mobile 独立布局规格/适用验证 | 不以网页390px称原生Mobile；对应真实能力缺口独立入账 |
| 9 | 文档/目录/产物输入与体积守门；独立 exact-SHA review/交付 | 明确来源和体积预算；无源/数据/恢复证据丢失；Hosted/发布条件单列 |

已运行的普通历史 merge 产生大量 squash 同等代码冲突，已在本任务独立工作树撤销；不把 ours/theirs 整份选择当作合并正确性。下一阶段从当前 origin/main 按任务内容重建候选。恢复 `6a93dfe9` 已审历史 Agent/UI 证据只用于保持历史文档引用完整，不冒充本轮运行结果。

风险：当前源快照缺最新 main 工程门禁、标签新能力、多个进行中候选；不能称为“全分支稳定最新版”。新 UI 改动应在本机冻结版之后按本表继续，实际正式集成须采用最新 main 上的内容承接和组合验证。
