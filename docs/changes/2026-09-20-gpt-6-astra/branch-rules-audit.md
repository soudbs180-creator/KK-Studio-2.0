# TASK-ASTRA-001 分支、规则与同步审计

审计日期：2026-09-20。范围是本次 Astra 计划校正、文档提交和 GitHub 同步的全部适用规则，不代表整个产品所有功能已验收。

## 已确认的仓库边界

| 位置                                              | 分支/提交                                          | 用途与处理                                                        |
| ------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| D:/kk-studio-next                                 | codex/desktop-data-stability@609f524               | 原有大量 dirty 的保留现场；不切分支、不 stage/reset/clean/stash   |
| D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001 | main@80544af                                       | 当前稳定集成主线，审计时干净；不直接开发或推送                    |
| Codex 原生工具登记的 task-astra-001 worktree      | docs/TASK-ASTRA-001-migration-plan，基于 80544af   | 本次唯一写入位置；准确绝对路径记录在 ledger                       |
| GitHub soudbs180-creator/kk-studio                | main@931e205；另有 v0/yinchenkang0-1635-ca28d8c2   | 旧 1.6.1 monorepo，用户明确排除为本次 2.0 目标                    |
| 用户选择的新 2.0 仓库                             | https://github.com/soudbs180-creator/KK-Studio-2.0 | origin 已明确为该 URL；先在远端 main 上准备文档清单，不写本地整库 |

本地 main 比原 checkout 的 HEAD 多 34 个提交。master 与原工作分支同为 609f524，已是 main 祖先，不能再把 master 当更新主线。d894779 是最近 TaskHost 实现提交；之后到 80544af 仅为文档更新，原有 release 证据仍归属于其实际验证范围。

本次使用 Codex 原生 worktree 工具，登记在同一 Git common directory 下；工具把目录放在 Codex 管理路径。该路径显式记录在账本，不是第二个 Git 仓库，不覆盖 ADR 中已有项目内 worktree。所有命令显式指定本次目录。

## 适用规则核对

| 来源                                             | 要求                                                                | 本次处理                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| AGENTS.md / CONTRIBUTING.md                      | main 稳定；task 分支；单一逻辑目标；禁止普通 direct push/force push | docs/TASK-ASTRA-001-migration-plan，只涉及计划和治理文档         |
| AGENTS.md / ADR-001、ADR-002                     | 保护 dirty 原件/index；先核对 source、worktree、任务                | 从已整合 main 起步；未复制原目录代码；两项独立只读审计           |
| docs/governance/README.md、SPEC_BASELINE.md      | 当前事实优先且不得冒充已批准规范；显式记录冲突                      | 区分旧初稿、当前主线、旧远端；修订 Desktop/Web 和 T3b/T4/T5 事实 |
| task-ledger.json / scripts/governance/ledger.mjs | Owner/Branch/Worktree、依赖、证据、状态可追踪；视图生成             | 新增 TASK-ASTRA-001；governance:write 生成 TASK_LEDGER           |
| docs/engineering/SDLC.md、REVIEW.md              | intent/spec/plan/verification；工程/恢复/失败路径审查               | 四份计划文档完整；补齐项目包、unknown、快照回滚风险              |
| CONTRIBUTING.md、DEVELOPMENT.md、package.json    | npm ci；lint/typecheck/test/build；完整 verify；client:check        | 无 docs-only 豁免，本轮按此执行，结果单列 verification           |
| .github/PULL_REQUEST_TEMPLATE.md                 | task、范围、验收、测试、风险、文档和凭据边界                        | 准备同结构 PR body；目标仓库明确后核对其模板                     |
| .github/workflows/quality.yml                    | docs 分支 push、PR、merge_group 完整检查                            | 本地有配置；尚无新目标 CI 实跑证据，不能等同托管保护             |
| UI/Figma、运行态规则                             | UI 改动须同状态视觉验收、三种 runtime 分开                          | 本次仅文档，UI 修改验收不适用；完整 verify 内浏览器回归仍执行    |
| 数据/密钥规则                                    | 凭据不进代码、URL、日志、快照和导出                                 | 本轮不读取/使用 provider 密钥，不同步运行数据                    |

未发现 docs 范围的嵌套 AGENTS 或本地 CODEOWNERS。没有强制签名提交规则，也没有本地 hooks 配置；不能声称所有 Git 规则已经由工具强制执行。

## 冲突和自动检查缺口

1. 原根目录 AGENTS/PROGRESS 旧于 main。当前任务遵循较新的 main 规则，不把旧规则覆盖回主线。
2. README/DEVELOPMENT 的原目录和 npm install 示例落后于 CONTRIBUTING 的隔离/npm ci 要求。本任务使用当前隔离目录，不触碰原目录。
3. PROJECT_STATE/AI_HANDOFF 的“当前提交 d894779”已在本任务文档中区分为最近实现提交与当前 main 文档 HEAD。没有重标历史验证为本轮结果。
4. ledger guard 能检查活动任务分支/worktree 冲突和依赖环，不能检查实际 checkout、branch 命名、staged 白名单、主线禁写，也不覆盖所有 PARTIAL 任务。提交前另作显式检查。
5. 多条历史 task 分支不是 main 的祖先，这不等于未集成；项目使用 squash，T3b/T4/Provider 等已有集成证据。不得仅凭 ahead/behind 再次 merge。此次不删除、重命名或重推任何历史分支。
6. 现有 quality workflow 不是 GitHub ruleset。旧仓库 branches API 显示 protected=false、rulesets 返回空数组；classic protection 详情被插件权限以 HTTP 403 拒绝。用户已排除旧仓库，未改其配置。

## 新目标到达后的精确同步步骤

1. 核对新 URL 对应的 owner/repo、可见性、默认分支、权限、HEAD、已有 PR、适用 AGENTS/贡献规则/模板/workflow、rulesets 和 classic protection。仅校验不会更改仓库。
2. 用明确名称设置该目标 remote 并 fetch，不使用猜测 origin，不使用 pull 自动合并；比较两条历史的 merge-base 与目标分支差异。
3. 若目标已有兼容的 2.0 基线，只推本任务分支并创建一项文档 PR。若远端为空，或历史不相干，则先准备明确的主线初始化/基线接入方案；它是独立于文档 PR 的操作，不能把整套本地历史伪装成一个文档差异。
4. 每次 push 使用明确 remote 和完整 refspec；禁止 --all、--mirror、--force、直接推 main 或批量删除分支。建立 upstream 后复核 remote SHA 与本地提交一致。
5. PR 必须检查 base/head 和文件白名单；不自动合并。托管 required checks、阻止 force/delete、实际 CI 证据独立验收，未证实则 EXT-GIT 保持未完成。
6. 本轮目标仓库已读到 main@f00b5a4，但与本地 main 无共同基线；GitHub 同步只允许从 origin/main 派生独立文档分支，远端 commit 回读后再考虑 PR。未上传本地应用源码，未声称主线已合并。

## 明确的本次文件白名单

- docs/changes/2026-09-20-gpt-6-astra/ 下的计划、审计和交付文档。
- docs/governance/task-ledger.json 与生成的 TASK_LEDGER.md。
- docs/governance/PROJECT_STATE.md、AI_HANDOFF.md。
- docs/PROGRESS.md。

应用源码、配置、依赖锁、二进制、自动改写的旧截图/浏览器报告均不得进入本次提交。验证产生的旧 evidence 只在本次隔离工作树中恢复，不处理原目录的文件。

## 分阶段目录规划

目标仓库当前是 v1.6.1 monorepo；KK Studio 2.0 在兼容性审查完成前不覆盖既有 apps/web、packages/* 或 services/*。阶段 0 只提交 docs/migrations/kk-studio-2.0/ 下的迁移清单与 Astra 计划。阶段 1 才在独立前缀下引入 apps/kk-studio-2.0/web/（本地 src/、public/ 的筛选子集）与 apps/kk-studio-2.0/desktop/（本地 src-tauri/ 的筛选子集）；阶段 2 再按依赖抽取 packages/kk-studio-2.0-shared/ 与 tests/kk-studio-2.0/。每阶段都有 manifest、secret/path 扫描、构建和 PR，禁止一次性复制根目录。

## 阶段 0 远端回读

- 从远端 https://github.com/soudbs180-creator/KK-Studio-2.0 的 main@f00b5a4 建立 docs/TASK-ASTRA-001-remote-manifest，只含 docs/migrations/kk-studio-2.0/ 白名单。
- 已推送并回读远端 commit：`9edb5281b5d9d8a77586136ef570973fc28c67fd`。分支浏览：https://github.com/soudbs180-creator/KK-Studio-2.0/tree/docs/TASK-ASTRA-001-remote-manifest
- PR 尚未创建或合并；审阅入口：https://github.com/soudbs180-creator/KK-Studio-2.0/compare/main...docs/TASK-ASTRA-001-remote-manifest?expand=1
- 未推送本地 `docs/TASK-ASTRA-001-migration-plan`，因此没有把本地主线历史带入目标仓库。

- Git fetch/push 在当前凭据下可用；匿名 GitHub REST 的 repository、branches、rulesets、pulls 返回 404，classic protection 返回 401，因此仓库可见性、写权限范围、required checks 与分支保护不能据此确认。

## main 树同步候选

- 本地 455078d 与云端候选 7bdac9d 的 tree SHA 均为 b217fcf404020cc034e1fc7aaa53ef8366d5f998，因此候选文件树逐 blob 一致。
- 云端候选分支：chore/TASK-KK2-MAIN-SYNC；它以云端 main@f00b5a4 为父提交，未使用 unrelated-history merge、force push 或 direct main push。
- 候选 PR：https://github.com/soudbs180-creator/KK-Studio-2.0/compare/main...chore/TASK-KK2-MAIN-SYNC?expand=1。只有 PR 合并并回读云端 main 后，TASK-KK2-MAIN-SYNC 才能从 IN_PROGRESS 关闭。
- GitHub REST 元数据仍受 404/401 限制；visibility、required checks、branch protection 和合并权限保持 UNKNOWN。
