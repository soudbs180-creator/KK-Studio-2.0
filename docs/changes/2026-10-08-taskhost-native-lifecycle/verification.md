# Verification：T5 原生生命周期

- Task ID：T5；状态：DONE，精确独立/Hosted/普通主线落地及合并后CI全部通过；2026-10-08。历史失败如下保留。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Review](review.md)
- Base：`5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`。
- 环境：Windows，Node 24.21.0 / npm 11.19，独立根/Agent/plugin npm ci，未借用 node_modules。

基线 npm run lint、npm run typecheck、`node --test tests/unit/nativeTaskHost.test.ts tests/unit/taskRecovery.test.ts` 通过；53 tests / 53 pass / 0 fail / 0 skip。日志暂存工程外 `D:/kk-studio/.verification/T5-native-lifecycle/`，新运行文件不覆盖历史证据。

## 失败先行与修复

1. 未修复 fresh release 在 HTTP 响应头等待中取消，超过 5 秒仍为 submitted；[原始 RED](evidence/red-cancel.json)。图片请求、响应体读取和结果下载未等待取消通知。复用文本宿主的 race-safe `cancelled`，在三个异步等待及 DNS 解析处接入取消；已发送请求保留 unknown，已归档 slot 不丢失。
2. 合法 IPC 请求省略 `promptHash`，或供应商响应不含 `id`，宿主写入 null 导致严格资产元数据校验拒绝归档；[原始 RED](evidence/red-optional-metadata.json)。现在只在可选值存在时写入，不削弱资产校验。

嵌套 journal 假设、数量 2、编译后 prompt 标记、首页导航和启动读取时机均为验收脚本设置问题，原失败保留在工程外 `.verification/T5-native-lifecycle/`，不计为产品 RED。前端 intent 在原生 IPC 返回前仍可能 queued；请求到达时必须同时有同身份项目 intent 与 submitted native journal。旧 Web 的提交前 submitted 门禁继续通过。

## 当前本机验证

| 检查                  | 结果与证据                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 独立安装和基线        | 根/Agent/plugin 正常 npm ci；lint/typecheck；53 项恢复相关 Node 全部通过                                                                                                    |
| 完整 `npm run verify` | [日志](evidence/verify-initial.txt)：root 702/710，Agent 172/174，0 fail；原有 8/2 skip；浏览器 388/388，无 flaky                                                           |
| Rust                  | fmt/check PASS；[97/97 test](evidence/rust-test.txt)，[client check](evidence/client-check.txt)；原有 dead_code warning 保留                                                |
| 原生构建              | `client:build:agent -- --no-bundle` 与 CI 同款 `client:build -- --no-bundle` 均通过                                                                                         |
| 实际原生运行          | `npm run client:taskhost:test`：[十组 PASS](evidence/native-ci-equivalent.json)，5 次实际进程启动、errors=[]、合成凭据 cleanup=true                                         |
| AC-1/2                | UI intent/native journal 在 POST 前落盘；重放、WebView reload、同数据根异常重启只有一次 POST；改变同身份请求被拒绝                                                          |
| AC-3/4                | 响应头/响应体/下载中取消分别实测 14/15/128ms；unknown 保守受理；归档原件 hash/身份保持；[恢复 UI](evidence/native-unknown-recovery.png)为 1 success + 3 unknown，无普通重试 |
| AC-5                  | WebView reload 后文本容量仍占用；满载在 journal/POST 前被拒；取消后新任务成功；异常终止后的流式草稿保留 unknown                                                             |
| AC-6                  | 本机完整回归通过；当前 committed SHA 审查、PR 当前头 CI、主线推广分别记录，不从本机证据推断                                                                                 |

实际命令、data root/profile、源文件 hash、EXE hash、每次 URL/script/styles、POST 与 key 计数在原生收据中。Desktop production URL `http://tauri.localhost/`、CDP 9349；`src/main.tsx → App → StartPage/Canvas/TaskWorkbench → nativeTaskHost → Tauri TaskHost`。Web 的现有验证使用固定 1421 development/1423 preview。CI 增加同一原生脚本，不能用 mock IPC 替代。

初次成功产物 Desktop 2.1.5 / Web 2.1.5 / Mobile 规划 2.1.1；EXE SHA-256 `41cb2112779ac2de049ba1d45f362657577d712e6166713b9a20dc65809991d8`，JS `index-CznBbzGu.js`。此收据的 sourceHead 是基线，实际 dirty 源文件 hash 已逐项记录；最终提交/最新主线组合须补新证据，不能改写旧收据。

## 承接主线与审查返修（最新）

PR #35 已 squash 合入 main@5dd6e6dddaf00cf2d5c14ae02ef5974c72238232，源提交 c8de6c2 与合并 tree 相同；[合并后 hosted CI](evidence/pr35-main-ci.json) verify/deploy-linux 成功。T5 用 fa9da162 合入该主线，保留唯一 Plan 入口和原执行者阶段工作台行为，组合后的 Rust 97/fmt/check 与 fresh native 先通过十组，再进行下述返修。

独立上下文 `/root/continuation_review` 对 5b0eb6a → b58854c0 正式结论 CHANGES REQUIRED。T5-REVIEW-001（P2 安全验收阻断）：凭据已存在的断言可把原值写入失败异常；两处改为布尔检查，新增真实 OS 合成凭据冲突用例，原值保留，异常及其 JSON 均无秘密。T5-REVIEW-002（P2 AC-4 阻断）：unknown 批次静态“单项可重试”及 failed 按钮误导；[实际原生 RED](evidence/red-retry-caption.json)和[真实 Web 混合输出 RED](evidence/browser-red-retry-gate.txt)复现。BatchMatrix 共用 retryableOutputIndices，未归档输出不预先承诺重试，已确认 partial 的安全重试仍覆盖。另将新增文档定向格式化，保留原审查范围与结论，不直接改写旧 SHA。

[最新原生收据](evidence/native-final-retry-gate.json)十一组 PASS；当前 Desktop 2.1.6 / Web 2.1.7 / Mobile 规划 2.1.1，sourceHead 为 fa9da162，九个实际源文件 hash 及 EXE/bundle hash 绑定返修实现。五次实际进程启动、errors=[]、cleanup=true；[实际恢复 UI](evidence/native-final-unknown.png)不再显示可重试提示。后续提交须逐项核对这些源文件 hash，不能将旧 baseline HEAD 当作新提交运行结果。

Web 新增回归通过真实供应商响应制造 1 success + 1 unknown + 2 failed，确认 header、错误文案和按钮均不宣称可普通重试；同时保留普通 partial 的单项重试。初次浏览器返修运行 7/8 通过，最后一项 page.goto 遇到生产 dist 正被并行 native build 重写；这是验证调度错误，保留工程外 browser-green-retry-gate.txt，后续构建与浏览器运行串行，不降低断言或启用额外重试。

2026-10-08 07:08 UTC 最终返修 `npm run verify` exit 0：[新日志](evidence/verify-final.txt)，root 708/716、Agent 172/174（原有 8/2 skip），browser 401/401、unexpected=0、flaky=0、skipped=0；lint/typecheck/UI/format/version/账本/功能/Markdown/production build 均通过。生产 preview `http://127.0.0.1:1423/` 的[实际混合矩阵截图](evidence/web-final-unknown-failed.png)显示安全门禁，runtime attachment 与浏览器结果保存在本轮 test-results。原生十一组 hash 仍与当前 product/harness 源文件一致；正式补审和 Hosted 绑定随后 committed HEAD。

## 分支收敛与边界

正式独立补审 `5dd6e6dd → 0251cf797a60ead936849c185999dc3fe6a005c0` PASS，原两项 P2 已关闭；[独立收据](evidence/review-0251cf7.md)分别列出 reviewer 自行运行与执行者证据。任务实施和本机验收完成；T5 保持 REVIEW，当前 Hosted 与整合门禁未完成前不写全流程完成。

PR #34 已 squash 合入 `main@5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`，候选/合并 tree 一致；[主线 hosted CI](evidence/pr34-main-ci.json) verify/deploy-linux 成功。PR #35 合并结果见上节。模型能力分支仍由原执行者处理；不覆盖其源码或重复 cherry-pick。详见[状态盘点](status.md)。

本机 fixture 证明原生宿主，不能证明付费 Provider 质量、最终账单、VPS/Mobile/ComfyUI 或安装器发布。新保存的浏览器供应商元数据在立即强杀整个 WebView 进程树时曾丢失，[现场](evidence/provider-abrupt-exit-observation.json)；系统凭据和原生任务/素材保留，正常应用退出后配置恢复通过。该配置落盘缺口和既有 native image health/连接门禁缺口分别登记 TASK-PROV-005/006，保持开放，不能随 T5 验收升级。

## Hosted 启动失败与环境修复

PR #37 / source `3d415abe04604e0753d31323f07d89c3c34e7fd6` 的 push run 37743753356 与 PR run 37744526462，完整 Web/Rust/native 构建通过，但真实 native 生命周期在 CDP 启动 30 秒门禁失败，未执行任何验收组；delivery 与 deploy-linux PASS。不能以本机成功代填 Hosted 通过。原始日志、SHA256 验证后的 verification-evidence artifact 保存在工程外 `.verification/T5-native-lifecycle/hosted-native-failure-3d415ab*`；PR 收据 sourceHead 是 GitHub 的测试合并提交 `57337109418379234eaf73c77c5eef98605b690a`，其 source/bundle hashes 可与 PR 源码交叉核对。

FACT：CI 只安装 Edge，未检测或准备 WebView2 Runtime；原启动脚本忽略 stderr，失败收据没有启动进程证据。INFERENCE：托管 Windows 的 WebView2 Runtime 缺失可能阻断 Tauri 创建 WebView，现有收据不足以证明具体原因。按 [Microsoft 官方分发说明](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) 加入 Evergreen 注册表版本检测；仅隔离 CI 缺失时下载官方、签名校验通过的 bootstrapper 并静默安装，安装后必须再次确认版本。没有跳过或降低 native 门禁，也不替换真实 IPC。

启动收据现在立即记录 owned PID、退出/信号、CDP 是否就绪和有界脱敏 stderr；spawn 异常进入真实失败。当前本机检测 Runtime `154.0.4258.62`，未执行安装，[十一组原生诊断复验](evidence/native-startup-diagnostics.json) PASS，五次生产 EXE 启动均 CDP ready、errors=[]、凭据清理完成。EXE 未改动，diagnostic harness 的新 hash 明确留在收据；`runtimeVersion=not-recorded` 表示本机未注入 CI 环境收据字段，不伪造注册表值。新提交仍须独立精确 SHA 补审和 Hosted 复验。

独立审查 source `47c0ba6d277a691b0fbb8797b44c10c69eb41a82` 发现环境安装限制和签名发布者前缀两个 P2：仅 RUNNER_TEMP 不足以证明托管 CI；Microsoft Corporation Example 不得匹配 Microsoft 发布者。已分别用实际脚本、全副作用替身复现 RED，再修复为 GITHUB_ACTIONS=true + RUNNER_ENVIRONMENT=github-hosted + temp，以及完整 DN 的组织字段匹配。`tests/desktop/webview2-prerequisite.ps1` 的十三项回归 PASS，并纳入 Hosted 必经步骤；本机/自托管缺 Runtime、无 runner 身份、无效签名、其他发布者/前后缀伪装、安装失败/超时/仍无版本均不能宣告就绪。测试不读取真实注册表、不联网、不启动安装器、不修改真实环境文件。原 RED 设置盘符 X 不存在曾导致预期之外失败，保留为测试设置问题；改为存在盘符 C 后两处产品 RED 单独复现，原失败不掩盖。最终精确提交审查和 Hosted 门禁仍待执行。

第二次独立补审 `3229489bf61fe04734beea3dd7353817ee65d4b8`：CI 限制 CLOSED，发布者 P2 仍 CHANGES REQUIRED；[47 原审查](evidence/review-47c0ba6.md) 与 [322 补审](evidence/review-3229489.md) 均保留。合法证书 DN 的带引号 CN 可以包含伪装组织文字，完整字段边界正则仍会误认；用 .NET X500DistinguishedName 编码的 quoted-CN 反例取得真实脚本 RED。现在用 .NET AsnReader 按 DER 解码 subjectName，仅检查真实组织 OID 2.5.4.10，必须恰好一个且 Ordinal 等于 Microsoft Corporation；无效编码失败关闭。十五项[正式脚本反例回归](evidence/webview2-asn1-green.txt) PASS，含 quoted-CN 和重复组织；本机有效 Microsoft 系统文件签名只读检查 PASS。最终精确补审与 Hosted 当前新 SHA 仍待回读。

## 托管启动返修：保留失败并验证提升权限策略

独立精确补审 8399c1de04acb54c876f5a049db8d5ce93721b06 [PASS](evidence/review-8399c1d.md)，但 [PR CI 37752659602](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/37752659602) 仍在原生步骤失败；其余完整 verify、Rust、client check/release build 和 Runtime 先决检查通过。Runtime 实际为 154.0.4258.62，不再推断缺少运行时。[原生失败收据](evidence/native-hosted-8399-failure.json) 为 0 checks/0 launches/CDP 未就绪；finally 强杀可能产生 exitCode=1，不能据此宣称进程自行崩溃。完整 artifact 11539009476 保存工程外，ZIP SHA-256 e87c02a7b74eb2617fbfee8a37f0922cab2495c5991f02aa013df78af1a3ba0a，原失败不改写。

[微软官方文档](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security#for-an-elevated-host-app-use-appropriate-override-flags) 说明 High IL 宿主忽略 WEBVIEW2 环境变量及 HKCU、接受 HKLM 策略。此前未记录真实 token，故它仍是机制支持的待实测原因。CI 包装器只在 GitHub-hosted 身份、64-bit 进程和现有 RUNNER_TEMP 下运行，拒绝 SYSTEM；提升权限时创建 kk-studio.exe 专属 HKLM 调试端口/唯一 profile，任何既有值均失败关闭，不覆盖或删除其他 AppId/空值/通配符。finally 仅移除仍匹配本次值的成功写入，保留并报告并发变化，清理失败使 job 失败；本机及自托管不做策略修改。Native 收据增加真实提升权限布尔值、退出与清理请求时间。产品代码、沙箱设置和 30 秒 CDP 门禁保持现有安全边界。

[19 项内存副作用替身检查](evidence/native-ci-policy-mocks.txt) PASS：本机/自托管/缺 temp/SYSTEM/重复 profile 拒绝；非提升零机器策略；成功、既有私密/空/通配符/AppId 值、部分写入、读回失败、子进程失败、清理失败、并发 sibling 与 ownership 变化。它们不访问真实注册表、不运行 native、不代表 Hosted High IL 验收。最新主线组合、当前源码复审和实际 Hosted 仍待完成；AC-6 保持未完成。

## PR #36 主线组合与 registry provider 返修

PR #36 已合入 main@1af0357b088df79dc51e9b309ef310a500722cf8，[合并后 CI](evidence/pr36-main-ci.json) verify/deploy-linux PASS。T5 用 d52142d62fd2b19fcbdfbbde750338016bfd53c0 承接，保留双方文档和唯一共享模型/提交门禁；没有覆盖模型执行者工作树。源码 Desktop2.1.7/Web2.1.8/Mobile规划2.1.1。该精确source的[完整 verify](evidence/verify-model-integration.txt) exit0，[浏览器409/409](evidence/browser-model-integration-summary.json)且默认12workers无flaky/0retry；root/Agent原skip不隐藏。Rust97/fmt/clientcheck和fresh client:build -- --no-bundle PASS；[实际native十一组](evidence/native-model-integration.json) passed=true、5次启动、errors=[]、owned cleanup完整，退出/清理请求时间可核对。该本机直接native未走Hosted包装器，hostElevated=not-recorded明确保留，不能称为High IL验证。

独立补审指出 d521 包装器使用 Registry provider 的 New-Item -Force 可递归删除已有key和值；此前mock将其错当文件夹ensure。依据[PowerShell官方文档](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-item?view=powershell-7.5)，用内存替身模拟真实语义取得[existing child key丢失RED](evidence/native-policy-force-red.json)，而非修改本机注册表。现逐级只在key不存在时无Force创建；并发key使创建失败关闭，写入前再次核对策略为空。既有空key/子键/ancestor值、创建竞态及创建后写入前sibling均保留，清理仍只触及本次owned值。[23项边界检查](evidence/native-policy-registry-green.txt) PASS；新head精确补审与Hosted仍待完成。

## 21ac Hosted 空属性集合失败与返修

独立精确 `1af0357 → 21ac41433099edb661c5fbd58dee9b935fad5f62` [源码/文档补审PASS](evidence/review-21ac414.md)，T5-ENV-REVIEW-003 CLOSED；原四项finding仍CLOSED。PR run37765011214/job113270400077的完整verify、Rust97/fmt/check、release build和Runtime154.0.4258.62先决检查均通过，但实际包装器在新建空注册表key的第53行读取 Properties.Name 时抛出严格模式错误，尚未调用native harness。[原日志](evidence/hosted-21ac414-failure-log.json)无损保存，不宣称原生启动或High IL验收已通过。

此前mock给空key虚构PSPath，遗漏真实Registry空属性集合。改正副作用替身、先取得[同错误RED](evidence/native-policy-empty-properties-red.json)：Name不存在、writes0/removes0/children0/env恢复。现在对实际property逐项枚举Name，空集合不再访问不存在的聚合Name成员；预检、创建后检查、owned清理前后四处都保留严格模式和读错误传播。新增新建空key、既有空key、并发移除owned值保留sibling，[26/26回归](evidence/native-policy-empty-properties-green.txt)PASS；已有策略/子键/ancestor/竞态/ownership/readback/清理错误等仍覆盖。仅CI脚本和其回归/文档改变，产品/harness九个hash继续与d521实际native十一组相同，不需额外产品版本递增。新head补审与Hosted真实运行仍待满足；AC-6继续开放。

## 04260ad 精确审查、Hosted与主线落地

2026-10-08：[只读独立补审](evidence/review-04260ad.md)技术PASS，T5-ENV-REVIEW-004 CLOSED；正确空对象替身回放旧21ac失败，26/26当前策略及额外9/9边界检查通过，ENV003保持关闭。当前source04260ad的Hosted37770000879/37769995909全部SUCCESS，Runtime154.0.4258.62、真实原生11组passed、应用专属策略清理通过。完整日志按原始字节保存于[编码原件](evidence/hosted-04260ad-pass-log.json)；旧21ac完整artifact已核验[长度与SHA](evidence/hosted-21ac414-artifact-integrity.json)，未启动native的旧失败不改写。

[PR37普通squash回执](evidence/pr37-merge-receipt.json)已确认合入main@78cea37af9359fd2d9f58f2854525516deee8a06，[完整tree一致](evidence/pr37-landing-integrity.json)。T5 DONE；合并后main CI另绑，PROV005/006仍TODO。UI011承接该主线另做组合回归，Desktop2.1.8/Web2.1.9只对应UI新候选，不回写T5旧Runtime收据。

## 合并后主线CI与Hosted身份核验 PASS

[main78cea37合并后37773335548](evidence/pr37-main-ci.json) verify/deploy-linux SUCCESS；delivery在push事件预期skip。PR37原生[原始收据](evidence/hosted-04260ad-receipt.json) sourceHead为7849310fc8049ed90cfbda2c0c23091e19d8d250，actions/checkout默认PR merge ref；不是042的伪造收据。[完整核验](evidence/hosted-04260ad-integrity.json)证明其parents为base1af+candidate042、完整tree与042/landing78一致，9/9源hash、11组/5次真实elevated/CDP/Runtime154启动及完整ZIP SHA均匹配。四次exit1发生在owned cleanup请求之后，不能称为自行崩溃。本机not-recorded权限字段不据此改写为true。

T5 DONE，PROV005/006独立TODO。UI7d组合另有423browser/97Rust/fresh UI13+TaskHost11+模型能力及独立/HostedPASS；两个任务原生收据与源码版本分别绑定。
