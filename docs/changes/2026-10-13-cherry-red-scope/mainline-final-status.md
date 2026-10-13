# 主线候选最终验收记录

当前最近完成验收的候选为 `88740c5b23f1cf5f0896d471b4339d9db39f4b9b`，产品源码与 `cc184e59` 相同；Desktop/Web 2.1.18、Mobile 2.1.1。四个 exact-head Hosted quality/Native 运行全部 SUCCESS，独立源码补审及 Windows 原包证据审计 PASS。最后新增三平台真实原生背景读回/恢复检查尚待冻结提交和实跑。任务保持 PARTIAL，最终用户产品结果/发布范围确认仍按 BRANCH-POLICY 单列；没有合并 main、发布或更新 primary 快捷方式。primary 并发源码与暂存内容保留；不宣称原 index 原始字节跨时刻不变。

## 前一冻结版本的实际本机验证

所有原件按字节保存并核对 SHA256，见 [清单](evidence/mainline-final/manifest.json)。本节不改写前阶段失败或旧工件身份。

| 验证                           | 实际结果                                                                                                                                                 | 身份与证据边界                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 完整 `npm run verify`          | exit 0；1138 unit：1124 PASS、14 SKIP；174 Agent：172 PASS、2 SKIP；528 browser：527 首次 PASS、1 首试超时后 retry PASS；development 四步 PASS，UI 237/0 | [原始输出](evidence/mainline-final/verify-final.log)。MR001–003 最终产品源码；随后的 7da 仅改测试/CI，无新增产品行为。                                                                                                                                                                                                                                      |
| 双窗口保存复核                 | 同一旧场景连续 8 次 PASS，retries=0                                                                                                                      | [原始输出](evidence/mainline-final/concurrent-save-eight.log)；保留完整 verify 的首次失败，未修改 storage 源码、断言或超时。                                                                                                                                                                                                                                |
| Windows Rust                   | 154/154 PASS，fmt PASS                                                                                                                                   | [原始输出](evidence/mainline-final/rust154.log)；既有 dead-code warning 不冒充已清零。                                                                                                                                                                                                                                                                      |
| 7da 原生六项                   | 6/6 PASS、errors=[]、sourceDirty 空                                                                                                                      | [回执](evidence/mainline-final/native-windows-7da-receipt.json)：真实 UI、synthetic 系统 vault、Native 本地模型发现、双模型/journal/Markdown、原生 package、随包 Agent、重启持久化；显式 optional driver，不能冒充默认发行 bytes。                                                                                                                          |
| 7da 默认发行与真实 Ollama      | 13/13 PASS、errors=[]                                                                                                                                    | [真实本地模型回执](evidence/mainline-final/ollama-native-7da-receipt.json)，[管理器新鲜度](evidence/mainline-final/managed-current-7da.log)。Ollama 0.40.3、CPU、NO_CLOUD；qwen2.5:0.5b 与 smollm2:135m 的发现、并发、每路独立历史、续聊、保存/重启/导出/导入、synthetic vault 和自有进程清理。小模型输出质量不由链路验收证明；LM Studio/付费云服务未实跑。 |
| 默认 Windows NSIS              | strict receipt/4280 files PASS；实际 install/restart/reinstall/resource repair/uninstall/reinstall/offline/data retention PASS；前后注册/进程状态均 `[]` | [ddacf 安装收据](evidence/mainline-final/installer-ddacf-receipt.json)、[实际生命周期](evidence/mainline-final/installer-local-runtime.json)。安装包绑定 ddacf 源码；7da 仅改 CI/fixture。clean Windows 无 WebView2、低版本回滚及签名 NOT RUN。                                                                                                             |
| Linux 包夹具修复               | 12/12 实体文件布局/拒绝测试 PASS                                                                                                                         | [原始输出](evidence/mainline-final/package-layout-12.log)。actual AppImage/deb 仍等 7da Hosted，self-test 不等于产品安装。                                                                                                                                                                                                                                  |
| 项目列表异步渲染修复           | 真实 Edge 200ms 延迟、同名卡片、已恢复 activeProjectId：实际点击 expected，canvas 可见                                                                   | [GREEN](evidence/mainline-final/project-list-green.log)；原 Hosted library 未渲染时 count=0 跳过点击的失败保留。                                                                                                                                                                                                                                            |
| Hosted Windows installer guard | 作者 26 原 policy +26 新 policy +14 profile 场景 PASS；保留原八个生命周期函数和30秒断言                                                                  | [输出](evidence/mainline-final/installer-policy-checks.log)。仅 GitHub-hosted/64bit/notSYSTEM；自有 app 两个 HKLM 值、读回和 finally 清理，不在本机写 HKLM。此次 HighIL 归因仍为 INFERENCE，等新 Hosted 实跑闭合。                                                                                                                                          |

本机 product input SHA256：`ee212123aa3684a501259f4969e7cdd789ab2747ac4dbc2e32538df729b5ecfc`；runtime manifest SHA256：`ec3685a32f46807d1e6a524b4c4ee442037b0aabe2e2d4d7fa44eaf06cc2b75d`。默认 EXE `a2e2756ac78a179031e3d072cdf3bfdfafc79d43e3649edae645e79b000dc5fe`、7da driver EXE `2162a696068bb8dc2bb97a1f3d733c3b9ea2de4c74d5134c60c8f39c901f04ac`、安装后的 EXE `aeacc57ad7097afa7870cd4f6b28a930026a3de24131e7a10f23a2923688655f` 分别记录，不能互换。默认发行新鲜度管理器验证当前输入，未重建并明确 `rebuilt:false`；没有重写旧构建日期。

实际入口为当前 worktree 的 `build-final-managed.mjs`/既有 release 管理器、production Tauri `http://tauri.localhost/`，脚本 `assets/index-ClDT8V-t.js`；页面 import 链为 App→ConversationPanel→ConversationAlternateChannel→ProviderConversationPanel，复用原 registry/queue。测试使用独立 data/profile 和自有模型/server；没有读取或复制消费者网站账号，也没有调用收费 API。GUI 启动器与 primary 的最终用户验收仍分开，隔离运行不冒充原快捷方式已更新。

## Hosted 历史失败与当前运行

ddacf 的 [PR quality 38415842561](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38415842561) 七 job 全 SUCCESS；push quality 的原生 lifecycle 仍 FAIL：项目列表未渲染而循环跳过点击。两个事实同时保留。

ddacf Native：Mac push 的原始 app/dmg 两包和 optional Native6 全 PASS，但 PR Mac 初始 execute/sync 超时 FAIL；Linux 两运行均真实 build AppImage/deb 成功，随后夹具错误读取 `usr/lib/kk-studio` FAIL；Windows 两运行严格 receipt/安装4280文件成功后 CDP9358 FAIL，清理卸载成功，[原始 runtime](evidence/mainline-final/installer-ddacf-hosted-red.json) 与 [job 日志](evidence/mainline-final/installer-ddacf-hosted-log.json) 保留。缺少提权/进程诊断，不能说本次实际测得 HighIL。

7da 六文件修复：Linux 按配置安全 `productName=KK Studio` 验证资源，AppImage 验证真实 contained/executable AppRun、独立原 EXE bytes；Native `/status` 使用 `value.ready===true`，再原生 GET URL/title 后执行脚本，保留30秒 script timeout与60秒启动预算；Hosted installer 使用已有 TaskHost 机制的 app-specific policy；项目列表等待实际渲染并点击保存的目标卡片。未跳过 hash、安装、UI、vault 或 storage 断言。

当前 [PR Native 38422396951](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38422396951)、[PR quality 38422396911](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38422396911)、[push Native 38422389807](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38422389807)、[push quality 38422389843](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38422389843) 为 7da 历史运行，最终结论以随后追加的原始回执为准。独立 exact-7da 增量审查已于2026-10-13T15:37:03Z通过（147项旧审查另绑定b141；本次12包布局、1实际Edge、26+26+14guard等增量通过），不能替代2.1.18新补审。三平台发行包实际 bytes、Native6 和其后文档提交的审核/门禁尚需追加。

## 7da 实跑后继续修复

7da 的 Mac 两次原始 app/dmg 已通过，但 Native 停在 URL 夹具：实际 `tauri://localhost`，原预期只接受末尾 `/`。现仅接受这两种等价根 URL，不放宽域名/协议。Windows Hosted 已真实通过 CDP、production 页面和 `get_storage_root`；失败是 actual 8.3 名称 `RUNNER~1` 与 expected 长名 `runneradmin` 单边 realpath 比较。现双边 canonical filesystem identity 仍严格相等；本机真实8.3别名复现旧失败、修复比较成功，其他目录仍拒绝。它们仍须新 head 的完整运行，不把旧失败改成 PASS。

7da Linux 原包的严格检查发现 Codex vendor 从269273536变为269276128字节，拒绝通过。已对照 Tauri 2.11.4 对应 linuxdeploy 固定源码：递归 `usr/lib` 的 ELF 被加入 RPATH 修改；排除依赖和 NO_STRIP 无法保护已在 AppDir 的运行资源。已实施 producer 内按本次 runtime manifest/size/hash/realpath 保护不可变 Node/Agent 资源，其他应用/GTK ELF 委托真实 patchelf；旧 manifest 与严格 package checker均不改，不通过忽略 mismatch 或改旧 hash 制造成功。

本机真实官方 MCP SDK1.30.0/MIT stateful Streamable HTTP server 的独立 SDK 客户端及 KK 显式 legacy 路径已通过 initialize/list/call/DELETE；默认 production UI 的 auto handshake 实测 HTTP400失败，配置保存/两次启动/重载持久化通过，UI call/disconnect 未运行。已按官方协议补 null-id legacy session rejection 的精确分类及现代 metadata/标准 headers；401/403/429/5xx、未知错误、redirect、取消、响应上限及无效成功响应继续拒绝，不引入新SDK产品依赖。此共享运行行为修复按现行版本规则将 Desktop/Web 从2.1.17增加到2.1.18，Mobile仍2.1.1。

## 保留与未纳入范围

保留 KK 的 Tauri2/React18、默认 Codex/Google、单一 ProviderRegistry/SkillRegistry/CreationTask/journal 与存储身份；独立实现三协议、精选五助手/自定义、多模型、Markdown/分享及必要局部重构。Cherry AGPL 主源码未复制，沿用 MIT 解析依赖；未引入许可证不明的 AI Core、另一套底层或付费组件。参考来源、许可证和路线图取舍仍以 [research](research.md) 与 [spec](spec.md) 为准。

原有通用 MCP 自动编排、真实第三方服务/账号、图片视频生成服务、Apple notarization/Windows 签名、clean VM、Mobile、生产发布和用户产品验收不能由本轮本地 PASS 自动完成。user 自主实施授权覆盖技术工作，但不能伪造其最终产品体验确认。

## 2.1.18 完整候选验证

当前候选 `npm run verify` exit0：1157 unit（1143 PASS、14 SKIP）、174 Agent（172 PASS、2 SKIP）、528 browser全PASS，零重试；development四步、UI237/0、lint/type/format/build通过。[原始输出](evidence/mainline-final/verify-218-candidate.log)。Rust fmt及154/154通过，[输出](evidence/mainline-final/rust154-218-candidate.log)。执行时HEAD仍是7da且候选未提交，不把输出改写为新冻结SHA。health只剩App原有两项advisory，footguns零；未降低标准。

MCP39项回归通过；官方SDK2 server2.3.1/node2.1.1在独立临时依赖中实测HTTP/SSE control成功：自动现代发现、参数头/metadata/body一致、无效工具过滤、400/-32020不执行错误调用。[实际control](evidence/mainline-final/sdk2-source-control-218.json)明确记录sourceDirty，它不证明production Native UI。SDK1.30真实旧production auto失败[原件](evidence/mainline-final/sdk130-native-7da-red.json)保留；新版默认EXE的两个实际SDK Native UI仍待复测。产品未引入SDK依赖；协议实现独立编写，固定官方规范及源码见[来源](evidence/mainline-final/mcp-primary-references.json)，临时SDK2 Apache-2.0与SDK1.30 MIT不混同。

Linux producer的10项文件/真实子进程委托契约通过，[身份](evidence/mainline-final/producer-218-contract.json)；仍须Linux Hosted实际AppImage。Windows真实8.3 identity旧比较失败、新双边realpath通过且错误目录拒绝，[原件](evidence/mainline-final/installer-realpath-218.log)。新版冻结SHA独立审查、默认release/optional driver/NSIS实际验收与三平台Hosted仍未完成；不标DONE。

独立新候选预审发现CHERRY-MR-004，现阻止将c527f421当作已通过正式审查的发行候选。不可信schema深度/节点扫描预算修复与独立复核进行中；此前1157项verify仍准确绑定修复前候选。

## MR004修复与新候选冻结前检查

现有扫描补64层/4096总排队节点预算，property及其他schema关键词均受限。实际深/宽RED→GREEN，MCP41/41通过。随后verify静态/类型/1159unit(1145 PASS/14 SKIP)/174Agent(172 PASS/2 SKIP)/UI/格式/production build通过，但浏览器启动前1423被另一个preview进程占用而退出1，[原始失败](evidence/mainline-final/verify-218-budget-port-busy.log)保留；该进程随后自行退出，无kill/改端口/reuse，受阻browser与development继续重跑。正式独立复核仍待新SHA。

7da PR quality七job全SUCCESS；push applicable verify/deploy/snapshot均SUCCESS，push delivery/governance按事件规则SKIPPED。7da两个Native运行三平台均实际FAIL，分别Linux严格vendor hash、Win8.3路径夹具、Mac根URL夹具；[PR quality](evidence/mainline-final/quality-38422396911-final.json)、[push quality](evidence/mainline-final/quality-38422389843-final.json)、[PR Native](evidence/mainline-final/native-38422396951-final.json)、[push Native](evidence/mainline-final/native-38422389807-final.json)，不把历史失败改为PASS。

[primary读回](evidence/mainline-final/primary-current-readback.json)：51fccfc7/原分支，捕获111文件100相同/11后续改变/0missing，暂存为空。原index当前字节hash不同于捕获时，原因尚未归因，不宣称跨时刻index bytes相同，也不restore别人的index；本任务只在独立工作树提交。

## cc184 产品源码实际收尾证据

独立正式[source review](evidence/mainline-final/review-cc184e59.json)于2026-10-13T17:06:47Z PASS，confirmed openP0/P1/P2=0，MR004关闭；51/51独立窄测试、37原件hash一致、125旧任务保留。源审查不替代runtime。此前端口失败之后[真实528 browser](evidence/mainline-final/browser528-cc184e59.log)全PASS，零重试，[development](evidence/mainline-final/development-cc184e59.log)四步PASS；没有把两次port-busy记录改写为完整verify exit0。

[默认production实际新构建](evidence/mainline-final/managed-build-cc184e59.log) rebuilt:true，Desktop/Web2.1.18，input f2fdcc3fbdc54fc7b3122bcd50dbf46d4da2d699eae38fe6696904ab07b7f124，默认EXE37aa6f2854e9fd9a5540c6975133687beda9cdd7370718a61a03376be6974816。[optional driver Native6](evidence/mainline-final/native6-cc184e59.json)、[默认协议/透明恢复13](evidence/mainline-final/default-native13-cc184e59.json)、[真实Ollama13](evidence/mainline-final/ollama13-cc184e59.json)均PASS，source clean，input相同，driver EXEb6e2ddd32bbd85d697bebca2c3a2112bdcf46e3fb30a6fe1af9c9f9727e7895a独立记录。Ollama模型/许可/本地CPU/NO_CLOUD及小模型质量边界照旧，[实际续聊截图](evidence/mainline-final/ollama-round4-cc184e59.png)。

[官方SDK1.30 Native18](evidence/mainline-final/sdk130-native18-cc184e59.json)、[SDK2.3.1 Native18](evidence/mainline-final/sdk2-native18-cc184e59.json)均PASS，首次与重启保存/连接/manual真实原生确认调用/断开完整。legacy真实initialize/sessionDELETE，modern实际SSE/metadata/标准与参数头/body一致且无session，非法工具过滤；[汇总](evidence/mainline-final/sdk-native-combined-cc184e59.json)及两份raw请求保留。源/EXE before+after完整identity fence，own app exit0/端口关闭。原SDK1第一次虽connect/call成功但错误断言旧confirm IPC而FAIL的[原件](evidence/mainline-final/sdk130-fixture-dialog-red.json)保留；已按锁定plugin-dialog2.7.3实际plugin:dialog|message参数和Native helper点击验证。readonly bridge未改，用实际CDP IPC get_storage_root阳性校验观测；credential命令0仅适用于CDP接入后，接入前IPC未观测，不能声称启动全程vault命令0。SDK2仅own临时Apache-2.0 deps；产品依赖未变。

默认助手按钮截图疑点经当前production Web1440/1920的[几何检查](evidence/mainline-final/assistant-web-geometry-cc184e59.log)和实际[Native稳定几何](evidence/mainline-final/assistant-native-geometry-cc184e59.json)排除：1920×1080/DPR1.5，new按钮右侧仍距panel20.67px，5节点均inside；[稳定截图](evidence/mainline-final/assistant-native-stable-cc184e59.png)。因此没有凭初始截图修改CSS。

cc184 [Hosted原包](evidence/mainline-final/hosted-packages-cc184e59.json)和[crosscheck](evidence/mainline-final/hosted-package-crosschecks-cc184e59.json)：Linux AppImage/deb、Mac app/dmg均分别2checks PASS，每格式14storage markers与ownpid终止；Linux4316files和66次RPATH保护逐条等于strict checker、source before/after同值，原始Node/Codex字节未改，PR/push实际包hash分别记录。Mac4314files/arm64 Node、app/dmg资源与EXE一致，ad-hoc不等于notarization。PRLinux与两Mac Native6已PASS；pushLinux在3checks后的export expectedRevision冲突[原件](evidence/mainline-final/hosted-linux-export-race-cc184e59.log)保留，Windows最终完整结果尚待追加。

已定位原生fixture在两路task成功后没有等180ms autosave，read_revision与export之间仍有合法写入；现在只让测试在UI实际“已保存”且连续两次Native durable revision一致后导出，记录packageExportRevision并保留严格expectedRevision，只有一次export，冲突仍失败。未修改storage、export guard、产品行为、timeout或跳过断言；该同步改动等待新版exact-SHA实跑。

关于旧包措辞：producer自身不额外删除产物，上游锁定[Tauri2.11.4](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.11.4/crates/tauri-bundler/src/bundle/linux/appimage/linuxdeploy.rs#L38)仍重建bundle/appimage；旧证据原件单独归档保留。mock callback的旧文件断言只证明producer自身不清理，不证明上游CLI保留同目录旧包。

## 2026-10-14 最终技术收拢（已完成 887 验证）

[四个 Hosted 最终原件](evidence/mainline-final/hosted-88740c5b-summary-final.json)绑定 head887、base694a：PR quality38440294429七job全PASS，push quality38440285384五PASS与两event skip；PR Native38440294448与push Native38440285848三OS均PASS，六个Native6均完成真实双模型/持久化/包导出，packageExportRevision=17。PR实际构建merge e9822e9642d321d852cf5322e9a7a65f7bcd91be，其tree c1ab0640d08bea64f4e57692df90c41f22a181bb等于本地887 tree。quality两原始输出均Rust154/154与Native TaskHost11/11。不同平台input和不同feature EXE分别记录；不把PR merge或测试driver冒充push/默认发行。

[Linux](evidence/mainline-final/hosted-88740c5b-linux-proof-summary.json)真实AppImage/deb各2checks PASS，每格式4316runtime文件和14存储marker，实际bundled Node24.21 linux/x64及own进程退出；66次RPATH保护的原始资源hash/size逐项一致，actual AppRun启动。[Mac](evidence/mainline-final/hosted-88740c5b-mac-proof-summary.json)真实app/dmg各2checks PASS、4314文件、Node24.20 darwin/arm64与同样的marker/退出验证。两OS实际默认包与optional-driver Native6分别完成；Mac仅免费ad-hoc签名，不能声称notarization或下载后的Gatekeeper验收。

[Windows 独立原包审计](evidence/mainline-final/hosted-88740c5b-windows-proof-summary.json)：PR/push各4次严格4280文件校验、4次shipping EXE/production页面启动、Agent healthy、损坏包拒绝、同版本重装/修复/卸载再装数据保留及2次卸载全PASS；真实elevated=true、独立GUID profile与清理policy有raw证明。small ZIP官方metadata/digest与提取JSON逐一核对，quality约22MB ZIP只保存metadata，未下载且不冒充已核对其内容。独立审计核验与source review分开记录。

本机887 [Native6](evidence/mainline-final/native6-88740c5b.json)全PASS，输入f2fdcc3fbdc54fc7b3122bcd50dbf46d4da2d699eae38fe6696904ab07b7f124、driver EXEc9d5f5b84223f207283daac3fd323aed880b139e787612384b71d32f1dbe5e57。[NSIS原始回执](evidence/mainline-final/installer-88740c5b-receipt.json)与[实际生命周期](evidence/mainline-final/installer-88740c5b-local.json)通过：345846704字节安装器SHA a198b2c501c4b7f17d8646b23bdd10d9d30cbd7292de0ff11f73690d879995a1，安装后EXE831910aa95573b2b4cef41d837e7e1dd8a5fec7c765952007e5295f00922e4d1，包前EXEde7a75fe827130b21b1c50ec9a8f19e8851a637b54ff4b42617eef5ff04ad9d9，均保持准确身份。本机是已有WebView2的Windows；未测cleanVM首次WebView2引导、跨版本升级/回滚、Authenticode。

[887正式增量review](evidence/mainline-final/review-88740c5b.json)2026-10-13T17:33:21.926Z PASS：11个独立状态时序检查、59证据hash、125旧任务原样保留，openP0/P1/P2=0；产品源码与cc184 byte-identical。导出saved/revision前置由本机和六个Hosted Native6实际证明，不放宽strict expectedRevision、不重试导出、不增加timeout。旧7da失败、cc184 Linuxpush conflict与第一次SDK确认夹具失败仍保存。早期17:39/17:42 Hosted jobs未落盘的[归档错误](evidence/mainline-final/hosted-88740c5b-archive-integrity-incident.json)如实记录；最终raw/metadata/JSON均已重新实际取得及readback，未伪造缺失快照。

最后关联验证只在现有Native fixture增加window_appearance_get/set/get，开启后读回并关闭恢复；unsupported必须如实返回reason。Win production UI已有13组含透明恢复实跑；Mac/Linux原生背景接口的此项新断言尚待新冻结head三平台实跑，不能提前报Native7 PASS。产品src/src-tauri/scripts/config/package/version没有新改动。最终门禁将继续跟随[PR #58](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/58)最新SHA的Actions与独立补审。

本轮采用范围：保留KK Tauri/React18、默认Codex/Google及单一Registry/任务/存储；独立实现三协议/严格本地免密、五原创助手与自定义、2–3文本模型独立多轮、安全Markdown/本地分享，融合既有MCP与三平台runtime/透明能力，局部修复来源身份/保存竞态/协议及打包根因。没有复制Cherry AGPL源码、增加付费调用或另一套底层。许可与不采用项目见research/decisions；真实LM Studio及收费云服务、图片视频生成、通用自动工具/OAuth、Mobile和生产发布仍属分别验收的能力。
