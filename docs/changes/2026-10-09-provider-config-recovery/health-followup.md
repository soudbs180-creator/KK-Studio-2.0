# 健康审计继续执行清单

本表承接工程外branch-health-20261009的19条原记录，以main8c921a525ae505a558b0efee641830f1d61166fa和2026-10-08T21:02:00Z的新分支盘点区分当前事实与历史推断。任务状态仍以task-ledger为权威；TODO不代表已复现或实现。本轮TASK-PROV-CONFIG-004已承接LEG-001/002，相关34→35回归通过，但最终组合门禁尚未完成。UI012候选1844fcf已包含main8c（实际ancestry exit0），原9冲突报告保留历史含义；新最终合并/运行仍待其owner交付。原UI014会话因容量错误失败，已经另登记续验而未当成完成。

当前53本地分支：25条实际托管squash head/merge身份匹配、3条Git ancestry已集成、2条UI owner验收、1条PR42当前head CI、1条本任务进行中、8条其他dirty保留、12条历史或待审保留及1条稳定main。未清理、重置或强合任何候选；报告是时点快照，不把之后的新提交当成此时已验收。

## 19项逐一承接

| 原ID | 当前判断与下一步 | 承接 | 优先级 |
| --- | --- | --- | --- |
| CORE-001 | 当前同一CORS缺口；先真实双端口复验并修复 | TASK-LOCAL-ASSET-002 | P1 |
| CORE-002 | 源码数量边界不一致；原生大任务未验，先核对UI012候选 | TASK-MODEL-BATCH-002 | P2 |
| CORE-003 | 费用风险INFERENCE，先200坏输出复现 | TASK-WEB-IMAGE-UNKNOWN-002 | P1 |
| CORE-004 | 原件覆盖INFERENCE，先隔离版本/坏备份/IO复现 | TASK-COMPANION-RECOVERY-003 | P1 |
| CORE-005 | 隔离同伴未知费用INFERENCE，先fixture复现 | TASK-GATEWAY-BUDGET-002 | P1 |
| CORE-006 | 现有维护边界，按职责后续规划，不做机械拆App | T8 | P2 |
| UI-CORE-001 | 当前UI012候选已加入执行身份继承；最终owner验收尚在收尾 | TASK-UI-012（源候选账本） | P2 |
| UI-MASK-001 | 当前8c旧references仍存在，必须延迟上传RED后修 | TASK-IMAGE-REF-003 | P2 |
| LEG-001 | 合法注释/引号头RED已修，当前尚待最终组合验收 | TASK-PROV-CONFIG-004 | P1 |
| LEG-002 | 根选择、profile引用、写入前验证保护已修，当前尚待最终组合验收 | TASK-PROV-CONFIG-004 | P1 |
| LEG-003 | 仅旧WorkBuddy分支存在，禁止整支引入明文凭据 | TASK-WORKBUDDY-SAFE-002 | P1 |
| LEG-004 | 仅旧分支EOF假完成，接入前先修协议 | TASK-WORKBUDDY-SAFE-002 | P1 |
| LEG-005 | 仅旧版本模块存在，不能损坏变空覆盖 | TASK-CANVAS-KAWORKAI-002 | P1 |
| LEG-006 | 独有产品能力未承接，保留源分支并做新承接 | TASK-CANVAS-KAWORKAI-002 | P2 |
| LEG-007 | 仅旧版本模块浅校验，严格schema后才能引入 | TASK-CANVAS-KAWORKAI-002 | P2 |
| INT-001 | 原冲突是旧候选组合事实；UI012已含8c但新最终门禁未代填 | TASK-UI-012（源候选账本） | P1 |
| QA-001 | 原失败/PASS保留，原因尚为推断；当前Hosted运行另验 | TASK-VERIFY-CONCURRENCY-002 | P2 |
| DOC-001 | 当前README旧2.1.0与新版本源冲突，UI入口按UI_INDEX收敛 | TASK-DOC-CURRENT-002 | P2 |
| GIT-001 | 当前其他dirty8条及2 owner原件保留，不强合/清理 | TASK-GIT-HEALTH-002 | P2 |

## 已排队的缺口

- **TASK-LOCAL-ASSET-002 · P1 · TODO**：伴随服务跨源素材元数据响应头。当前8c缺Expose-Headers；旧1d真实浏览器200字节正常但metadata不可读。先复核最新main，然后真实双端口浏览器验收；仅允许的origin暴露头，认证边界保持。
- **TASK-COMPANION-RECOVERY-003 · P1 · TODO**：伴随服务未知版本与坏快照原件保护。当前catch-all读取语义仍存在；风险为INFERENCE，先隔离future/主坏备好/IO/保存重试复现，原字节与备份保护再实现。
- **TASK-WEB-IMAGE-UNKNOWN-002 · P1 · TODO**：Web成功HTTP但坏输出的未知受理边界。INFERENCE；先用200坏JSON/空/部分输出fixture复现，核对unknown、零自动第二POST及费用保留，不声称已产生真实费用。
- **TASK-GATEWAY-BUDGET-002 · P1 · TODO**：Gateway提交同伴任务的未知费用隔离。INFERENCE；先复现连接隔离中submitting无jobId路径，保留未知受理与预算，零真实付费请求。
- **TASK-MODEL-BATCH-002 · P2 · TODO**：Desktop与模型批量数量契约一致性。当前源码前端1–64/原生10存在契约差异；大于10原生运行尚未验证。先核对UI012最新候选是否已处理，再做零POST和真实Rust边界验收，避免重复。
- **TASK-IMAGE-REF-003 · P2 · TODO**：异步参考图上传与删除乱序保护。当前8c仍捕获旧references；延迟上传与删除同态RED后修最新列表/生命周期，重复操作与切换编辑对象回归。
- **TASK-WORKBUDDY-SAFE-002 · P1 · TODO**：旧WorkBuddy Gateway安全承接。仅旧分支存在，保留源分支及dirty工作区；不得整支合并。新的承接只带审核过的独有功能，凭据进入系统库/请求内存，EOF无completed不假成功；真实平台联调另验。
- **TASK-CANVAS-KAWORKAI-002 · P1 · TODO**：旧画布版本能力安全承接。main尚无该版本模块；旧13d5源码保留，不整支merge。新任务先严格snapshot schema/主备保护/坏输入/深克隆/真实恢复，再按用户已有范围引入独有能力。
- **TASK-VERIFY-CONCURRENCY-002 · P2 · TODO**：浏览器并发失败原因与隔离复核。旧默认并发失败及受控零重试PASS保留，争用原因INFERENCE。当前插件447/12workers零实际retry不是旧原因已关闭证据；新增失败应具体诊断。
- **TASK-DOC-CURRENT-002 · P2 · TODO**：README与已知问题的当前入口一致性。当前README仍写2.1.0；已知问题需逐项以新main账本/唯一UI_INDEX裁决，保留历史发布来源。同步UI014候选文档后最小纠正。
- **TASK-GIT-HEALTH-002 · P2 · TODO**：分支准入与未提交工作持续盘点。当前53本地分支/41worktree分类实证已生成，8非当前owner dirty单独保留；不能凭squash的branch --merged或任务DONE清理。只普通PR集成，无删除授权则不删。
- **TASK-UI-014-RESUME-001 · P1 · TODO**：接续因模型容量错误中断的UI审计。原会话审计并完善UI规范于2026-10-08T21:06:47Z模型容量错误中断，最后菜单27定向通过、布局变量门禁曾失败后已补定义但最终结果未知。保留原worktree，独立候选续验；不能当成产品已验收或偷偷改变会话模型。

- **TASK-NATIVE-GESTURE-002 · P3 · TODO**：承接PLUGIN-REVIEW-003，首轮真实drag失败原因UNKNOWN，保留同EXE下一轮完整PASS，独立诊断焦点/宿主条件，不弱化输入或阈值。
