# 验证记录

任务：TASK-CHERRY-RED-001。初始基线 HEAD：51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c。

当前执行在 `codex/TASK-CHERRY-RED-001-mainline`，base `694a00607f6f63de1b8c43d0ebb117adf5d34f67`，冻结源码 HEAD `7daeba25db511652dbd73833c21b3066f428d7f2`。完整 verify 与 Windows Rust、正式 Native6、真实 Ollama13 和隔离 NSIS 生命周期均有实际记录；[最终记录](mainline-final-status.md) 统一最新证据/身份和剩余 Hosted/最终验收门禁。任务保持 PARTIAL，旧阶段保留执行时含义。

## 初始隔离基线记录

- 隔离初始状态 clean；共享主工作区未提交内容未复制/覆盖。
- npm run typecheck：PASS（基线源码 2.1.13）。
- 首次 npm test：1031 tests，1015 pass，14 skip，2 fail，耗时约 26.3s。失败为 desktopAgentRuntime 两项；执行前新 checkout 缺 vendor/canvas-agent/dist。
- npm run agent:build：PASS，正式脚本校验桌面配置与临时端口/内存凭据并生成 dist；失败测试与完整 baseline 待复跑。
- 默认 worktree 预算拒绝与本任务受控环境创建的具体参数见 [意图](intent.md)。未修改默认门禁。
- WSL 未安装；本机 macOS/Linux 原生运行尚无证据。产品行为、真实 Provider、真实第三方 MCP、三平台安装与签名：NOT VERIFIED。

后续追加每项实际命令、结果与工件，不改写上述首轮失败。

## 首次候选阶段记录（015f1934，非当前完成状态）

- 正式 `agent:build` 后基线完整复跑：1031 tests，1017 PASS、14 SKIP、0 FAIL；基线生产构建 PASS。
- 实现后的完整 `npm test`：1103 tests，1089 PASS、14 SKIP、0 FAIL（约34s）。之后新增 Native/浏览器验收与版本同步需最终回归，不用本记录替代最新检查。
- 定向生产浏览器：10/10 PASS，固定1423、单worker，覆盖五个助手/自定义/只读导入保护、深浅主题 Markdown/危险URL/复制拒绝、Unicode导出、两模型多轮身份及单路401无重试。Provider均为拦截的loopback fixture，未调用云服务。
- Windows Rust完整测试：136/136 PASS；新增空ref免密契约测试 RED→GREEN，当前137项待最终完整复跑。`cargo check --locked`、原生格式检查 PASS。
- 实际 Windows Tauri TaskHost lifecycle：11步 PASS；UUID隔离数据/profile，仅测试进程被清理，旧用户数据未读写。此前构建标签为2.1.13；最新2.1.16候选须另行构建/绑定，不能当已发布或已安装。
- 新三协议/透明窗口 Native fixture `tests/desktop/cherry-red-native.mjs` 已编写，实际运行待回收。
- 新任务工作区依赖最初为本任务创建的junction，仅用于开发基线。正式Desktop校验不接受linked依赖；已仅移除三个任务创建的junction并安装现有锁定依赖，主目录 `.package-lock.json` hash保持，未删除其真实依赖目录。
- JSX/CSS接线后的 typecheck PASS；UI组件门禁已拆按渠道/回复/分享职责，最近检查231文件、0违规。
- 一次完整lint到governance步骤因新账本生成视图滞后失败；按正式 `governance:write` 修复生成视图，最终完整lint仍待回收。既有CHANGELOG发布版本滞后警告未隐藏。
- 完整lint已在仓库正式支持的 `KK_CONTAINER_ROOT=D:/kk-studio` 配置下PASS，外部容器快照仍按原位置检查，没有复制/屏蔽/删除快照；未配置时任务worktree的parent不是容器，记录的missing不是产品源码失败。format:check全量PASS。发布CHANGELOG滞后仍为既有warn。

## 审查纠错

独立预检实际复现并修复：比较任务污染原画布账号、恢复误标原节点与结果边、离线loopback被拦、取消flush窗口被改为失败、无ref本地Native契约、助手过长及内置导入覆盖、guardian stdout/EPIPE。OpenAI单输出新增拒非0索引/多choices；兼容旧服务省略index。具体快照见[审查](review.md)。

## 首次候选未验证边界

Mac/Linux标准Hosted矩阵、新Windows三协议/透明UI fixture、签名/安装、真实系统凭据持久化和第三方MCP/Provider、用户产品验收按实际后续回执填写。Unix runtime门禁暂保持false，不能把workflow YAML/纯函数/Windows结果当三平台通过。

## 81cfd11f 源码收口与实际 Windows 验证

源码候选：`81cfd11fe79279df2379e402ddefa00a908099a8`。Desktop/Web `2.1.16`，Mobile `2.1.1`。后续证据文档提交不代表新的客户端构建；原生回执绑定此源码和实际输入/EXE hash。

| 检查                     | 实际结果                                                                                | 证据                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 完整单测                 | 1105 tests，1091 PASS、14 SKIP、0 FAIL                                                  | [原始输出](evidence/unit-1105.log)                                                     |
| Windows Rust             | 138/138 PASS；fmt/check PASS，保留既有 dead-code warning                                | [实际输出](evidence/rust-windows-81cfd11f.log)                                         |
| Agent                    | 174 tests，172 PASS、2 SKIP、0 FAIL                                                     | 前阶段正式 Agent 全量；此后未改 Agent 源码                                             |
| typecheck/UI/format/lint | PASS；UI 232 文件、0违规；lint 显式使用真实 `KK_CONTAINER_ROOT=D:/kk-studio`            | 当前源实际执行，跨仓快照未屏蔽                                                         |
| 生产浏览器定向           | 21/21 PASS；消息头增强检查另3/3 PASS                                                    | [21项输出](evidence/browser-targeted-21.log)、[3项输出](evidence/browser-header-3.log) |
| 真实 Windows Native      | 13/13 PASS，errors空；三个文本协议各测完成/断流/取消/429，透明窗口读回/正常UI/重载/恢复 | [不可变回执](evidence/native-81cfd11f/receipt.json)                                    |
| 正式随包 Windows 构建    | PASS，`reason: current`；未安装、未签名、未修改官方快捷方式                             | [构建输出](evidence/native-build-216.log)                                              |

Native input SHA256：`9a4cd9f624d1f698799e7b2e9892ce0baa49c3b0da68c3305807deb93545c392`；EXE SHA256：`90301e27389e4b1a2055fdae24a111e14fd470908f24481ef3cb234e9358d62d`。验收前后重新校验12个源码/fixture文件、实际产物与输入 hash；独立 UUID profile/data，仅创建本测试项目、访问本次loopback，无 vault command。透明证据为原生alpha读回与计算CSS，截图不是安装或桌面透底像素验收。[透明截图](evidence/native-81cfd11f/transparent.png)、[恢复截图](evidence/native-81cfd11f/opaque-restored.png)。

前两次 Native 收据分别为12项成功后缺少workspace、初次snapshot读取ENOENT。失败保留；fixture随后正常UI创建空项目，ENOENT仅表示首次文件尚未出现，其它IO/JSON错误仍抛出。第三次13项通过不覆盖前次失败记录。

## 浏览器回归根因

首次完整485项：472 PASS、13 FAIL，见[原始JSON](evidence/browser-initial.json)。从原始base `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c` 导出源码、使用同一锁定依赖和固定1423重跑全部13失败项：8 PASS、5 FAIL，见[基线实际输出](evidence/browser-baseline-13.log)。未用历史报告推断baseline。

本次8项回归已修复并通过：新增分享/透明控件保留原尺寸断言并更新数量；原生package mock明确拒绝透明能力而不混计package写入；远程模型测试提供仅fixture密钥；助手短屏布局与恢复提示真实占位，输入/发送可命中。记录、导出和收起三按钮另验证没有重叠。

保留的5项既有失败：settings-scroll全页面tabpanel定位歧义、ui-governance几何契约、ui-motion视频旧入口、ui-motion任务标签旧契约、unified-image-command旧“切换全部模型”入口。共享主工作区另一UI任务正在修改相同范围，本任务不覆盖其未提交成果；最终完整复跑结果后续追加，不宣称全量浏览器绿。

最终完整复跑485项：479 PASS、6 FAIL，见[原始JSON](evidence/browser-final-81cfd11f.json)、[原始输出](evidence/browser-final-81cfd11f.log)。其中5项与上述实跑baseline一致；另1项panel-resize仍把记录与收起当作相邻的旧两按钮。保留原40px间距上限，改为逐一检查“记录→导出→收起”各相邻间距，并新增不重叠断言，未修改产品源码；panel-resize与消息header随后6/6 PASS，见[实际输出](evidence/browser-panel-6.log)。没有再跑第三轮完整485项，不能将组合结果冒充一次全绿。

## 81c 阶段的平台与集成历史边界

`318676d8300b062aa23a940d80c858c4baedc609` 的免费标准runner [38373366178](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38373366178) 已实际通过Linux/macOS guardian EOF/父进程SIGKILL/输出断开/独占锁测试与cargo check；据此在81c候选启用Unix托管生命周期。81c最终矩阵 [38374225965](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38374225965) **三job均SUCCESS**：Windows x64 138/138 Rust、Linux x64与Mac arm64各138 PASS/1 subprocess辅助fixture IGNORE，三个真实guardian场景均实际运行成功；三个平台的fmt、packaging fixtures、cargo check与随包desktop构建均通过。[真实job与日志摘录](evidence/hosted-81cfd11f.json)。此workflow使用 `--no-bundle`，没有生成安装器、签名或启动Mac/Linux GUI；不代表三系统安装验收。

81c Hosted `git-guards` PASS；`quality` [38374225856](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38374225856) FAIL：独立GitHub checkout没有跨仓容器的 `../docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`，snapshot检查exit1。eslint/version/goals/governance/features/markdown/index成功，此后类型/测试/原生步骤跳过，不能称Hosted verify通过。既有auto-merge workflow无job即FAIL，尚未确定原因，未启用/修改合并控制面。

81c 阶段任务保持PARTIAL：当时主工作区HEAD仍51fccfc7、实际配置2.1.15且有并发UI/模型设置/角色等未提交改动；源码候选仅在任务分支，未移入主工作区、未合并main或发布。当时真实Provider/Ollama/LM Studio、第三方MCP、三系统GUI/安装/系统vault持久化、用户验收仍NOT VERIFIED；后续 Ollama 和系统 vault 的实际阶段证据单列如下，不改写此历史边界。本轮没有收费服务请求、付费依赖或签名采购。

为仓库diff规范，上述console文本只整理CRLF、行尾水平空白和多余末尾空行；原本机输出仍保留，原始/存储SHA256在[规范化清单](evidence/log-normalization.json)，没有改变测试内容、结果或失败记录。JSON原始收据和报告未作结果改写。

独立补审核对时发现，最初Windows138 Rust输出直接生成在evidence目录，规范化前没有另外保留原件。随后对完全相同的Rust源码重新执行完整138项并通过，真实原始输出保存到 `.tmp/cherry-red/rust-proof-raw.log`，更新该项原始/存储hash及执行HEAD；旧规范化记录仍留在74eeae94提交中，没有用重建或推测内容冒充原始输出。

## 已批准继续执行：浏览器与独立克隆收口

本节是20cb之后的新执行证据，不改写以上历史失败。5项既有浏览器失败逐项实跑RED后修复：设置tabpanel限定设置dialog；标准按钮恢复规范8px圆角；视频选中范围包括编辑器而不改变卡片/连线；任务标签从实际34px修正为32px token并检查真实命中；模型选择走现有图片场景菜单。视频生成按钮增加elementFromPoint命中断言，未用force点击掩盖遮挡。canvasGraph/useCanvasControls/ui-governance仅复用当前primary对应相关片段，其余并发候选尚未整体验收。

最终4文件浏览器29/29 PASS，0 skipped/flaky/unexpected，单worker且retries=0；相关canvasGraph单测最终9/9；完整单测1117项，1103 PASS、14 SKIP、0 FAIL。完整单测早于最后两处CSS token替换，最终构建、定向ESLint/Prettier、UI232/0与diff-check再次PASS。原始RED及GREEN日志/JSON保存在`.tmp/cherry-red/browser-closeout-*`、`video-hit-red.log`、`task-tabs-red.log`；尚不能据此声称完整浏览器或新Desktop通过。

独立clone的snapshot根因、实际RED→GREEN和合法Actions事件修复见[CI专项](ci-portability.md)。完整单测1117项另实跑通过；Hosted仍须对新HEAD回读。没有绕过仓库治理检查，未请求的外部container明确显示NOT VERIFIED；显式错误container仍失败。

primary的111个相关src/tests/UI文档候选以独立Git tree保存，源HEAD51fccfc7，候选c79cfaca36241ac38f4e1d2306e16029ae21abda；捕获前后全部文件hash稳定且primary index hash相同。该候选仅用于隔离三方融合，不是primary验收或已发布版本。原工作区/index未被覆盖。

## f8/688 后续 Native 的历史证据

这些回执按字节保存在 [resumed-closeout 清单](evidence/resumed-closeout/manifest.json)，与当前主线的 source/dirty/binary 身份分开，不据此预填当前 PASS。

| 身份                           | 实际证据                                                                                                                                                                                                   | 边界                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f8ead4fa` 本地完整 verify     | [原始输出](evidence/resumed-closeout/verify-f8.log)：1127 unit、174 Agent、519 browser 与 development 四步                                                                                                 | 旧源码本地结果，后续 Hosted unit 9 FAIL 不改写为通过。                                                                                                                                                |
| `f8ead4fa` 真实 Ollama Native  | [通过回执](evidence/resumed-closeout/ollama-native-f8.json)、[首轮失败](evidence/resumed-closeout/ollama-native-first-failure.json)、[服务身份](evidence/resumed-closeout/ollama-runtime.json)             | 实际 Windows release 使用自有 CPU 服务、两模型、项目包和重开；EXE hash `126b1a19a66302c32e29b1dc32db080b4db3320b83752e4df0515331ee4b6721`，不能覆盖当前主线。                                         |
| `f8ead4fa` 安装器              | [文件回执](evidence/resumed-closeout/installer-f8-files.json)                                                                                                                                              | 旧安装器构建/校验事实，不是当前 Native 或安装生命周期验收。                                                                                                                                           |
| `68838135` + 明示 dirty        | [Rust 154 输出](evidence/resumed-closeout/rust154-688-dirty.log)、[Native 六组回执](evidence/resumed-closeout/native-driver-688-dirty.json)、[截图](evidence/resumed-closeout/native-driver-688-dirty.png) | 系统 synthetic vault、模型发现、双模型/Markdown、项目包、Agent、重启六组通过；含 `native-e2e` 驱动，EXE hash `2923a6413214dea3483ffddb2a499fb630552bfd1c8b133673454c730f200db3`，不等同默认发行字节。 |
| `68838135` + dirty 本地 verify | [原始输出](evidence/resumed-closeout/verify-688-dirty.log)：1128 unit（1114 PASS、14 SKIP）、174 Agent（172 PASS、2 SKIP）                                                                                 | 当轮 520 browser PASS；这是早于主线承接的历史统计。                                                                                                                                                   |

## 0e77 Hosted 失败与明确替代条件

旧 `0e77c54cb879bbb856dc916de0e64ab716917865` 的 Hosted 失败保持原义。Windows installer receipt 因 CLI 将 Cargo.toml 的 54 处 CRLF 转 LF 后 status 为 dirty 而拒绝；macOS/Linux Native 五组业务检查已 PASS，但 cleanup 错将 SIGTERM `signalCode` 视为未退出，因此 job 仍失败；quality 的完整 verify 已 PASS，后续 Native 四结果 fixture 仍因旧数量/持久化等待/来源 ID 断言失败。不能把上述局部通过合并为旧运行全绿。

Cargo 根因的 [六组 probe 回执](evidence/resumed-closeout/cargo-cli-probe/receipt.json) 及 [LF control](evidence/resumed-closeout/cargo-cli-probe/lf-control-receipt.json) 保存 CLI 2.11.4、前后字节/hash、空语义 diff 和真实 autocrlf 行为；runner 在 Rust 编译前主动终止，这是 byte/config probe，不是构建通过证据。`.gitattributes` 固定 manifest 为 LF，Native cleanup 和生命周期 fixture 已在候选修正，仍须冻结新提交实际重跑。

旧 `windows-fixed-head` 的 EXE 构建早于最后 R1 前端修复。其仅记录执行时 HEAD，不能证明最终前端来自该 head；保留原回执，最终 Native 必须由输入 hash、sourceHead 和实际 EXE hash 一致的新收据证明。

## 694a 主线 dirty 候选：审查修复前的完整本地结果

执行 checkout：`D:/kk-studio/.worktrees/TASK-CHERRY-RED-001`；branch：`codex/TASK-CHERRY-RED-001-mainline`；base/HEAD：`694a00607f6f63de1b8c43d0ebb117adf5d34f67`；Desktop/Web `2.1.17`、Mobile `2.1.1`。以下结果覆盖执行时的未提交候选，不是该 base 的已提交产品，也不自动覆盖其后包装脚本/文档增量。

| 检查                                  | 实际结果                                                                                                                           | 证据/限制                                                                                                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                      | exit 0；1127 unit（1113 PASS、14 SKIP、0 FAIL）、174 Agent（172 PASS、2 SKIP、0 FAIL）、522 browser 全 PASS、development 四步 PASS | [主线原始输出](evidence/resumed-closeout/verify-mainline-dirty.log)，由 `.tmp/cherry-red/mainline-verify-second.log` 按字节复制。浏览器 build/preview 为本轮新产物；不是新 Desktop 包。  |
| lint/typecheck/UI/format 与浏览器构建 | PASS；UI 237 文件、0 违规；36 features、126 tasks、0 治理违规                                                                      | 同一完整输出；snapshot 默认只验证仓库，外部 container 显示 NOT VERIFIED。                                                                                                                |
| 当前 Windows Rust                     | fmt check、`cargo test --locked` exit 0，154 PASS、0 FAIL/IGNORE                                                                   | [当前 Rust 原始输出](evidence/resumed-closeout/rust154-mainline-dirty.log)；不是 Mac/Linux 本轮 Rust 或 Native GUI 证明。                                                                |
| code-health                           | exit 0，2 项 advisory，0 allowed                                                                                                   | 实测 App FILE_LINES 3244 vs base 3241、FUNC_LINES 395 vs 388；未降低 threshold、变更模式或添加豁免，不是债务清零。                                                                       |
| Native build 输入保护                 | dirty guard 实跑 exit 1，正确拒绝未提交源码                                                                                        | 本机 `.tmp/cherry-red/native-build-dirty-guard.log`；拒绝是防线证据，不是 Native build 成功。helper 保留 porcelain 首行空格，并绑定 frontend/Native/Cargo/build 输入、HEAD 和 EXE hash。 |

主线 125 项原任务均保留，追加 Cherry 后 126 项，Cherry 保持 PARTIAL/NOT_VERIFIED。primary 捕获的 111 项在 2026-10-13 13:01:59 UTC 回读为 100 同、11 变、0 缺；后续 Agent/Provider recovery 依赖变更保留原位，不能将本候选覆盖或称 primary 已整合，见 [主线承接](mainline-integration.md)。

最终闭环仍需：冻结可审阅提交；按新 head 重建 Windows 默认发行/测试驱动与安装器；取得三平台 Hosted、默认 macOS/Linux 包和相应 Native/安装回执；完成该 base/head 的 fresh 独立复审；最终用户产品验收。真实第三方 MCP、真实 LM Studio/收费 Provider、签名/发布没有本轮完成证据，继续 NOT VERIFIED。

## MR001–MR003 与默认包装增量：当前定向结果

fresh-context `cherry_mainline_review` 对当前 dirty 候选确认三项 P2。下表记录实际修复与定向结果，不把前轮 522 项完整 verify 继承为修复后的全量结论；root 已开始重跑最新完整门禁，结果待回收。

| 项目                          | 原缺陷与最小修复                                                                                                                                                                                                                                                               | 实际验证与当前边界                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MR001：Anthropic 浏览器请求头 | authenticated Anthropic Messages/discovery 增加 `anthropic-dangerous-direct-browser-access: true`，与 [官方 SDK client.ts](https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/client.ts) 1678–1681 的浏览器允许头一致；`authMode: none` 不加该头。 | [RED](evidence/resumed-closeout/anthropic-browser-header-red.log) 1 FAIL，实际 `null !== 'true'`；[providerProtocols 全文件 GREEN](evidence/resumed-closeout/anthropic-browser-header-green.log) 24/24 PASS。fresh reviewer 已关闭 dirty 预检项；真实 Anthropic 服务/CORS 联调仍 NOT VERIFIED。               |
| MR002：模型目录身份           | 匹配完整 id/baseUrl/credentialRef/protocol/authMode；仅 legacy `undefined` 采用 OpenAI-compatible/api_key，显式 null、非法协议/认证和远程 none 拒绝。同身份刷新保留 manual 声明，身份变化不携带同名旧声明。                                                                    | 作者 RED 为 14 项、10 FAIL，仅在当轮工具 stdout，未另存原始 log；[GREEN](evidence/resumed-closeout/catalog-identity-green.log) 14/14 PASS，相关组合作者实跑 76/76 PASS；fresh reviewer 报告独立组合 38/38 PASS 并关闭 dirty 项。没有伪造缺失 RED 文件。                                                       |
| MR003：迟到失败污染新健康状态 | App 的两个失败处理分支增加已有成功路径采用的 `reservation.healthUnchanged()`；协议、认证或 healthRevision 已变化时，旧 401/429 不更新新配置。旧身份 429→cooldown、403→quarantine 保留。                                                                                        | [真实浏览器 RED](evidence/resumed-closeout/late-health-red.log) 为 expected active、received quarantined；[GREEN](evidence/resumed-closeout/late-health-green.log) 21/21 PASS，retries=0，含六项 protocol/auth/revision 变化后 401/429 场景与旧状态回归。作者证明已取得，最终 fresh exact-head 审查仍待完成。 |
| 默认 macOS/Linux 包           | `native-crossplatform.yml` 与 `tests/desktop/package-portability.mjs` 实施完成：默认 feature 构建 macOS app/dmg、Linux AppImage/deb；原包字节/可执行权限/随包 runtime/platform/arch/hash 与输入/HEAD 校验，隔离默认启动和存储初始化 smoke，macOS 免费 ad-hoc 签名。            | [self-test](evidence/resumed-closeout/package-portability-selftest.log) 9/9 PASS，只证明校验器和隔离 Node fixture 契约。四种实际包、签名检查与默认可执行文件启动仍须 Hosted 实跑，NOT VERIFIED；notarization 未验。                                                                                           |
| Native 随包 Agent 身份        | build receipt 增加当前 packaged `runtimeManifestSha256`，运行前校验当前 manifest，实际启动 target 再校验对应 manifest hash，防止复用旧 Agent 资源；默认 shipping 不含测试 driver。                                                                                             | fresh reviewer 回读时当前两个 manifest hash 相同；这是当时检查事实，不替代最终 Native 实跑。新 receipt/target guard 源码已接入，正式构建仍须冻结新提交。                                                                                                                                                      |

workflow 的 push 现覆盖 main、旧任务分支与 mainline 任务分支，paths 纳入实际 frontend/Native/build 输入；PR 同样覆盖相关输入。配置完成不等于 workflow 已在新 head 运行成功。

MR003 增加两条健康围栏后，当前 code-health 实跑 exit 0：App FILE_LINES 3246 vs base 3241、FUNC_LINES 395 vs 388，仍 2 项 advisory、0 allowed，threshold/mode/豁免未放宽。前轮完整 verify 记录的 3244 是当时值，不回写旧日志。最新完整 verify、final head Native/四种包/Hosted/Delivery 与用户验收继续待实际结果。

## 最新完整验证与并发保存复查

三项独立审查修复后，主线 dirty 候选完整 `npm run verify` 退出码 0：1138 unit（1124 PASS、14 SKIP）、174 Agent（172 PASS、2 SKIP）、UI 237/0、格式/类型/lint/build 通过、开发插件四步 PASS。528 项浏览器中 527 首试通过，一项双窗口保存测试首次 5 秒等待超时、重试通过；原日志完整保留，不能称为零重试全绿。随后相同测试执行 8 次、禁用重试，8/8 PASS；没有修改保存源码、测试断言、超时或检查标准。首次紧接完整验证运行复查时，1423 仍在清理并报告占用；确认端口释放后执行实际复查，没有停止其他进程。

对应原件：[最新完整日志](evidence/resumed-closeout/verify-mainline-final-dirty.log)、[八次复查](evidence/resumed-closeout/concurrent-save-recheck.log)。这组结果继续明确是当前未提交集成源码，最终 Native/原包/Hosted 与正式 SHA 审查需分别绑定冻结提交。

## 2026-10-14 当前验证覆盖

887 四exact-head Hosted全部SUCCESS、六Native6、Linux/Mac四种默认包、Windows严格NSIS与同版本生命周期、独立source及Windows artifact审计已完成。各source/feature/input/EXE/ZIP身份、历史失败、原件hash与未验项以[最终记录](mainline-final-status.md)为准。当前只新增Native原生背景get/set/readback/restoration测试，尚待新head实跑；不以旧PASS冒充新Native7。
