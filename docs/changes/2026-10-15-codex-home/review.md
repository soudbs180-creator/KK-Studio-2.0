# Review：首页默认Codex与模型选择分流

- Task ID：TASK-CODEX-HOME-20261015；日期：2026-10-15，Asia/Shanghai。
- 状态：REVIEW / 整体NOT VERIFIED；本地分项已取得证据，当前尚未提交最终head，未构成精确SHA独立批准。
- Reviewer：已有dirty独立预检，早期四组P2与后续两组异步P2在下表记录；codex_home_final_review已独立复核后两项的dirty修复。最终精确SHA独立审查未完成，当前文档owner为任务参与者，未把本记录称为独立批准。
- Base：`cbda65e4389fc807769a8faf7654892415992589`；head/tree待冻结；branch：`fix/TASK-CODEX-HOME-20261015`。
- [Intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[verification](verification.md)。

## 评审范围和方式

最终review须从当前意图、规则、Git diff与运行收据独立核对：新首页缺省和显式来源、聊天/画布分流、无selection旧项目、隐私/草稿/附件/线程、重复提交/取消/unknown、菜单焦点/可视锚点、同排与输入状态、原件归档及用户资料保护。dirty预检不能替代精确SHA批准。

## Findings

以下编号仅用于本包跟踪root转述的dirty预检，不是精确SHA审查批准。早期四组修复已纳入当前候选，最终组合复核待验；附件/询问两项只在dirty源码独立复核范围关闭，不能表述为最终“0问题”或全项目PASS。最初creation、布局与新增异步RED均保留。

| 本包ID | 严重度 | 验收阻断 | 触发/要求 | 处理与状态 |
| --- | --- | --- | --- | --- |
| CH-P2-1 | P2 | 最终精确复核待验 | 原生项目包须严格接纳合法来源字段并保持非法拒绝；最新真实媒体item尺寸字段也须可合法往返 | 原导出失败保留；包30/Rust167/fmt/check通过，重建后2.1.33实际export/preflight/import及冷开1370×1148图文恢复已通过，最终精确SHA独审待验 |
| CH-P2-2 | P2 | 是 | 每项目模型和通道持久化，legacy项目不能被首页图片意图污染；pendingAgent只用于首页失败fallback，API草稿隔离 | 跨项目恢复/隐私/草稿回归待复核 |
| CH-P2-3 | P2 | 是 | legacy首页count8须明确disabled，用户显式框外改1；合法4项失败重发仍4，不能静默截断 | 数量/失败重发回归待复核 |
| CH-P2-4 | P2 | 是 | 原生旧project启动connect flight须正确交接新首页project，维持会话归属且不重复提交 | 实现者+16行冻结/12项定向通过；fresh exact-SHA独审与当前Native仍待验 |
| CH-P2-5 | P2 | dirty复核已解除；最终组合待验 | 共享附件异步旧callback覆盖当前draft，须使用当前callbacks/current max整批边界 | codex_home_final_review以无端口内存Edge+真实FileReader独立复核关闭dirty项；11browser/21unit为局部证据，最终SHA待验 |
| CH-P2-6 | P2 | dirty复核已解除；最终组合待验 | 询问pending持有旧source/prompt，只有同draft身份可确认 | 同上dirty独立关闭；不等于最终SHA或Native批准 |

## 阶段预检与失败历史（当前以适用门禁为准）

UI2布局8/8首试及修复前unit1310PASS/14skip、Rust163PASS不能关闭上述四组。当时用户数据以7项目/rev2057保护快照为准，旧10/11只属历史。

新增Codex root虚假TaskHost pending已通过有效unit RED→GREEN（Codex初始undefined/API原pending）；VV实际scale2 RED→layout9首试GREEN。当前Rust165/fmt通过，仅各自范围。fullverify1真实format失败保留，fullverify2待终态；candidate2官方EXE已建但真实保存恢复未验。candidate1真实文本/图片存在，后续用户删图/编辑与独立副本恢复按用户授权单独保留，不伪造persist PASS；旧项目媒体未归档导致整包导出拒绝仍是拒绝。

后续终态更新：fullverify2已FAIL，781 unique为768PASS/13FAIL，13次实际retry且均再次失败，0flaky不等于成功。除旧API测试前置和同字节多图fixture待修，已确认标准Codex默认名称被裁成5/61/79px的真实UI验收阻断；source为此重开，不放宽断言，待full3。

candidate2的真实文本、单图和正常保存重开现已实测通过其构建范围；原7项目已有字段保留，但一个旧empty project补两个空数组，不能写byteexact。后续UI修复的最终组合/精确SHA审查仍未完成。以上阶段记录保留各自发生时点，不用新的局部通过覆盖旧失败。

最新63项UI定向全部首过，标准名称在六个首页/聊天视口均完整88px；该局部通过不关闭full3的3失败/3次实际retry。旧299宽/扩展文字断言是否过时仍待核实，full4待测，不减有效断言。Native33实际包导出corrupt是另一个真实产品阻断，不能归入旧未归档媒体夹具拒绝；Rust修复和原生往返尚待验。

用户已授权两个独立编辑副本、输入已核对，canonical未写且原7不覆盖。另一人类TASK-CODEX-REF的写回差量及版本33仍待跨聊天协调授权，不能用本包review替其批准或改其状态/文档。最终精确SHA、全量、Native包、merge/main/activation均未完成。

## 适用门禁

最新full5独立回读784unique/784单结果首过、实际retry/flaky/skip/errors0，845源码/测试与full4冻结清单相同。新EXE实际包往返/冷开恢复已通过。但npm verify最终exit1：development因其他任务占用1421而steps=[]，未执行；不以浏览器绿色升级完整门禁。现准备提交REVIEW，当前SHA的Hosted必须真实跑完完整verify/Delivery再考虑合并，精确独审/main/本机更新仍待验。

阶段记录：此前71项首过/full4端口失败及TaskHost首轮失败与旧EXE隔离重跑分别保留，当时full5和新产物包往返尚待验；其后实际终态以上段为准。另一TASK-CODEX-REF差量由root明确来源纳入最终组合review/fullgate，本记录不替作者改其docs/ledger状态，也没有跨聊天发消息。

| 门禁 | 当前结果 | 未满足影响 |
| --- | --- | --- |
| Self-review / 当前精确SHA独立review | NOT VERIFIED | 尚不可合并 |
| 本地定向/前置与browser | 分项PASS：784单结果首过/实际retry0，845源码测试冻结相同 | 不代替完整verify或精确SHA批准 |
| Native单QA包往返/冷开图文 | 分项PASS：新EXE8f633.../2.1.33，1370×1148原件一致 | 不代替最终日常入口激活/其他Provider |
| 本地完整npm verify | exit1，末端development因外部1421占用未执行 | 当前SHA Hosted必须实际补齐，合并前不得跳过 |
| 当前Hosted原始报告、Delivery与实际ruleset回读 | NOT VERIFIED | 旧PR59/main通过不代填 |
| GitHub实际审批数量/身份 | UNKNOWN（本候选未建PR） | 同一GitHub身份不得自批 |
| 当前用户UI/产品验收 | 请求与范围已明确，最终结果待验 | 不伪造用户接受 |
| PR合并及本机重建 | 已授权、未执行 | 待当前SHA通过后执行 |

## 结论和交接

NOT VERIFIED。后续绑定完整base/head、时间、独立上下文和原始证据后出正式结论；新SHA使此前批准失效。前置UI任务已完成证据仅作历史依赖，不构成本候选批准或外部Provider/发布验收。

本任务含产品PR集成和实际本机更新；premerge本地通过只支持REVIEW，merge/main/activation必须保留pending，不能提前DONE。实际收据齐备后的纯文档收束沿现有SDLC/分支门禁进行。
