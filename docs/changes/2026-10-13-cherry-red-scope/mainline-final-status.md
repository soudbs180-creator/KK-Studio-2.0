# 主线候选最终验收记录

当前源码候选：2.1.18（完整本机验证后的待冻结工作树）；上一冻结提交 `7daeba25db511652dbd73833c21b3066f428d7f2`，base `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，[PR #58](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/58) 为 draft。任务仍为 PARTIAL：本机实现与验收有证据，最终三平台 Hosted、补审和用户产品验收分别判定。原 primary/index、11 项后续并发源文件和 125 项原任务均保留，没有合并 main、更新官方快捷方式或发布。

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
