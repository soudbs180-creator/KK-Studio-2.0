# Intent：引入 hermes-agent 工程实践——代码健康棘轮、Windows 不安全模式扫描与 Actions SHA 固定

- Task ID：TASK-ENG-001
- 状态：IMPLEMENTED
- 日期与提出者：2026-10-12，用户（yckhw）
- 请求来源：用户提供 https://github.com/NousResearch/hermes-agent，要求"先不要修改我的代码，主要是分析这个库对我项目有没有什么帮助，尤其是需要增加项目的代码质量，还有功能等等"，随后指示"开始学习，和改进我的项目"。第一次分析结论（2026-10-12 对话）：无可复用代码（Python 产品 vs TS/Rust 项目），价值在工程实践借鉴。
- 用户授权范围与依据：用户授权"改进我的项目"；属已授权技术工作（AGENTS.md：普通已授权技术工作由 AI 写 intent/spec/plan 后自主执行）。范围为新增只读检查脚本、CI 供应链固定与文档同步；不含产品功能变更、不含对存量超标代码的机械重写。
- 关联账本、spec、plan：`docs/governance/task-ledger.json` TASK-ENG-001；本目录 spec.md / plan.md / verification.md / review.md。

## 领取与开工确认

- Owner / branch / worktree：root（AI 自主执行）/ `feat/TASK-ENG-001-code-health` / `D:/kk-studio/.worktrees/TASK-ENG-001-code-health`
- Base SHA / 当前 HEAD：base = origin/main = `1f6cbd37091326a899fa600baba53bf6efd9cf16`；开工 HEAD 同 base（新 worktree）
- 依赖任务、共享文件和并行写入者：无任务依赖。注意 `codex/ui-redesign-20261011` 分支携带未合并的 `docs/engineering/CODING-STANDARDS.md`、`DEVELOPMENT-WORKFLOW.md`、`TESTING.md` 与 package.json 版本 2.1.13；本任务 base 为 origin/main，不触碰该分支与其未提交改动。package.json 与 docs/engineering/DEVELOPMENT.md 为潜在共享文件，冲突在合并时于源分支解决。
- 基线检查与预存失败：见 verification.md（origin/main 基线上逐项记录）。
- 需求和验收标准确认时间/依据：2026-10-12 用户指示即授权范围；AC 由本 intent 转译定义。
- 当前状态：IN_PROGRESS → REVIEW（交付包与门禁完成后）。

## 用户原意

"先不要修改我的代码，主要是分析这个库对我项目有没有什么帮助，尤其是需要增加项目的代码质量，还有功能等等" → "开始学习，和改进我的项目"。用户看到分析结论后，要求把可借鉴的部分落地：重点提升代码质量，功能层只做思路记录不动手。

## AI 工程转译

目标：把 hermes-agent 的三个工程实践移植到本仓库（TypeScript/JavaScript + Windows-first 栈）：

1. **代码健康棘轮**：新代码必须达标（圈复杂度 ≤20、函数 ≤300 行、嵌套 ≤6、文件 ≤2000 行），存量代码只许变小；`health: allow <RULE> -- 理由` 行内豁免；ENFORCEMENT 总开关从 origin/main 读取，分支不能自我放宽；初始 advisory 不破坏现有 CI。
2. **Windows 不安全模式扫描**：grep 式规则表覆盖本项目脚本栈的 Windows 特有不安全模式，只扫变化文件，初始 advisory。
3. **GitHub Actions SHA 固定**：把 tag 固定的 action 改为 commit SHA + 版本注释，收敛供应链攻击面（hermes 在 litellm/tj-actions 事件后的政策）。

使用者：所有 AI 代理与人类贡献者；入口：`npm run health:check` / `npm run footguns:check`（已并入 `npm run lint`，advisory 不改变退出码）。数据与平台范围：仅仓库内静态检查，无用户数据、无网络、无运行时行为变更。

## 目标与非目标

- 预期结果：新增两个可复现的确定性门禁脚本与配置；CI action 全部 SHA 固定；DEVELOPMENT.md 记录语义与豁免语法；账本与交付包可追溯。
- 包含范围：`scripts/check-code-health.mjs`、`scripts/check-windows-footguns.mjs`、`scripts/governance/{code-health.config,code-health-measure,code-health-compare,diff-scope,footgun-rules}.mjs`；package.json 脚本注册与 lint 接线；`.github/workflows/{git-guards,quality}.yml` SHA 固定；`docs/engineering/DEVELOPMENT.md` 新门禁章节；账本条目；本交付包。
- 明确不包含：产品功能变更（FTS5 会话搜索、cron、subagent 等 hermes 功能思路仅记入 ledger 后续评估，不实现）；存量超标代码修复（App.tsx 3153 行、69 个 CC>20 函数、41 处空 catch 只出清单）；`codex/ui-redesign-20261011` 分支上的 windows-release.yml（rust-toolchain@stable）固定——不在本 base 上，列入后续；CODING-STANDARDS.md 门禁表合入——该文件在未合并分支上，合并后由后续任务补齐，避免第二来源。
- 受影响平台/模块：CI（quality/git-guards）、开发流程文档；不影响 Desktop/Web/Mobile 运行时。
- 已有实现和规范来源：hermes-agent CONTRIBUTING.md 与 scripts/code_health（MIT）；本仓库 AGENTS.md、SDLC.md、BRANCH-POLICY.md。

## 验收条件

| ID   | 用户可观察结果                                                                                                    | 技术证据/检查                                                                                                                   | 适用平台             |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| AC-1 | 改动超标新代码时 `npm run health:check` 能指出具体文件、行、指标与上限来源；行内 `health: allow` 可豁免并记录理由 | 自测：CC=26 函数被捕获、allow 注释豁免、AS_ANY/EMPTY_CATCH/FILE_LINES 三类规则均命中；退出码 0/1/2 语义正确                     | 全部（Windows 本地） |
| AC-2 | 存量代码不被误拦：ratchet 只评 base..head 变化文件，且 advisory 模式下 `npm run lint` 退出码不变                  | origin/main 全树 report 输出存量清单（App.tsx 3153 行、CC>20=69、EMPTY_CATCH=41）但不失败；`npm run lint` 含两个新检查且 exit 0 | 全部                 |
| AC-3 | Windows 不安全模式可被发现：对变化文件扫出规则命中并给出 fix 指引                                                 | 自测文件命中 SHEBEE/ONEDRIVE/SCHTASKS 等规则（规则表自匹配问题已通过排除 metadata 目录修复）；正式代码 0 findings               | 全部                 |
| AC-4 | CI 供应链面收敛：workflow 中 action 全部为 commit SHA + 版本注释                                                  | `.github/workflows/*.yml` grep 无 `@v4` tag；SHA 与 2026-10-12 tag tip 一致                                                     | CI                   |
| AC-5 | 门禁语义可查：DEVELOPMENT.md 记录命令表、棘轮语义、豁免语法、总开关行为                                           | markdown:check 通过；doc 命令引用与 package.json 一致                                                                           | 全部                 |
| AC-6 | 任务可追溯：账本登记、五件套齐全、门禁结果实录                                                                    | governance:check 通过；verification.md 绑定 SHA 与退出码                                                                        | 全部                 |

## 假设、风险和决策

- FACT（直接证据）：hermes-agent 为 MIT 许可的 Python 产品（253k stars，2026-10-12 API 数据），与本项目无代码复用可能；其 code-health ratchet 与 footgun 扫描器语义已在源码级研读（scripts/code_health/*.py、ts_units.mjs、check-windows-footguns.py）；origin/main 上 workflow action 为 tag 固定；origin/main 全树存量：598 个在范围文件、1 个文件超 2000 行、69 个函数 CC>20、41 处 EMPTY_CATCH。
- INFERENCE（假设及风险）：advisory 模式不会立刻暴露存量问题，存在"加了门禁但没人看输出"的风险——缓解：`--report` 清单 + ledger 后续任务；跨文件移动的模式命中不做抵扣（v1 简化），可能多报——已在 spec 记录；SHA 固定的 action 不会自动更新，需要定期 bump——已在 DEVELOPMENT.md 说明。
- UNKNOWN / CONFLICT：`codex/ui-redesign-20261011` 分支合并后 CODING-STANDARDS.md 门禁表需补两行——本任务无法在该 base 上验证，列为后续；无其他冲突。
- AI 自主决定的技术事项及理由：度量用 TypeScript AST（仓库已有 typescript 依赖，解析级不做类型检查，与 hermes ts_units.mjs 同口径）；相似度用归一化代码行集合重叠近似 difflib；模式规则取 EMPTY_CATCH/AS_ANY/CONSOLE_LOG(src) 三条；ENFORCEMENT 缺失时失败关闭（blocking）而非跳过。
- 必须由用户决定的产品语义/范围事项（无则写无）：无。advisory→blocking 的翻转时机建议由维护者在存量 burn-down 后决定，本任务不替用户决定。
- 外部条件、费用或不可逆动作及已有授权：无外部依赖、无费用、无可逆动作；仅本地文件与分支推送（用户授权范围内）。
- 不在本次范围的问题与账本 ID：hermes 功能层思路（FTS5 搜索、cron、subagent RPC、Honcho 用户建模）——记入本任务 ledger nextAction，另行评估；CODING-STANDARDS.md 门禁表合入——后续任务；windows-release.yml 的 rust-toolchain 固定——后续任务。

## 主线承接补充（2026-10-13）

以上范围与“不在本次范围”记录以原始 base `1f6cbd37` 为历史意图证据保留。当前 PR #56 按最新 `origin/main@bcf55851d296c753d9610e86f1e32bf8db333a41` 重建时，主线已包含 `auto-merge.yml`、`main-guard.yml`、`windows-release.yml`；为使 AC-4 对当前候选仍然成立，本次承接将全部 `.github/workflows/*.yml` action 固定到 commit SHA，并将 `dtolnay/rust-toolchain` 的 `stable` 固定为 `e2a55d2ffb04f378e9626c28d38b36d230d1e12f`。这不是产品功能扩展，而是对同一供应链验收条件的主线适配。

本次承接还让 `--head` 的健康/footgun 检查真正读取指定修订，并对不存在的 revision 失败关闭；原始验证记录不被改写，新的 exact-SHA 结果以当前候选 delivery 与独立 review 回执为准。
