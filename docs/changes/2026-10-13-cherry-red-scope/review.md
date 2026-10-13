# 独立审查记录

当前执行至冻结源码 `7daeba25`，本机正式 Native6、真实 Ollama13 和隔离 NSIS 生命周期已有 PASS；最新完整验证、不同产物身份、Hosted 及最终验收的状态以 [最终记录](mainline-final-status.md) 为准。以下旧阶段保留执行时边界，不提前标 DONE。

任务：TASK-CHERRY-RED-001。已完成历史独立 dirty 预检及下列两段不可变源码审查；这些结论保留其原 base/head。当前 `codex/TASK-CHERRY-RED-001-mainline` 的 base/HEAD 为 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，Cherry 承接仍未提交；本轮最终 fresh 独立审查尚未完成，不能把旧结论或作者自检提升为当前全树 PASS。

最终审查须绑定本任务实际 base/head 或工作区快照，覆盖新增协议与免密边界、Markdown、助手/比较身份和原生生命周期。实现者自检不替代独立审查。

## 独立预检

审查者为fresh-context `cherry_independent_review`，只读、无写入/真实API；2026-10-13 08:18:55 UTC，base/head为51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c。dirtyDiffHash：82a1e928be843c1028aa5330e6d0d795dbe950dc68a3a915e01c9f399c276db9。算法为 tracked binary diff + `UNTRACKED` + sorted path/content SHA256。

独立14个定向unit文件136/136 PASS，并复验实际恢复函数。此前发生容量错误的未完成回合未当PASS；后续完成回合对上述快照给出“未发现仍开放P1/P2”。

- P1比较B自动改变画布原账号A：两处共用原绑定，完整endpoint/ref/model与原ID保持；移除原连接拒绝替换。
- P2比较恢复误标原节点/误接结果边：Web与Native恢复跳无source的比较任务，独立函数/Mock IPC复验关闭。
- P2离线本机接口：明确放行严格loopback，远程仍拒绝。
- P2guardian输出EPIPE：启动owned-group cleanup并持lease到groupgone，Unix实际运行待Hosted。
- P2空ref免密/大小写：Native只允许显式loopback text none，容量身份按endpoint；ASCII大小写统一，不扩大主机范围。
- P2超长助手/内置覆写：三入口数据保护与3000字符上限，普通Skill不扩大只读限制。
- P2flush取消：只启动仍queued的任务，executor拒绝其它终态；完整App延迟flush浏览器仍待运行。

该快照后版本/文档/网站入口与运行fixture变化，最终提交复核不得直接沿用此快照为全树PASS。

## 不可变源码审查

1. `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c → 015f19341f4c8e918290e985a96d927db0da4aad`：独立只读审查PASS，开放P0/P1/P2均0。复查实际账号/取消/恢复/免密/旧fingerprint及助手保护；网站入口保持固定HTTPS和既有shell能力。后续该审查者参与了目录锁测试与Linux导入修复，因此后续增量另交fresh reviewer，不自审其实现。
2. fresh-context `cherry_final_review`，`015f19341f4c8e918290e985a96d927db0da4aad → 81cfd11fe79279df2379e402ddefa00a908099a8`：规范轴0 finding、需求轴0 finding；未发现仍open的源码P0/P1/P2。其子审查并行只读，未改业务源码、测试、收据或文档。

第二轮独立执行51/51 Node定向测试、tsc、UI门禁（232文件0违规）、Native fixture语法与diff检查均PASS。亲读21项浏览器与3项header实际输出，独立核对Native13回执、当前EXE及12个源码hash一致；没有重复执行GUI，不将作者运行结果标为审查者实跑。完整1105的正确原始输出为[unit-1105.log](evidence/unit-1105.log)，此前失败的unit-final.log未冒充最新证据。

源码审查PASS；合并/交付仍NOT VERIFIED。exact81c Hosted quality因仓库外容器快照缺失FAIL，后续步骤未执行；最终三平台build抽查时运行中。macOS/Linux GUI、安装/签名、真实Provider/系统vault及用户验收不计PASS。后续证据仅追加到[验证记录](verification.md)；文档工件提交不改上述审查源码边界。

审查后作者收到exact81c三平台matrix均SUCCESS，真实job和日志保存在验证页。浏览器panel-resize旧两按钮间距断言更新为三按钮的逐个相邻间距（保留40px上限）与不重叠检查，随后6项PASS；仅测试/证据变化，产品源码未变。

## 主线承接的审查准备与边界

当前 mainline 从实际 `origin/main@694a0060` 承接 `51fccfc7 → 23dbdd6b` 的净变更，包含 primary 捕获来源和源码拆分、保存失败修复、Native 输入收据、Cargo LF 及包装增量。旧 `0e77` 的源码审查/R1 关闭仅属于旧 head；最新主线规则、冲突处理和其后脚本变更未据此获批。

作者实际完整 verify 的 [原始输出](evidence/resumed-closeout/verify-mainline-dirty.log) 为 1127 unit（1113 PASS、14 SKIP）、174 Agent（172 PASS、2 SKIP）、522 browser 全 PASS、development 四步 PASS、UI 237/0；[当前 Windows Rust](evidence/resumed-closeout/rust154-mainline-dirty.log) 为 154/154 PASS。这是审查输入，未标作独立 reviewer 实跑。该轮 App 记录 3244 vs 3241 与 395 vs 388 两项 advisory，0 allowed；门禁模式、目标和阈值未降低，不能称无存量债务。本轮修复后的最新度量和门禁状态追加在文末。

最终 reviewer 应在新提交冻结后，以 fresh context、只读实际 base/head diff 核对以下项：

- `694a0060` 原主线实现/规则与 125 项原任务保留，Cherry 未提前 DONE，primary 的 11 项后续 Agent/Provider recovery 依赖没有被覆盖。
- 每路比较身份、项目切换/迟到、unknown 防重、取消、旧存储兼容；配置 native commit 失败仍 unverified，不能显示假保存成功。
- loopback 免密、三协议严格终止、Markdown/URL 安全、助手权限与只读内置记录、分享无凭据。
- 原生 owner/进程子树与 synthetic vault 清理、默认发行与 `native-e2e` 隔离；新构建回执绑定 actual input hash、sourceHead、EXE hash，拒绝旧 `windows-fixed-head` EXE 作为最终证据。
- Cargo LF 修复不豁免其他 dirty 源码；macOS/Linux 默认包与 Hosted 的实际 job/receipt/工件 hash，原失败和 NOT VERIFIED 边界保留。

旧 `f8/688/0e77` 的本地/Hosted/Native 记录及勘误见 [验证](verification.md) 与 [Native 收尾](native-runtime-closeout.md)。旧运行失败不因源码已修就变为 PASS；最终 Hosted、Delivery、Native/安装与用户产品验收独立判定。本节为作者的审查准备与文档校准，不是新的独立审查报告。

## 本次远端保护回读与正在进行的预检

2026-10-13，root 通过 GitHub connector 实际只读回读 [目标仓库](https://github.com/soudbs180-creator/KK-Studio-2.0)：remote main 仍为 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`。三个 ruleset 的 enforcement 均为 active：

| Ruleset ID | 本次实际回读的约束                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `23866923` | 全 refs 禁止删除与 non-fast-forward，no bypass。                                                          |
| `23866924` | `v*` tag immutable，no bypass。                                                                           |
| `23866925` | main/master/release 要求 PR、strict 当前 verify + delivery、线程解决；approving reviews 为 0，no bypass。 |

这是当前规则事实，不回写早期规则未生效的历史记录；没有 merge queue 或额外 required checks 已启用的证据。AI 不用作者会话伪造 approval，也不自动启用 auto-merge；0 approving reviews 不能替代独立 AI 审查或用户产品验收。

fresh-context `cherry_mainline_review` 已开始只读主线 dirty 预检，交接时 reviewer 报告 57/57 项窄测试 PASS。预检仍针对未冻结候选，不是正式 exact-head 最终审查；最终结论和原始检查仍须在冻结 base/head 后保存并复核。本次文档校准者未冒充独立 reviewer，也未替其出具全树批准。

## 本轮 fresh 预检发现与处理

该 reviewer 后续确认 MR001–MR003 三项 P2；57/57 是此前窄检查的阶段记录，不是“无 finding”的最终结论。

| Finding                              | 处理依据与验证                                                                                                                                                                                                                                                           | 当前审查状态                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| MR001：Anthropic 浏览器缺允许头      | 官方 [SDK client.ts](https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/client.ts) 1678–1681 对允许浏览器请求设置 true；只给 authenticated Anthropic 增加该头，none 保持原义。实际 RED 为 null!=true，providerProtocols 全文件 24/24 GREEN。 | fresh reviewer 已关闭当前 dirty finding；真实服务及最终提交审查不由定向测试替代。 |
| MR002：目录匹配漏 protocol/auth      | 完整 id/base/ref/protocol/auth 身份；仅 undefined 兼容旧默认，null/非法值/remote-none 拒绝；同身份保留 manual，变化不携带旧声明。作者 RED 14 项、10 FAIL 的 stdout 未另存 log；GREEN 14/14、相关 76/76，reviewer 独立组合 38/38 PASS。                                   | fresh reviewer 已关闭当前 dirty finding；不伪造 RED 文件或批准尚未冻结的 head。   |
| MR003：迟到 401/429 更新已保存新配置 | 原 browser RED expected active、received quarantined；两个失败分支补 `reservation.healthUnchanged()`。六项新回归覆盖 protocol/auth/revision × 401/429；原 429 cooldown、403 quarantine 行为保留。                                                                        | 作者 21/21 browser PASS、retries=0；最终 fresh exact-head 复核仍待冻结提交。      |

上述 RED/GREEN 的已保存原始输出见 [verification](verification.md) 的本轮增量表。文档校准者只读取证据和源码，不把作者实跑冒充 reviewer 实跑，也不将 MR001/MR002 的 dirty closure 变成最终全树批准。

默认四种包的 workflow/校验器已实施，self-test 9/9 PASS；actual app/dmg/AppImage/deb 仍待 Hosted。Native receipt 新增当前 packaged runtime manifest hash，并对实际 target 的 manifest 再比对；reviewer 当时核对两个 hash 一致，但最终新 head 的 Native/默认包仍需实跑。默认 shipping 不含测试 driver。

root 正在重跑这些修复后的完整 verify，尚无可填写的最新最终结果。MR003 后当前 App 3246 vs base 3241、FUNC_LINES 395 vs 388，2 项 advisory、0 allowed；前轮 3244 是历史值，阈值和模式未改变。最终独立审查继续绑定冻结 base/head，并覆盖本轮所有修复、包装及收据增量。

## 正式 7da 源码独立审查

独立上下文 `cherry_mainline_review` 于 2026-10-13T15:37:03Z 正式审查 `694a00607f6f63de1b8c43d0ebb117adf5d34f67 → 7daeba25db511652dbd73833c21b3066f428d7f2`，规范轴/需求轴均 PASS，确认 open P0/P1/P2=0，MR001–003 保持关闭。147 项原审测试仍绑定 b141，不重标为 7da。7da 独立运行 package12/12、真实 Edge 延迟列表1/1（clicks=[expected]）、安全 guards26+26+14、八个原安装生命周期函数一致、四 Node syntax 与 committed diffcheck。六增量文件与冻结 Git blob 一致，产品 source/input 未变。

审查者独立重算 Root 7da Native6 回执的 sourceHead/buildReceipt/input/EXE/manifest hashes 全匹配；实际 GUI 由 Root 运行，不标为 reviewer 实跑。工作树当时仅 Root 新增证据，审查者未写文件。共享60秒是轮询预算，driver 单次 HTTP 超时仍180秒，不能声称严格60秒端到端截止。此审查不构成 GitHub human approval；后续文档/工件提交须增量补审，Hosted/四包/安装/primary GUI/真实云与用户验收各按实际 proof 判定。

## CHERRY-MR-004：不可信 MCP schema CPU 预算

独立预审确认 P2：新增现代工具 header schema 扫描无深度/节点上限，每层 path 复制导致深层输入平方级同步扫描。实际840017字节/40000层无header schema仍返回valid=true且约4750ms，未超2MiB响应边界。c527f421已冻结但尚未push/构建；正在为现有循环添加fail-closed深度及总节点预算并验证深/宽RED→GREEN。关闭需要独立复核与新冻结SHA，不用旧34项通过冒充覆盖。

MR004 root接管后补64层/4096总queued nodes预算，两种schema边在复制path/排队前拒绝。实际40000层property/allOf及10000宽property低于2MiB的RED→GREEN，正常Region保留；[RED](evidence/mainline-final/mcp-schema-budget-red.log)、[41项GREEN](evidence/mainline-final/mcp41-budget-green.log)。源码修复已完成；正式独立新SHA复核待完成。

cc184 exact-SHA独立审查已PASS，见[source review](evidence/mainline-final/review-cc184e59.json)。随后Linuxpush真实export revision冲突已定位为fixture未等autosave，产品guard正确拒绝且不修改；只补UI真实saved/连续durable revision稳定前置，并保留expectedRevision/单次export/原timeout。新冻结SHA正式增量审查和三平台重跑仍待完成。旧AppImage同目录保留按锁定上游CLI重建目录事实校准，见最终记录。

887正式exact-SHA增量review于2026-10-13T17:33:21.926Z PASS，11项独立时序检查、59证据hash与125旧任务保留；[原件](evidence/mainline-final/review-88740c5b.json)。四Hosted与独立Windows artifact审计另见最终记录。当前Native原生背景读回/恢复20行新增及本次文档归档仍须冻结head正式补审，不能使用887审核替代。
