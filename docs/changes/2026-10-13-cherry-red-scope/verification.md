# 验证记录

任务：TASK-CHERRY-RED-001。基线 HEAD：51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c。

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

|检查|实际结果|证据|
|---|---|---|
|完整单测|1105 tests，1091 PASS、14 SKIP、0 FAIL|[原始输出](evidence/unit-1105.log)|
|Windows Rust|138/138 PASS；fmt/check PASS，保留既有 dead-code warning|[实际输出](evidence/rust-windows-81cfd11f.log)|
|Agent|174 tests，172 PASS、2 SKIP、0 FAIL|前阶段正式 Agent 全量；此后未改 Agent 源码|
|typecheck/UI/format/lint|PASS；UI 232 文件、0违规；lint 显式使用真实 `KK_CONTAINER_ROOT=D:/kk-studio`|当前源实际执行，跨仓快照未屏蔽|
|生产浏览器定向|21/21 PASS；消息头增强检查另3/3 PASS|[21项输出](evidence/browser-targeted-21.log)、[3项输出](evidence/browser-header-3.log)|
|真实 Windows Native|13/13 PASS，errors空；三个文本协议各测完成/断流/取消/429，透明窗口读回/正常UI/重载/恢复|[不可变回执](evidence/native-81cfd11f/receipt.json)|
|正式随包 Windows 构建|PASS，`reason: current`；未安装、未签名、未修改官方快捷方式|[构建输出](evidence/native-build-216.log)|

Native input SHA256：`9a4cd9f624d1f698799e7b2e9892ce0baa49c3b0da68c3305807deb93545c392`；EXE SHA256：`90301e27389e4b1a2055fdae24a111e14fd470908f24481ef3cb234e9358d62d`。验收前后重新校验12个源码/fixture文件、实际产物与输入 hash；独立 UUID profile/data，仅创建本测试项目、访问本次loopback，无 vault command。透明证据为原生alpha读回与计算CSS，截图不是安装或桌面透底像素验收。[透明截图](evidence/native-81cfd11f/transparent.png)、[恢复截图](evidence/native-81cfd11f/opaque-restored.png)。

前两次 Native 收据分别为12项成功后缺少workspace、初次snapshot读取ENOENT。失败保留；fixture随后正常UI创建空项目，ENOENT仅表示首次文件尚未出现，其它IO/JSON错误仍抛出。第三次13项通过不覆盖前次失败记录。

## 浏览器回归根因

首次完整485项：472 PASS、13 FAIL，见[原始JSON](evidence/browser-initial.json)。从原始base `51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c` 导出源码、使用同一锁定依赖和固定1423重跑全部13失败项：8 PASS、5 FAIL，见[基线实际输出](evidence/browser-baseline-13.log)。未用历史报告推断baseline。

本次8项回归已修复并通过：新增分享/透明控件保留原尺寸断言并更新数量；原生package mock明确拒绝透明能力而不混计package写入；远程模型测试提供仅fixture密钥；助手短屏布局与恢复提示真实占位，输入/发送可命中。记录、导出和收起三按钮另验证没有重叠。

保留的5项既有失败：settings-scroll全页面tabpanel定位歧义、ui-governance几何契约、ui-motion视频旧入口、ui-motion任务标签旧契约、unified-image-command旧“切换全部模型”入口。共享主工作区另一UI任务正在修改相同范围，本任务不覆盖其未提交成果；最终完整复跑结果后续追加，不宣称全量浏览器绿。

最终完整复跑485项：479 PASS、6 FAIL，见[原始JSON](evidence/browser-final-81cfd11f.json)、[原始输出](evidence/browser-final-81cfd11f.log)。其中5项与上述实跑baseline一致；另1项panel-resize仍把记录与收起当作相邻的旧两按钮。保留原40px间距上限，改为逐一检查“记录→导出→收起”各相邻间距，并新增不重叠断言，未修改产品源码；panel-resize与消息header随后6/6 PASS，见[实际输出](evidence/browser-panel-6.log)。没有再跑第三轮完整485项，不能将组合结果冒充一次全绿。

## 当前平台与集成边界

`318676d8300b062aa23a940d80c858c4baedc609` 的免费标准runner [38373366178](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38373366178) 已实际通过Linux/macOS guardian EOF/父进程SIGKILL/输出断开/独占锁测试与cargo check；据此在81c候选启用Unix托管生命周期。81c最终矩阵 [38374225965](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38374225965) **三job均SUCCESS**：Windows x64 138/138 Rust、Linux x64与Mac arm64各138 PASS/1 subprocess辅助fixture IGNORE，三个真实guardian场景均实际运行成功；三个平台的fmt、packaging fixtures、cargo check与随包desktop构建均通过。[真实job与日志摘录](evidence/hosted-81cfd11f.json)。此workflow使用 `--no-bundle`，没有生成安装器、签名或启动Mac/Linux GUI；不代表三系统安装验收。

81c Hosted `git-guards` PASS；`quality` [38374225856](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38374225856) FAIL：独立GitHub checkout没有跨仓容器的 `../docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`，snapshot检查exit1。eslint/version/goals/governance/features/markdown/index成功，此后类型/测试/原生步骤跳过，不能称Hosted verify通过。既有auto-merge workflow无job即FAIL，尚未确定原因，未启用/修改合并控制面。

当前任务保持PARTIAL：主工作区HEAD仍51fccfc7、实际配置2.1.15且有并发UI/模型设置/角色等未提交改动；源码候选仅在任务分支，未移入主工作区、未合并main或发布。真实Provider/Ollama/LM Studio、第三方MCP、三系统GUI/安装/系统vault持久化、用户验收仍NOT VERIFIED；本轮没有收费服务请求、付费依赖或签名采购。

为仓库diff规范，上述console文本只整理CRLF、行尾水平空白和多余末尾空行；原本机输出仍保留，原始/存储SHA256在[规范化清单](evidence/log-normalization.json)，没有改变测试内容、结果或失败记录。JSON原始收据和报告未作结果改写。

独立补审核对时发现，最初Windows138 Rust输出直接生成在evidence目录，规范化前没有另外保留原件。随后对完全相同的Rust源码重新执行完整138项并通过，真实原始输出保存到 `.tmp/cherry-red/rust-proof-raw.log`，更新该项原始/存储hash及执行HEAD；旧规范化记录仍留在74eeae94提交中，没有用重建或推测内容冒充原始输出。
