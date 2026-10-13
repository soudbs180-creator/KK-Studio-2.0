# Review：TASK-ENG-001 代码健康棘轮与 Windows 不安全模式扫描

- Task ID：TASK-ENG-001
- 审查对象：本分支相对 `origin/main`（`1f6cbd37091326a899fa600baba53bf6efd9cf16`）的全部改动
- 审查方式：AI 独立上下文复核 diff 与自测输出（逐文件重读 + 构造反例）
- 结论：**APPROVE with comments**——可合并；comments 均已在合并前修完或已登记为后续项

## 1. 改动清单

新增 7 个文件：

| 文件                                       | 行数 | 职责                                                           |
| ------------------------------------------ | ---- | -------------------------------------------------------------- |
| scripts/governance/code-health.config.mjs  | 90   | 唯一配置源：TARGETS / SCOPE / PATTERN_RULES / ENFORCEMENT      |
| scripts/governance/diff-scope.mjs          | ~156 | git 作用域：merge-base、变更文件、按修订读取、总开关读取、glob |
| scripts/governance/code-health-measure.mjs | ~436 | TS AST 度量：CC、函数行数、嵌套、体哈希、模式命中、allow 注释  |
| scripts/governance/code-health-compare.mjs | ~378 | 五通道单元匹配 + 裁决                                          |
| scripts/governance/footgun-rules.mjs       | 75   | 9 条 Windows 不安全模式规则表                                  |
| scripts/check-code-health.mjs              | ~205 | 棘轮 CLI（--base/--head/--report/--json）                      |
| scripts/check-windows-footguns.mjs         | ~185 | footgun 扫描 CLI（--all）                                      |

修改 5 个文件：两个 workflow（SHA 固定）、package.json（注册命令并入 lint）、docs/engineering/DEVELOPMENT.md（命令表 + 新章节）、task-ledger.json + TASK_LEDGER.md（账本登记）。

## 2. 设计层面的复核

### 2.1 做对了什么

- **棘轮而非门禁阈值**是这次移植最关键的选择。直接把 CC≤20/文件≤2000 设成blocking 会让存量 69 个超标函数 + 41 个空catch 立刻阻断所有 PR，实践中必然被整体关掉。以 base 实测值为每个单元的个体上限，是唯一能在不重写存量代码的前提下让债务单调下降的做法。
- **ENFORCEMENT 从 origin/main 读取**，防止分支自我放宽。如果从自己的提交读，任何人改一行配置就能让门禁失效，这个检查也就没有意义了。读不到时 fail-closed 为 blocking（工具失效不该等同于检查通过）。
- **退出码 2 与"无发现"分离**。度量工具自身崩溃时报 2 而不是 0，避免工具挂了就静默放行——这是 CI 门禁最常见的失效模式。
- **体哈希去自引用**，函数改名不换身份。否则重命名会被当成"旧函数删除 + 新函数新增"，新函数必须达标，开发者用改名绕过成本不合理。

### 2.2 明确的取舍（复核后认可）

- 相似度用归一化代码行集合重叠近似 difflib（阈值 0.6），未实现 v1 的行级存活匹配与跨文件迁移抵扣。影响方向是更严格，不会误放行；advisory 阶段无实质影响。
- 起始为 advisory。翻blocking 的时机应是 App.tsx 拆分完成、存量降到可接受区间之后，而不是现在。
- 放弃 JSON 输出开关但预留参数位。

## 3. 发现的问题

### 3.1 已修复（blocker 级）

| #   | 问题                                       | 为什么严重                                                                                                                                                      | 处理                                                    |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| R1  | `globToRegExp` 把 `**/` 译为"至少一级目录" | `src/**/*.tsx` 匹配不到 `src/App.tsx`。项目最大的文件（3152 行，唯一的 FILE_LINES 违规）在度量中完全不可见，report 显示"0 个超限文件"——门禁最大的目标被静默漏测 | 改为 `(?:[^/]*/)*`（零或多级），report 正确报出 App.tsx |
| R2  | 模式规则只报首行                           | 同一 rule+scope 出现 3 次只报 1 次，"修一个新增一个"可以绕过                                                                                                    | 按多重集指纹逐条报告各自行号                            |
| R3  | footgun 规则表自匹配                       | 扫描器扫描自己报 8 条 findings，上线即噪声，团队会习惯性忽略输出                                                                                                | 规则表移入独立文件并排除 `scripts/governance/**`        |
| R4  | 行数末尾多算 1                             | 与项目文档记录的 3152 不符，会引起"门禁数错了"的信任损失                                                                                                        | 末尾空串 pop                                            |
| R5  | `burnDown()` 硬编码阈值                    | 改config 目标后 report 文案与实际不符                                                                                                                           | 引用 `TARGETS`                                          |

R1 是最值得记录的一个：**测试数据"看起来对"和"真的覆盖到了"是两件事**。如果当时 report 输出恰好是空的，很容易直接认为"项目很健康"并收工。

### 3.2 已修复（lint 级）

ESLint 三处：`compare.mjs` 未使用的 `oldQual`、重抛错误未附 `cause`、`no-control-regex` 报 `/\u0000/g`（改用 split/join 重写 globToRegExp，放弃占位符方案）。另修复两处 `" ".join(...)` Python 语法混入 JS（只在 report 分支触发）和两处注释里的 `*/` 提前闭合块注释。

### 3.3 留给后续（不阻塞）

| #   | 观察                                                    | 处置                                                                             |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| C1  | `windows-release.yml` 的 `rust-toolchain@stable` 未固定 | 该文件不在 base（在未合并的 ui-redesign 分支），已登记后续，避免在此制造第二来源 |
| C2  | CODING-STANDARDS.md 缺新门禁条目                        | 同上，待 ui-redesign 合并后补                                                    |
| C3  | 相似度近似可能误判"移动并编辑"                          | 当前只会更严，且 advisory 阶段无门禁影响；翻 blocking 前需用真实 diff 校准阈值   |
| C4  | 度量只覆盖 TS/TSX，不含 Rust                            | 项目当前无Rust 源码；若后续引入需另配                                            |
| C5  | 存量 69 个 CC 超标函数                                  | 棘轮已冻结其上限；是否主动拆分属产品决策，非本任务范围                           |

## 主线承接复核补充（2026-10-13）

原 review 的 C1 结论绑定原始 base `1f6cbd37`，因此保留不变。当前候选基于 `origin/main@bcf55851d296c753d9610e86f1e32bf8db333a41`，已将全部 workflow action（含 `windows-release.yml` 的 `dtolnay/rust-toolchain`）固定到 commit SHA，并把健康/footgun 的 `--head` 读取绑定到指定 revision；C1 与 exact-SHA 结果需以当前候选的独立复审为准。

## 4. 对照hermes-agent 的偏离

| 偏离                        | 原因                    | 风险                             |
| --------------------------- | ----------------------- | -------------------------------- |
| 相似度改为集合重叠近似      | 不移植 difflib 行级匹配 | 移动+编辑的配对可能偏严（C3）    |
| 不做跨文件迁移抵扣          | 同上，只会更严          | 同上                             |
| 模式规则三条（hermes 更多） | 按本项目栈裁剪          | 覆盖较窄，但规则表可增量加       |
| 相似度阈值 0.6              | 未在真实大diff 上校准   | 需在翻 blocking 前用历史 PR 校准 |

## 5. 安全与供应链

- 新脚本仅读git 与文件系统，不写工作区、不执行被扫描代码、不访问网络。
- 规则表不读取任何凭据。
- Actions SHA 全部来自 GitHub API 实测 tag 值，未凭记忆书写；版本号保留在注释中便于人工比对。
- 未引入任何新依赖。

## 6. 结论

改动方向正确、边界清晰、失败模式（工具崩溃、规则被放宽、噪声自匹配）都被显式处理，且自测过程中发现的 5 个缺陷已全部修复，其中 R1 属于会静默削弱门禁的 blocker 级问题。建议合并，后续按 §3.3 逐项跟进。
