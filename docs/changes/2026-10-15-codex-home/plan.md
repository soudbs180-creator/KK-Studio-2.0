# 首页默认Codex与模型选择分流 Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans for the assigned tasks. 本轮用户已授权并行实施，按下列唯一文件owner执行。

- Task ID：TASK-CODEX-HOME-20261015；状态：REVIEW；整体NOT_VERIFIED；2026-10-15。
- Goal：让首页默认Codex账号能力且各入口按显式来源执行，修复输入/动作/弹层并经真实验证后PR集成和本机重建。
- Architecture：复用现有选择与Agent/Provider执行层，来源字段决定路由；共享组件负责几何，不重建第二套状态。
- Tech Stack：既有React18、TypeScript、Vite、Tauri2、Node24，不新增依赖。
- Spec：[spec.md](spec.md)；[intent](intent.md)、[verification](verification.md)、[review](review.md)。
- Owner：root；branch：`fix/TASK-CODEX-HOME-20261015`；worktree：`D:/kk-studio/.worktrees/branch-consolidation-20261011`。
- Base/开工HEAD：`cbda65e4389fc807769a8faf7654892415992589`；目标`origin/main`，新head待提交。

## 开工证据

- 已读AGENTS/AI_RULES、PROMPTING、SDLC、BRANCH-POLICY、REVIEW、CODING-STANDARDS、TESTING、UI_INDEX/UI_RULES、治理与功能卡。
- 已核对`StartPage → StartComposer/StartModelPicker → ModelPickerMenu`、App创作入口、creation/model与Agent来源链；实现者在各自owner范围继续精读。
- 分支创建前clean/main；root基线typecheck、version:check PASS。文档owner基线governance139/0、features37/0、Markdown122/0、snapshot3/0。
- 新creation回归root20PASS/1FAIL、实现者15PASS/1FAIL是当前缺少Codex选择归一化字段的有效RED；不标PRE-EXISTING FAILURE。
- 1421/1423和官方Native由root统一协调；文档owner不占端口、不启动客户端。不触碰primary并发dirty/index。

## Global Constraints

- 新首页缺省Codex图片能力；旧API/无selection项目保持原路由，来源切换不串稿。
- 画布显式Codex/API继续按`generationSource`分流，Codex经`Agent.generateFromCanvas`。
- 局部隐私、审批、附件、取消、unknown和原件/CAS保护不减弱；秘密不入证据。
- root先统一脚本递增Desktop/Web至2.1.32并通过version:check；当前版本源已为2.1.33，最终候选运行态待验。旧candidate2仍按实际2.1.32记录，Mobile2.1.1不变。
- 真实图片型号未报告时如实显示，不用账号文本默认型号代填。

## Review Focus

- 旧项目没有selection时，读取或重开不得被新首页默认值迁移。
- API与Codex有同名模型/不同连接时，真实请求仍绑定明确来源和连接。
- local-only或运行/unknown状态不能因新入口或双击/Enter绕过门禁。
- 窄/短屏、长模型名、滚动和IME时，动作、菜单、焦点及草稿仍可用。
- 延迟结果、取消及切换项目后，素材只归正确项目且只创建一个节点。

## 实施顺序与唯一owner

| 步骤 | Owner/文件 | 改动与完成条件 | 验证 |
| --- | --- | --- | --- |
| 1 | 文档owner；本包、治理、相关功能卡 | 认领、契约、前置闭环与范围完整；生成视图同步 | 文档/账本/功能/历史对象保全 |
| 2 | v29_source_review；`src/domain/modelSelection.ts`、`src/features/creation/model.ts`、`StartPage/StartComposer/StartModelPicker`及Agent路由/相应unit | 新首页缺省及显式来源路由；旧项目/无selection/local-only保全 | 有效RED后定向GREEN；AC-1/2/4 |
| 3 | root；`src/components/ModelPickerMenu.tsx`及其测试 | 按入口能力展示选择；量测、锚点、视口、键盘行为成立 | 菜单真实命中与overflow/scroll回归 |
| 4 | native_cli_visual；输入/动作相关CSS、hooks、对应browser测试 | 390/1099/1920同排、无额外横线、长名与焦点保持 | 旧dist有效RED→新production GREEN；AC-3 |
| 5 | root整合；版本、全量检查与运行态 | 当前官方EXE与bundle；真实文本/单图/保存重开；source与数据身份 | 完整verify、Native/Rust、DOM/截图/原件hash |
| 6 | 新独立reviewer、root | 精确SHA审查、Hosted无隐藏失败、普通PR/main、本机重建 | 原始报告/receipt、合并后SHA与实际进程 |

- [ ] 任务2–4的有效RED及修复后结果分别冻结；不得放宽断言或靠retry变绿。
- [ ] root整合全部dirty差量后运行完整检查；各writer只格式化自己的文件。
- [ ] 当前HEAD独立审查与Hosted完成后才普通合并；新SHA需补审，不迁移旧绿。
- [ ] root实际重建/正常入口启动、验证默认数据profile与旧项目保全后同步终态。

## 状态与计划变更

| 时间 | 状态 | 原因与证据 |
| --- | --- | --- |
| 2026-10-15 | IN_PROGRESS / NOT_VERIFIED | 用户明确授权新首页与来源修复；base/main已核对，新增回归RED；当前实现与运行验收未完成 |
| 2026-10-15 | 文档认领完成；产品仍NOT_VERIFIED | 五件套、旧任务有据收束、新任务认领与生成视图完成；治理/功能/文档门禁通过，138旧任务对象及37功能状态保全 |
| 2026-10-15 | 四组P2修复中；整体NOT_VERIFIED | dirty独审暴露原生项目包/项目来源持久化与fallback/legacy数量/启动flight交接；修复前unit与Rust不代填，UI2定向布局通过不等于最终组合通过 |
| 2026-10-15 | 新根因修复冻结；fullverify2/Native final待验 | 附件callback/询问身份/root pending与VV修复有有效RED、定向GREEN；fullverify1真实停format并保留日志。candidate2已官方重建，最终真实图片/保存重开及数据副本恢复进行中 |
| 2026-10-15 | fullverify2 FAIL；本地仍NOT_VERIFIED | 781 unique为768PASS/13FAIL，实际retry13；修旧API前置/不同PNGfixture，并修标准Codex标签真实裁切，等待full3。candidate2功能与保存重开已实测，字段差异如实保留 |
| 2026-10-15 | UI63定向通过；fullverify3及Native包仍FAIL | full3为784 unique/781PASS/3FAIL、实际retry3，疑旧宽度/扩展文字断言与compact32契约冲突，尚待诊断与full4；Native33单QA实际包导出失败，两个Rust文件TDD修复及重建复验待完成 |

root负责同文件交叉需求的串行整合；任何owner需改另一owner文件先交接，不覆盖共享dirty。前置TASK-UI-FULL的旧verification完整保存在ledger历史字段，新closeout不重写旧失败。新任务结束前其余138旧任务对象和37功能状态逐项比对。

## 风险、恢复与交付

风险最大是新缺省覆盖旧API/隐私选择或把迟到结果归错项目；以旧快照回归、唯一归属/ID、未受理可取消与unknown fencing约束。真实验证在专用新项目执行，先记录旧项目对象、primary/index及数据身份；失败保留原件/日志，恢复不直接覆盖真实资料。

实现、定向与完整验证、UI/native/live、精确review、Hosted、PR/main和本机更新逐阶段补入verification；现均不提前标PASS。无需本轮扩大至真实外部API、签名安装器或新平台。

## 本轮修复队列与验证边界

- [ ] v29/root按现有schema补原生项目包合法新增字段，保留非法拒绝及旧包往返断言；完成后重新跑相关Rust/Native，修复前163项只作基线。
- [ ] 验证每项目模型与`conversationChannel`持久化、legacy项目切回、首页图片意图不串项目、`pendingAgent`只作首页fallback且隔离API草稿。
- [ ] 验证legacy首页count8显式禁用及框外用户改1，合法4失败重发仍4，保持原数量与错误/重试边界。
- [ ] 验证旧project原生启动connect flight交接到新首页project，不重复启动或丢失归属。实现者16行修复及12/12定向已冻结，fresh exact-SHA独立复核与Native仍待验。
- [ ] 合并上述修复后重建并跑完整verify、原生严格包及实际账号最小链路，再做精确SHA审查；不能迁移修复前unit1324/1310PASS/14skip与Rust163基线。

UI2的`layout-green-3.json`只有本次布局组合：8项首试通过、9状态centerY差0、14阶段菜单gap8px，子页即时量测且resize/scroll由实际事件触发；后续逻辑/原生修复尚未纳入该dist。用户最新7项目/rev2057及4602源码保护以root的`before-state.json`为本轮恢复边界，保留用户工作与删除，不回灌旧10/11项目。

premerge本地验收齐备时先进入REVIEW，保持产品合并/main与本机更新待验。实际完成这些已授权结果后，按SDLC使用同Task的明确后缀交付包作最小纯文档closeout并走现有PR门禁，保留premerge原记录，不新增任务或自动化来代替事实。

## 最新异步/原生验收队列

- [ ] 整合附件当前callback/current max整批边界、询问仅同draft可确认、Codex初始undefined/API原pending与共享VV bounds/listeners后完成最终组合。fullverify1的format失败及fullverify2的13失败/13实际retry保留；下一轮为fullverify3，不能直接改旧结果。
- [ ] 当前Rust165项/fmt与附件4+routing7、layout9定向结果只登记范围；codex_home_final_review对附件/询问两P2的dirty独立复核不替代最终SHA审查。
- [ ] candidate2独立`native-final-data/profile`的真实文本/单图/原件归档及正常保存重开已实际完成，仅绑定其Dn8kZ7g6 bundle；label修复后还须回读新产物/UI。candidate1后来的删图/改项目仍不能代填保存恢复结果。
- [ ] 根据用户明确“保留编辑，恢复为独立副本”授权，从已冻结`candidate-window-edits-final`将变动项目恢复新ID副本（2cards/1新asset），验证7个canonical原项目逐对象保持；整项目包导出拒绝继续保留为真实失败。
- [ ] 旧API用例按新意图明确其API前置，重复图片夹具改为不同PNG；真实默认文字裁切修共享布局，保持有效断言。fullverify3及最终产物/副本恢复保全齐备后才进入本地REVIEW，精确SHA/Hosted/PR/main与实际日常更新各自完成，不提前DONE。

最新定向UI63项首过已覆盖标准名称完整88px与32px同排；full3的三失败保留，两份旧测试按新compact32图标契约纠正后71项首过，未改产品。full4前置静态/Node/Agent/build通过，但1423已占用导致browser零case、整体exit1；full5进行中，不借用旧JSON。媒体尺寸包TDD已冻结，包30项/Rust167及fmt/check通过；仍须重建Native实际export/preflight/import。TaskHost首次失败与隔离重跑11项通过分别保留，后者只绑定旧EXE，最终产物身份待补。

用户最新授权为两个独立恢复副本，输入已只读核对但canonical未写；从最终备份恢复后逐项证明原7保全。另有TASK-CODEX-REF写回差量及版本33，root准备按相关生成契约纳入同一最终组合，明确来源并通过严格review/fullgate；不碰其docs/ledger或代填DONE。跨聊天发消息授权未收到，未发送消息；最终精确SHA/合并与本机验收仍待门禁齐备。

当前转入REVIEW：full5前置及784浏览器首过、新EXE实际包往返/冷开图文通过，845源码/测试与full4冻结清单相同。npm verify仍exit1，末端development因1421由另一人类任务占用而零case，未杀进程/复用server；不称完整PASS。下一步提交当前候选、精确SHA独审及Hosted真实跑完整verify/Delivery；通过后方可普通合并、main验证和实际本机重建，再按收据收束。两个独立恢复副本写入/原7保护仍须实际证据，不因进入REVIEW而视为完成。
