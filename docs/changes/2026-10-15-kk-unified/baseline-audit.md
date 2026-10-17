# 未核准的外来审计草稿（来源 UNKNOWN）

2026-10-15 21:00 集成勘误：本文件在并行实现期间出现，来源尚未确认；项目、依赖与12AI实现者均确认未写入。本文件曾随69929f55目录暂存被误纳入，集成人已纠正其权威状态。以下正文保留原字节作为草稿证据，**不能作为已验证事实或行动授权**；当前权威为同目录 spec.md、plan.md、verification.md 和实际 Git/任务账本。

已知不可信项包括：旧134任务/36功能数字（当前147/37）；分支祖先/领先关系与版本表未有原始命令证据；retries配置1不能反证某次首轮零重试；正文提出的废弃状态枚举、证据清理及修改其他工作树不在本任务新增授权内。原方案已批准实施，无需按正文“等用户明示”重新索取形式批准。未执行该草稿提出的删除、外树修改或新建重复规则。

---

# 阶段 0 · 整理基线（只读核对结论）

状态：BASELINE VERIFIED（只读） / 变更未执行。核对时间 2026-10-15，仓库 `D:/kk-studio/KK-Studio-2.0`。本文档所有数字来自 git 与治理台账实测，标注「推测」的条目需人工确认。

## 1. 实施基线认定

| 项 | 方案声称 | 实测 | 结论 |
|---|---|---|---|
| 代码基线 commit | `235e7f7` | `235e7f79` =「fix(ui): 默认 Codex 账号并统一模型选择与输入框布局 (#60)」 | 一致（用户日常只读工作区） |
| 版本 | Desktop/Web 2.1.33 | `235e7f79:VERSION` = 2.1.34；`origin/main(d95e4c44):VERSION` = 2.1.34 | **方案版本号偏低**：2.1.33 与 2.1.34 都不是当前值，需在 spec 更正 |
| 隔离分支 | `codex/TASK-KK-UNIFIED-20261015` | 存在，HEAD `d95e4c44` = `origin/main`，领先 main 7、落后 128 | 一致，工作区已就位 |

分支关系（实测 `git rev-list --left-right --count`）：

| 引用 | HEAD | VERSION | 与 main 关系 |
|---|---|---|---|
| `origin/main` | `d95e4c44` | 2.1.34 | main 落后 128 / 领先 7 |
| `main`（本地） | `1d8ae2a0` | **2.1.13** | 落后 origin/main 128 |
| 当前主仓检出 | `51fccfc7`（`codex/ui-redesign-20261011`） | 2.1.24 | 工作区脏，见 §3 |

**裁决**：唯一可执行基线是 `origin/main = d95e4c44 / 2.1.34`。本地 `main`（2.1.13）与主仓当前检出分支（2.1.24）均为落后引用，**不得**作为合并目标或验证对象。方案正文「本轮核对源码为 2.1.33，235e7f7」需更正为 `d95e4c44 / 2.1.34`，并注明 `235e7f7` 是其祖先。

## 2. 旧任务归并（task-ledger.json 实测）

台账总数 **134** 项；status 分布 DONE 81 / PARTIAL 32 / TODO 12 / REVIEW 4 / BLOCKED 4 / IN_PROGRESS 1 → 未关闭 **53** 项。verificationResult：PASS 82 / PARTIAL 34 / NOT_VERIFIED 17 / FAIL 1。

与本方案相关的既有任务映射：

| 方案范围 | 归并到的既有任务 | 状态 | 处置建议 |
|---|---|---|---|
| 配置保存/模型接入（四渠道） | TASK-ATELIER-STORAGE-20261014、TASK-CCSWITCH-LEARN-20261014、TASK-PROV-005 | DONE/PASS（10-14，覆盖 PROV-005 语义） | 以 10-14 两条为基线，PROV-005 标记 superseded-by，不重做 |
| 模型选择器/设置页 | TASK-SETTINGS-UI-20261015、fix/TASK-UI-EXT-001-settings-split | IN_PROGRESS / 未合并（领先 1） | SETTINGS-UI 为主；EXT-001 仅取布局拆分增量 |
| 响应式 | TASK-RESPONSIVE-UI-001（候选 `codex/TASK-RESPONSIVE-UI-001-current`） | 未合并，领先 main 10 | 见 §4 候选复用 |
| 图片压缩 | PERF-001 + `fix/TASK-IMAGE-COMPRESS-20261015`（`970d0b5e`） | PERF-001 PARTIAL | 取 `970d0b5e` 产品增量，PERF-001 剩余项（永久缩略图/可抢占 IO）另立 |
| 项目库/分组/改名 | TASK-PROJECT-SIDEBAR-001、`feat/TASK-UI-009-sidebar-project-groups`（已合并但工作区脏 26 项） | PARTIAL | 见 §3 风险 |
| Codex 恢复/暂停继续 | TASK-AGENT-RECOVERY-20261013、TASK-AGENT-001、#63 (`d95e4c44`) | PARTIAL / 部分已进主线 | #63 已含首页重试与冷重开，勿重复 |
| 本地服务/ComfyUI | TASK-LOCAL-SERVICE-001、`fix/TASK-COMPANION-RECOVERY-003-preserve-originals` | 已合并 / 未合并（领先 6） | 后者含 localServiceRecovery 测试 651 行，未合并且工作区有同源未提交改动 |
| 垃圾箱/找回 | **无任何任务与 feature 覆盖** | — | 全新增，须先立 feature 与任务再实现 |
| 云同步/登录 | FEAT-017 账号与登录 = PROTOTYPE、FEAT-019 云端保存 = PARTIAL | — | 视为新建，不得按既有完成度记账 |

台账缺陷（事实）：status 枚举**无 CANCELLED/ABANDONED/DEPRECATED**，因此无法表达「废弃」，这是归并必须先补的字段；134 项中 **53 项无 feature 归属**；`KNOWN_ISSUES.md` 49 条比未关闭任务少覆盖 9 条。

Feature 分布（features.registry.json）：36 个，PARTIAL 27 / PROTOTYPE 5 / REAL 2 / PLANNED 2，STUB 0。REAL 仅 FEAT-001 创作画布与 FEAT-014 素材库。

## 3. 冲突规范（必须先立的规则）

| 冲突热点 | 实测 | 规范 |
|---|---|---|
| `docs/governance/task-ledger.json`、`TASK_LEDGER.md`、`PROJECT_STATE.md` | 在 KK-UNIFIED、CODEX-REF、UI-009、UI-EXT-001、UI-SWITCH 等 5+ 个 worktree 同时被改 | **台账单写者**：只有 TASK-KK-UNIFIED 分支可写治理三件套；其余分支改为只读引用，需改台账时提交 patch 段落由集成者合并 |
| `VERSION` / `config/platform-versions.json` / `package.json` / `tauri.conf.json` | 在 CODEX-REF、ATELIER-STORAGE、ATELIER-NETWORK、UI-SWITCH 同时被改 | **版本单写者**：仅集成者在合并窗口改版本号；候选分支不得携带版本文件变更 |
| evidence / `*.log` | `git ls-files` 命中 2300 个，其中 `docs/**/evidence/` 2181 个 | 新证据默认不入库（写 `.tmp/`）；确需留档的先经集成者批准，避免单次 diff 膨胀到 10 万+ 行 |
| GitHub Actions pinning | `TASK-AGENT-UX-20261014-execution-delivery` 工作区把 `quality.yml` 等由 pinned SHA 改回 `@v4` | 与 `TASK-ENG-001 (#56)` 既定方向冲突，**视为违规，回退**；门禁以 origin/main 版本为准 |
| 脏工作区残留 | 主仓 256 项未提交；ATELIER-STORAGE/NETWORK 各 891/898 项；UI-009 26 项真实源码改动（Sidebar.tsx 等） | 任何 `git worktree remove` 前必须先落盘或导出 diff；当前**零删除** |

## 4. 候选检查结论

| 候选 | 归属分支 | 领先 main | 是否在 origin/main | 处置 |
|---|---|---|---|---|
| `970d0b5e` 图片压缩 | fix/TASK-IMAGE-COMPRESS-20261015 | 7 | 否 | 取产品增量（自动压缩+保留原件） |
| `baa117af` `f22f2b68` `3b294c12` `2ea7639f` `68d46984` | codex/TASK-RESPONSIVE-UI-001-current | 10 | 否 | 取响应式与手机 sheet 锚定增量 |
| `cbda65e4` #59 | 与 CODEX-REF 同 HEAD 组 | — | 否（已并入 d95e4c44 链） | 已在主线，不重复取 |
| `694a0060` #56 | ATELIER-STORAGE/NETWORK/UI-SWITCH 三分支同 HEAD | 2 | 否 | pinned Actions 基线在 #56，三分支工作区改动属回退违规 |
| `76339c9f` UI-009 | 已合并 main | 0 | — | 已合并；其 26 项未提交源码需单独确认去留 |
| `004e7149` COMPANION-RECOVERY-003 | 未合并 | 6 | 否 | localServiceRecovery 测试与实现，有价值，需拣选 |
| `d95e4c44` #63 | origin/main HEAD | — | 是 | 基线本身 |

**重复 HEAD 组（12 组 / 29 分支）**：G1 `435ed365`(4)、G2 `694a0060`(3)、G3 `51fccfc7`(3)、G4 `1d8ae2a0`(3，含 main)、G6 `cbda65e4`(2)、G8 `8826ece7`(2)、G9 `80904759`(2)、G10 `76339c9f`(2)、G11 `7446929f`(2)、G12 `38cf940a`(2)。这些是后续清理的候选，但现在**不动**。

## 5. 测试产物与运行资源隔离

| 项 | 实测 | 判定 |
|---|---|---|
| `test-results/` | 125 MB，已被 `.gitignore:6` 忽略，`git ls-files` 跟踪数 0 | 产物不入库，符合预期；**清理需用户确认，不自动删** |
| `output/`、`.tmp/`、`dist/` | 均已忽略，跟踪数 0 | 符合预期 |
| evidence 入库 | 2181 个 `docs/**/evidence/` 文件被跟踪 | **矛盾点**：运行产物的一部分进了版本库，是 diff 膨胀主因 |
| 端口隔离 | `playwright.config.ts` 固定 1423、`--strictPort`、`reuseExistingServer:false`、加载前拒绝非 1423 的 `KK_TEST_PORT` | 隔离机制成立（`TASK-VERIFY-ORIGIN-003` 已关闭） |
| 重试次数 | `playwright.config.ts:13` 实为 `retries: 1`，但 `TASK-VERIFY-CONCURRENCY-002`、`TASK-DESKTOP-FLUSH-001` 正文声称 **retries=0** 全绿 | **记账与代码不符**，相关「retries0 全绿」结论当前不可复现，需重跑取证 |
| 并发根因 | `TASK-VERIFY-CONCURRENCY-002`：当前 SHA workers 1/2/4/8/12 均 447/447 PASS，历史 9 个 flaky 未复现，**根因仍 UNKNOWN** | 不得称已修复；关闭条件是同 SHA 托管 CI + 独立复审 |
| 残留 UI 失败 | `TASK-REVIEW-REMEDIATION-001` 记 5 个失败、`TASK-UI-CLASSIFY-20261013` 记 3 个，均停在 REVIEW | **推测**：同一批失败的不同快照，需实跑一次对齐真实数量 |

## 6. 待确认清单（等用户明示后才执行）

| # | 动作 | 类型 | 影响面 | 风险 |
|---|---|---|---|---|
| P0-1 | 更正 spec/intent 的基线为 `origin/main d95e4c44 / 2.1.34`，注明 `235e7f7` 为祖先 | 文档 | 仅 TASK-KK-UNIFIED worktree | 无 |
| P0-2 | 台账增补 `supersededBy` 字段与状态枚举，登记 PROV-005 ← CCSWITCH-LEARN/ATELIER-STORAGE | 结构 | task-ledger.json 单一写者 | 中（多分支引用同一文件） |
| P0-3 | 写入「台账/版本单写者 + evidence 默认不入库 + Actions pinning 以 main 为准」三条冲突规范 | 文档 | UNIFIED-PROJECT-RULES.md | 无 |
| P0-4 | 实跑一次 browser/verify，取当前真实失败数，替换「5 个 / 3 个」推测 | 执行 | 隔离工作区，端口 1423 | 中（长时任务，占资源） |
| P0-5 | 复跑 `TASK-VERIFY-CONCURRENCY-002` 于 d95e4c44 真实 retries 配置并更正记账 | 执行 | 同上 | 中 |
| P1-1 | 清理 `test-results/` 125 MB 与 `.tmp/` 30 MB | 删除 | 仅被忽略的本地产物 | **需用户逐项确认，不自动执行** |
| P1-2 | 归并候选增量（970d0b5e + 5 个响应式 commit + COMPANION-RECOVERY-003） | 代码 | 隔离分支 | 中 |
| P1-3 | 回退 ATELIER 系列工作区中的 Actions `@v4` 回退 | 代码 | 3 个 worktree 工作区 | 中 |
| P2-1 | 115 worktree / 183 分支 / 12 重复组 的收敛 | 结构性 | 全仓 | **高，需单独方案与授权** |

未执行任何修改、删除或合并；未运行真实生成、登录、云恢复。