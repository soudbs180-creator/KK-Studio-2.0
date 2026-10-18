# Intent：统一发布的 Windows 干净构建与安装器来源修复

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19，Asia/Shanghai；Owner：root-release。
- 状态：IN_PROGRESS / 整体NOT_VERIFIED；交付包角色：current，本次同Task当前交付入口。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base：`0f92cc9ec62a446d60befead61663cf1d910a37b`；base tree：`bed0e6af7106793866f5cc85084f411f52927a4c`；已提交候选：6772722c6c793b9d6e9038003360cac8b83cc6ff/tree dbf488a7bcabfcb8f70a8f97c6cd31175737b855；本轮行尾修复新HEAD：待提交及精确门禁。
- [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。
- 延续同一账本任务；原工具栏、数据兼容与草稿同步包保留历史证据，不重写失败。

## 用户原意与完整目标

继承用户已有完整授权：修复画布内图片工具栏居中、允许被画布边界或面板遮挡且不左右滚动；正常提交并合入main；提供一个内置Windows Agent的setup，同时更新kkai.plus和独立手机网页版，端别及版本清楚，保留原项目、原件、消息、草稿、归档收据、配置和凭据引用。本次只修正式安装器构建链的阻断，不能把整体任务缩减为“构建脚本通过”。

正式41轻量tag `v2.1.41` 已固定0f92，不可移动、删除或重打。其Windows run39142083878失败、artifact为0，没有正式Release、实际installed或生产41通过。若实际修法修改source，须正常PR、精确head独审/Hosted及合入后的main门禁，再以新版本重建；本轮已确定统一顺延2.1.42，已由root调用既有版本helper生成，两版本检查PASS；最终新source/实际工件仍待冻结与门禁，不提前称已发布。

## 677候选与当前行尾修复

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为候选实际现场，不是模拟；Hosted quality仍由唯一watcher观察，不代填终局。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。新HEAD未知；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。新精确head完整验证/独审/Hosted尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 事实、未知和范围

- FACT：Agent4282文件打包及非可选Codex CLI guard成功，NSIS构建完成；receipt writer在line196因git status非空先失败，后续验证/校验文件出现级联ENOENT。
- FACT：独审确认干净checkout没有`releases`父目录，而writer保留`recursive:false`的新子目录创建；这是尚未到达的后续条件缺陷，不能当作本次首因。
- UNKNOWN：41正式CI究竟哪些tracked/untracked路径变脏；未保留具体status，不能归因schemas、Cargo.lock、Agent patch或行尾。
- 原0f92本地npm ci、Agent打包、no-bundle、完整NSIS、fresh CARGO_TARGET_DIR隔离default cargo check及初始基线六阶段均exit0/gitclean；未复现Hosted dirty，41 CI具体路径仍UNKNOWN。原writer在本机缺父目录时已实际复现mkdir ENOENT，与更早的Hosted dirty guard首因分列。
- 包含范围已落工作差异：dirty具体路径诊断、父目录创建、native npm失败立即停止及PR候选完整NSIS/receipt门；显式PRhead/source-event一致与candidate命名，tag push仍fresh重建。真实Win临时Git回归旧7/1→新8/0，未写artifact/未还原源码断言保留；677本地完整verify及独立source审查已PASS，Windows候选FAIL；新行尾delta的精确head/候选CI待验。
- 保持原数据身份、secret、存储schema、origin、应用identifier和所有cold备份；不安装、清理用户数据、扩大部署权限或发真实生成turn。

## 验收条件

| AC   | 可观察结果                                                                                  | 证据                                                                       |
| ---- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| AC-1 | 干净checkout能完成NSIS、不可变receipt及严格四项正式工件；source/tree/文件hash一致           | 精确提交Windows候选构建、receipt verifier及新正式tag工件                   |
| AC-2 | 构建若使source变脏，报告具体路径/status并拒绝receipt；失败不继续后续依赖步骤                | dirty拒绝回归、fail-fast反例；首因UNKNOWN可保留，不靠忽略或恢复输入造clean |
| AC-3 | PR阶段暴露安装器构建链缺陷，正式tag只绑定已审main；41保持原失败历史                         | PR候选完整构建门、正常merge和新版本/tag来源收据                            |
| AC-4 | 完整用户目标仍完成：居中/遮挡/无横滚、单setup内置Agent、三端同版及明确端别、原资料/配置保留 | 实际安装/重开、原件指纹、Native/Web/Mobile生产页面和下载回读               |

当前AC均NOT_VERIFIED。局部构建成功、候选artifact或Agent guard不代替实际用户安装、Codex连接/turn或生产发布验收。
