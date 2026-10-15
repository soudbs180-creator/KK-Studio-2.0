# KK-Studio-2.0 唯一接管提示词

你是用户确认后新建的正式执行会话，接续收集整理会话 `01a13e9c-1692-7186-a6b8-2cfb70d26038` 的本交接包，不返回旧会话派功能。用户最新要求整理完成后另开正式执行会话；收集整理会话只做交接留档，不开始产品实现或新派实现任务。先读本change package的 source-instructions.md、session-inventory.md、delivery-matrix.md、resume-order.md、verification.md，再读工程AGENTS/AI_RULES/治理权威与对应模块规则。唯一任务权威 `docs/governance/task-ledger.json`；192项来源矩阵维护在TASK-GOV-006.handoffMatrix，Markdown只是派生视图，TASK_LEDGER.md由脚本生成。

用户最新两项授权：安全整理暂停所有本项目会话；相同任务按需求目标和实际代码归并优化，所有保留成果最终正常PR合main。保留全部来源ID/原分支/完整SHA/dirty成果/独有功能/验证；相近实现先比较取舍，不因同标题删除。全部长期要求见source-instructions.md，不得只覆盖当前PR。排期/具名负责人待确认，用户拥有最终产品及主观UI验收权。

当前已确认8旧主会话和4此前active子会话安全idle，原本空闲的未唤醒；历史和全量枚举缺口见session-inventory。不能宣称全历史全部取齐。新独立实现只建新会话，先明确任务边界、文件所有权、依赖和验收；同worktree只有一活跃写入者。

正式执行会话首批只读补核5条未读和6条site接口受限记录，另从保存cursor续读2个长会话与5个深层审查。队列及来源见history-next-read.json和history-coverage-index.json；不对已不支持的接口无限等待，不绕读会话存储。未覆盖项不能假称已审完，也不阻塞无依赖且已授权的安全技术工作。

114登记worktree原账本联合192个稳定任务ID，main原141；51个差额只是待逐项核对的台账覆盖差异，不能说丢失51个功能。全部历史状态和原对象保留，不批量覆盖main原记录。容量中断恢复还包括TASK-UI-012-RESUME-001、TASK-UI-014-RESUME-001，不能由PROV-007分类DONE代表恢复完成。

早期已恢复的直接用户UI约束：原生Mobile不提供无限画布，Desktop/Web保留；Desktop客户端有最小尺寸且窄窗不变成手机UI；Web区分真正手机浏览器与桌面窄窗，后者两侧收纳、中间保留且可滚动。宽高可独立缩小，1280×720只是旧AI建议，不是用户批准的固定等比尺寸。选中图片的重绘操作在卡片上方，不能吞进卡内。此后响应式候选须与这些要求比对，冲突向用户确认，不擅自取旧AI建议。

唯一canonical工程 `D:/kk-studio/KK-Studio-2.0`，common-dir其`.git`；容器`D:/kk-studio`不是Git仓库。主checkout旧分支dirty受保护，不能覆盖。114登记worktree、approved root73，默认cap4，无sparse豁免；clean不等于可复用，必须读该worktree自己的旧账本和owner/锁/进程，REVIEW目录不能冒认完成。不得清理换配额。

最新远端已核main `235e7f798c38b022d578f8fa41eaea1b9281fd6d`，tree `5636c8a986be432539c3fbe67a2fef4bbb2e61a0`，已合PR55/56/59/60。Desktop/Web2.1.33、Mobile2.1.1。main当前CI须重新核对，不继承PR或旧head绿色。PR58仍draft `06f5fde94e320ea3e1c4213717358ffa00bd263c`、2.1.32，与main分歧，且本地18冲突/77状态现场保留；禁止构建冲突组合或abort丢成果。远端66分支、7open PR的分页尾页已确认空；分支历史不能只看PR。

daily锁定worktree `D:/kk-studio/.worktrees/branch-consolidation-20261011` clean/detached真实main；2.1.33 EXE `aeb70dfce5d3e31f76a779986e041ce88ebddb2a5fe9771b0906d70af40371d5`，输入`627e5b402e9bb0cdcc84394f2876be3f179560200ab17acd4240ab6d2787d595`。最后PID78612/9441 WebView15512，客户端按暂停保留打开。不得关闭用户窗口或用该locked目录做治理开发。HOME完整handoff及勘误在 `.analysis/codex-home-20261015/safe-pause-handoff*-20261015.json`；9项目新基线，不拿旧7基线覆盖。一个旧项目新增两个空字段；当前激活副本1；原active仍exact；副本2打开未验；默认auto-connect=enabled但历史原值UNKNOWN，不猜恢复。

接管后先核本治理分支/原账本登记、独审和门禁的实际状态，再按resume-order执行。当前治理worktree为既有PHASE0，分支docs/TASK-GOV-006-unified-handoff；旧PHASE0分支保留，不新增worktree。不要将候选2.1.35或2.1.34直接当最终版本；从实际main按唯一版本源、依赖/lockfile统一递增和重构建。squash后从新main只承接独有提交，保共享分支历史，禁止rebase/amend/force/direct main。

核心未完成项必须保留：HOME/REF三项静态P2需运行复现（改稿重试旧prompt/refs复活、连接竞态首发失败、重试漏canvasSource）；1254方图与1370早图不能混用；副本2未看与CDP普通启动未验。Canvas新HEAD5ac9验证790/Rust171通过但最新Native/主线未验；Compress d4cf缺development/最新manifest正式收尾；Responsive68d缺320px修复Native/browser GREEN与完整回归；Design md全部dirty、未完整verify/精确SHA独审；GDI af8保护优先成为共享测试前提，未来Edge升级复验；业务两P2仅4文件未应用提案；PR58独有账号/模型/恢复等逐字段承接；历史容量、local-service恢复782f095…、UI P2/未完成治理/所有TODO/PARTIAL均保。

Hermes并非只有Phase0：存在隔离Phase2 PoC，worktree TASK-HERMES-POC-001、branch codex/hermes-poc-phase2、代码01c4d422ded9b87a49e6b0226197ddfc04d822dc、最终HEAD463e774f26a393cd70fbbcc7c61b4743060d5c24，8/8定向。真实Hermes未安装/启动，Gate2 NOT VERIFIED/PARTIAL；KK独立架构、legacy adapter及未知提交不自动重发边界保留，不能当Hermes已集成。历史Moli/移动端/UI等独有候选见history-coverage附件和原源清单，不能被宽泛家族标题吞并。

所有测试隔离用户data/profile/凭据，保护原始失败证据。无具体授权不真实收费调用、上传用户素材凭据、发布、迁移/清数据或改历史。同步只能本地→GitHub→另一电脑。UI仍以既有Figma系统和UI_INDEX为视觉权威，Stitch为新增设计规范工具能力，不擅自替换设计系统。平台顺序Windows Desktop→Web→独立Mobile；Hermes渐进评估集成保持KK架构。

完成链：需求→任务→提交→独立审查→完整测试→PR→main复验→构建hash→安装/进程路径/显示版本→真实功能→用户验收。每轮报实际证据、真正进客户端的功能、剩余、阻断、下一步、授权/验收。总目标保持IN_PROGRESS或BLOCKED，直到批准范围全部验收且P0/P1和关键恢复风险清零。
