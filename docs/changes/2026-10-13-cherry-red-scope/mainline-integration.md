# 当前主线承接与证据边界

任务：TASK-CHERRY-RED-001。当前 base/HEAD 为 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，Cherry 净变更仍是未提交候选；本节记录承接与当前本地证据，不是已经合入 main、primary 或发布的声明。任务保持 PARTIAL/NOT_VERIFIED。

新分支 `codex/TASK-CHERRY-RED-001-mainline` 从实际 `origin/main@694a00607f6f63de1b8c43d0ebb117adf5d34f67` 创建，包含 PR56 的代码健康规则、固定 Actions 与现行交付门禁。保留旧 Cherry 分支的全部提交，没有 rebase、reset、force push 或直接推送 main。

移植输入是 `51fccfc7 → 23dbdd6b` 净 patch，不带旧本地主线历史。解决样式、交互测试、Launcher 和治理的冲突；保留当前 main 的 pluginLoader/pluginTypes、全部原账本任务、有限历史例外与审核规则。主线原有 125 项任务均保留，只追加本任务，现126项：76 DONE、31 PARTIAL、11 TODO、4 BLOCKED、4 REVIEW。

两个原 UI 交付包按原字节归档到 `evidence/primary-ui/`，保留原 Task ID、作者与阶段状态。它们是捕获候选的来源证据，不冒充本任务关闭了同伴任务。对应 111 个源文件捕获候选 c79 的 manifest 位于 `evidence/resumed-closeout/primary-ui-c79-manifest.json`。2026-10-13 13:01:59 UTC 比对 primary：100 同、11 变、0 缺。后续变化涉及 Agent/Provider recovery 和额外新模块，primary 原位和 index 保留；不得据本候选覆盖那些并发改动。

为适应主线健康检查，拆分协议、Markdown、目录、文档生命周期及组件的复杂条件；模型/任务/恢复在已有模块内拆分。新增原生请求构造、比较提交、输入 UI 派生值和原 registry 生命周期边界，不新增供应商/任务/权限系统。当前调用仍写入同一项目快照、同一 TaskHost 和同一 SkillRegistry。输入对照包括 200 快照、144恢复场景、183 Markdown、420 SSE序列、2160文档状态，以及6736组件派生组合，结果及错误诊断相同。App新增逻辑从主文件提取；未调整检查模式、目标、阈值或添加豁免。实际 App FILE_LINES 3244 vs base 3241、FUNC_LINES 395 vs 388，仍有 2 项 advisory、0 allowed；exit 0 来自主线既有 advisory 模式，不能称整个旧 App 已重写或债务清零。

主线 dirty 集成候选的完整 `npm run verify` exit 0：[原始输出](evidence/resumed-closeout/verify-mainline-dirty.log) 为 1127 unit（1113 PASS、14 SKIP、0 FAIL）、174 Agent（172 PASS、2 SKIP、0 FAIL）、522 browser 全 PASS、development 四步 PASS，UI 237/0、lint/typecheck/format/浏览器 build 通过。当前 Windows fmt/test exit 0，[原始输出](evidence/resumed-closeout/rust154-mainline-dirty.log) 为 154/154 PASS。日志按字节归档，hash 与来源见 [manifest](evidence/resumed-closeout/manifest.json)；其 sourceHead 是基线，dirty 差异仍需最终提交绑定。此后包装/文档增量不自动继承旧运行结论。

驱动构建入口 `scripts/agent/native-e2e-build.mjs` 会验证源已提交，捕获完整 frontend/Native/Cargo/build 输入，构建后核对输入和 HEAD 未变；回执绑定独立 feature EXE hash。测试拒绝 HEAD、输入或二进制 hash 不匹配。porcelain 解析保留首行状态空格；当前 dirty guard 实跑 exit 1，正确拒绝未提交源码，本机日志 `.tmp/cherry-red/native-build-dirty-guard.log`。旧 `windows-fixed-head` 回执只记录执行时 HEAD，EXE 早于最后 R1 前端修复，因此不作为最终 Native 前端证明；原始历史仍保留。

旧0e77 Hosted实际失败保留：Windows installer receipt 指出 Cargo.toml 被 CLI 改写；Linux/macOS 原生五组已过，但测试误把 SIGTERM 的 signalCode 当作未退出；quality完整verify通过，Native四结果断言没有等待持久化，也未绑定UI source ID。新候选分别处理，仍须实际重跑，不将旧运行改写为 PASS。

Cargo问题已用官方 CLI2.11.4 在独立副本准确复现6组：[probe 回执](evidence/resumed-closeout/cargo-cli-probe/receipt.json) 保存各自 before/after hash、字节、空语义 diff 和输出；CRLF 输入唯一变化为54处转LF，Git LF 输入未变。Windows core.autocrlf=true 下没有属性时 status 仍报 modified；[LF control](evidence/resumed-closeout/cargo-cli-probe/lf-control-receipt.json) 证明固定属性后的字节不变、没有 modified worktree column。probe 的 runner 在编译前主动退出，不冒充 build PASS。通过 `.gitattributes` 固定该 manifest 为 LF，保留所有真实源码变更的拒绝门禁；没有恢复或豁免 Cargo 来制造 clean 回执。验收引用顶层 proof，临时私有项目副本不作为产品证据。

## 仍需形成的当前提交证据

| 项目                                      | 当前状态         | 继续条件                                                                                                              |
| ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| 隔离 mainline 本地源码/浏览器/Rust        | 已取得执行时证据 | 新增包装或 Native 变更须跑受影响检查，完整门禁在冻结 head 后绑定。                                                    |
| 最终不可变提交与 Delivery                 | NOT VERIFIED     | 收齐独占写入者差异、明确 stage 仅本任务文件，冻结可审阅 base/head 后执行门禁。                                        |
| Windows 默认 release、驱动与安装生命周期  | NOT VERIFIED     | 使用当前新 head 重新构建，校验输入/EXE/installer hash 与运行路径；旧 f8/688/windows-fixed-head 不替代。               |
| 默认 macOS/Linux 包、三平台 Hosted/Native | NOT VERIFIED     | 默认发行打包实现完成、校验器 self-test 9/9；须取得新 head 的四种实际包、真实 job、包收据和工件 hash；旧0e77失败保留。 |
| 当前 fresh 独立复审                       | NOT VERIFIED     | 独立上下文核对实际 `694a0060 → final head`，覆盖冲突处理、身份/恢复、构建与包装门禁。                                 |
| primary 后续依赖与最终产品验收            | NOT VERIFIED     | 保护原位 11 项变化及其依赖；取得当前产品结果的用户验收，不能以捕获候选冒充已回传。                                    |

本轮不直接推送 main、不绕过 Hosted/独立审查或安装门禁，也不以本地 PASS 关闭真实第三方 MCP/Provider、签名/发布等独立能力。

## 当前远端规则与集成条件

2026-10-13 root 通过 GitHub connector 实际回读 [目标仓库](https://github.com/soudbs180-creator/KK-Studio-2.0)，remote main 仍是 `694a00607f6f63de1b8c43d0ebb117adf5d34f67`。三个 ruleset 均 active：`23866923` 对全 refs 禁止删除/non-fast-forward；`23866924` 保护 `v*` tag immutable；`23866925` 对 main/master/release 要求 PR、strict 当前 verify + delivery 和线程解决，approving reviews 为 0；三者均 no bypass。没有 merge queue 或额外 required checks 已启用的证据，不扩大本次回读结论。

独立 fresh-context `cherry_mainline_review` 正在只读 dirty 预检，交接时报告 57/57 窄测试 PASS；正式审查仍需冻结提交。保持 current-head Hosted/Delivery、独立审查和用户产品验收分别有证据；不用作者会话 approval，也不自动开启 auto-merge。旧规则文件和旧保护缺口的历史记录不由本次文档回读改写。

## 审查修复与包装实现的后续增量

默认 macOS app/dmg、Linux AppImage/deb 的 workflow 与包校验器已实施，[self-test](evidence/resumed-closeout/package-portability-selftest.log) 9/9 PASS；实际四种包及默认启动仍 NOT VERIFIED，等待 Hosted。push 覆盖 main、原 Cherry 与 mainline 分支，并纳入实际 frontend/Native/build 输入 paths；默认 shipping 不含 driver。Native receipt 另绑定 packaged runtimeManifestHash，并校验实际 target 的 manifest，拒绝复用旧 Agent 资源。

fresh 预检确认三项 P2：MR001 authenticated Anthropic 请求按 [官方 SDK](https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/client.ts) 补浏览器允许 true 头，none 未改；MR002 目录完整匹配 id/base/ref/protocol/auth，严格校验并仅 undefined 兼容旧默认；MR003 两个失败处理分支使用 `reservation.healthUnchanged()`，不让旧 401/429 污染已保存的新配置。MR001/MR002 已在 dirty 预检关闭；MR003 作者 browser 21/21、零重试通过，仍需最终正式 head 复核。详细 RED/GREEN 与缺失 RED log 边界见 [验证](verification.md) 和 [审查](review.md)。

前轮 mainline 完整 verify 的 1127/174/522 是审查修复前结果。root 正重跑当前全部增量的完整 verify，尚不预填 PASS；本地 Native/默认包/Hosted/Delivery 与最终独立审查继续等待冻结新提交。增加两条失败健康围栏后当前 App FILE_LINES 3246 vs base 3241、FUNC_LINES 395 vs 388，2 项 advisory、0 allowed；前轮 3244 不回写，阈值/模式/豁免没有放宽。

逐项复核主线原有125个账本对象与694a原文JSON语义完全一致，只有本任务新增。最新fullverify1138unit/174Agent与528browser（一次首试超时后重试），同一双窗口保存场景随后8次零重试通过。失败原件及复查均保留。记录原始诊断的log和error-context按不可变数据设置 -diff，保留原空格/CRLF及manifest hash，不格式化原件；仅作用于本任务的明确证据路径，产品源码/类型/行为检查和严格receipt均未放宽。
