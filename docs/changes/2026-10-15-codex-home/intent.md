# Intent：首页默认Codex与模型选择分流

- Task ID：TASK-CODEX-HOME-20261015
- 状态：REVIEW；本地已取得分项证据，整体验收 NOT_VERIFIED，精确SHA/Hosted与交付待验。
- 日期与提出者：2026-10-15，当前用户。
- 请求来源：用户明确使用Codex/ChatGPT账号聊天和内置生图，要求首页默认该通道；统一首页、聊天、画布的选择行为，修复同排换行、输入横线和菜单跳到顶部，端到端验证后经PR合主线并重建本机客户端。
- 用户授权范围与依据：上述实现、真实文本/单图验证、保存重开、PR与本机重建属于本轮明确授权；技术计划由AI在此范围内执行。
- 交付包角色：`current`；[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)；[账本](../../governance/task-ledger.json)。

## 领取与开工确认

- Owner：root；文档owner：final_integration_review；branch：`fix/TASK-CODEX-HOME-20261015`。
- Worktree：`D:/kk-studio/.worktrees/branch-consolidation-20261011`；base与开工HEAD：`cbda65e4389fc807769a8faf7654892415992589`。
- 依赖：TASK-UI-FULL-20261015在PR59/main与本机激活证据范围收束；旧阶段结果保留。primary `51fccfc7` 的4602文件、254项dirty与原index受保护。
- 并行：root唯一维护ModelPickerMenu及版本；v29_source_review维护来源/路由契约；native_cli_visual维护布局、hooks及对应测试；本文档owner仅改治理与功能文档，不启动共享1423。
- 基线：root在分支创建前记录clean/main、typecheck与version:check通过；治理139任务、功能37项、Markdown与snapshot门禁通过。新creation回归20通过/1失败及实现者15通过/1失败属于本任务有效RED，不是预存失败。

## 用户原意与工程转译

“用Codex/ChatGPT账号”不应在首页被要求先填写API Key。首页新建默认选择Codex的图片能力，用户可显式选已有API通道；聊天与画布按各自明确来源执行，界面选择必须与实际请求一致。长模型名和手机宽度不能把动作挤散，菜单应跟随当前按钮。

旧项目的API选择、无selection的legacy路由、局部隐私模式、草稿、附件、线程和归档结果保持原含义。新默认值不构成旧项目迁移。Codex内置生图未报告具体型号时显示“图片模型未报告”，不能用文本默认模型代填。

## 目标与非目标

- 范围：共享前端的首页、对话和画布来源选择及输入/弹层；Desktop实际账号最小链路、本机重建与主线集成。
- 非目标：找回/替换既有API配置、开通其他供应商、修改凭据、云端同步、签名安装器、Mobile原生实现或无关UI重做。
- 来源：当前[UI索引](../../UI_INDEX.md)、[UI规则](../../UI_RULES.md)、[数据契约](../../architecture/DATA-STORAGE.md)、`StartPage → StartComposer/StartModelPicker → ModelPickerMenu`与`App`创作/Agent路由。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 平台 |
| --- | --- | --- | --- |
| AC-1 | 新首页默认Codex，显式API选择真实生效 | 默认/显式选择与实际submit路由测试，无错误回退 | Desktop、共享Web |
| AC-2 | 首页、聊天、画布选择各自保持，旧API项目不被改路由 | source/connectionId/generationSource、legacy及重开回归 | Desktop、共享Web |
| AC-3 | 模型、扩展与语音/权限/发送同排，输入无额外横线，菜单在触发点附近 | 390/1099/1920及短屏、长名称、IME、Escape与滚动DOM/截图 | Desktop、响应式Web |
| AC-4 | 本轮真实文本和1张内置图片可保存、重开恢复且不伤旧数据 | 当前版本实际账号回执、源图/资产hash、旧项目对象与primary保全 | Desktop |
| AC-5 | 当前SHA验证、独立审查、Hosted、普通PR与本机重建闭环 | verify、Native、精确SHA review、CI/raw与启动身份 | 集成/本机 |

## 风险、事实与决策

- FACT：main 2.1.31已完成独立审查与本机Codex文本/内置生图验证；这些是本轮前置，不是新首页实现的PASS。
- 风险：缺省值误迁移旧API项目；跨来源草稿混用；local-only隐私被外发；busy/unknown重试或重复提交；菜单量测未完成时落在视口原点。
- 决策：复用现有选择、Agent与Provider链，不新增第二个执行器；凭据只沿原安全通道。具体契约见spec。
- FACT：root已由官方脚本将Desktop/Web2.1.31递增至2.1.32并通过version:check；Mobile2.1.1不变。
- 当前版本源已读为Desktop/Web2.1.33、Mobile2.1.1；本轮最终候选按2.1.33待验。candidate1/2的实际2.1.32回执仅保留其原构建范围，不改版本移用。
- 当前修复范围：dirty独审已发现四组P2，涉及原生项目包严格接纳新增合法字段、每项目来源/执行通道与首页fallback隔离、legacy数量显式处理、启动中的旧project连接flight交接；修复与复核尚未完成，见[review](review.md)。
- 当前数据保护基线：用户本机工作期间已自行变为7项目/rev2057，按`D:/kk-studio/.analysis/codex-home-20261015/before-state.json`（SHA256 `95df5c81a3b75119175b2f3f89c27c714254cf1df76ab5aa92d4954f4f6181fb`）保护。旧10/11项目记录仅属于先前时点，不还原用户删除。
- UNKNOWN：当前候选最终提交SHA、对应Hosted完整门禁、main与日常本机激活；已取得的本地browser/Native/live分项按verification准确登记，不视为最终交付。
- 无待用户再次确认的产品语义；新增费用、额外真实生成或不可逆数据操作仍按具体授权控制。

## 后续实际反馈与范围补充

- 新增根因：共享附件异步旧callback覆盖当前draft、询问确认持有旧source/prompt、Codex新项目被误标为无TaskHost执行者的pending；另补实际visualViewport边界与resize/scroll监听。修复与有效RED/定向结果见verification，不等于最终组合通过。
- candidate1在独立data/profile取得真实文本marker和1张内置图片；随后用户在该独立窗口删图、编辑其他项目。该后态不能用于宣称保存重开PASS，也不能把用户操作误报为产品持久化故障。
- 用户已明确要求“保留编辑，恢复为独立副本，避免覆盖原项目”。root已备份`candidate-window-edits-final`，计划将变动项目以新ID副本恢复（2cards/1新asset），逐对象保留canonical原7项目；此恢复当前待验。
- 整项目包导出被旧项目未归档媒体拒绝，无成功包；本轮只处理已授权独立卡片副本，不修改旧项目来让导出变绿。
- fullverify2终态FAIL（781 unique：768通过/13失败），包含13次实际retry，不能称零retry。除旧API场景前置与重复图片fixture待修外，已确认默认Codex标准文字被裁成5/61/79px的真实UI缺陷；当前重开该label修复，保留断言并等待fullverify3。
- candidate2已在其独立data/profile实测真实单图、文本和正常保存重开同thread/asset恢复；原7项目已有字段保留，但一个旧empty project新增空reviewComments/stagePlans，不能声称7个整对象byteexact。该构建事实不代填后续label修复后的最终组合。
- 最新UI定向63/63首过；fullverify3仍exit1（784 unique：781通过/3失败、实际retry3），等待full4。Native33单QA导出另有真实corrupt失败，媒体尺寸字段的严格包兼容修复/原生复验待完成。
- 用户已将恢复授权扩展为两次验证窗口编辑各一个独立新ID副本；canonical尚未写入，原7不覆盖。另一人类任务写回的卡片参考图/版本差量保留来源，root按本轮首页/聊天/画布授权准备纳入最终组合审查与门禁；其docs/ledger原文和状态不由本包接管，未获跨聊天发消息授权且未发送消息。
- 后续两份旧布局测试按compact32图标契约纠正，71项定向首过；full4却在1423已占用处退出、没有执行browser case，full5进行中。媒体尺寸包修复已有有效RED及Rust167/包30项通过，但新EXE实际包往返仍待验；TaskHost首次执行失败与隔离重跑11项通过分别保留，详见verification。

最新收束：full5浏览器784项均单结果首过、retry/flaky/skip/errors0，845份源码/测试与full4冻结清单逐项相同；但npm verify末端development因另一任务长期使用1421而未执行、整体exit1，未杀进程或复用其server。新EXE实际项目包export/preflight/import及新导入root冷开图文恢复通过。现进入REVIEW，保留所有失败，待当前提交精确独审及Hosted真实执行完整verify后再决定合并；主线与本机更新未提前完成。
