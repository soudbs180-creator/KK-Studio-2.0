# Spec：干净安装器来源与失败边界

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；状态：IN_PROGRESS / NOT_VERIFIED。
- [Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。
- 实现基线：source0f92/treebed0；正式失败run39142083878。本包补充构建链要求，不替代既有工具栏、数据保护、草稿同帧和三端发布契约。

## 安装器构建与来源

复用`npm run client:installer`、`client:installer:receipt`、`client:installer:verify`及既有installed verifier。正式receipt必须绑定实际已提交source/tree、三端版本、NSIS修正后的安装EXE身份、Agent manifest和全部运行文件；候选PR构建单列logical head、实际checkout/merge SHA及完整tree，不冒充正式tag产物。

1. 保留writer的clean-source guard，包括非忽略untracked路径；失败应有具体路径/status诊断，不输出文件内容、凭据或用户数据。
2. 不恢复构建后的tracked文件、扩大ignore、屏蔽git status或放宽来源检查来制造clean。任何实际生成输入漂移先解释和修正其来源，再审查。
3. workflow显式创建`releases`父目录；最终`releases/installer-<actual commit>`仍由writer以exclusive新子目录创建，已有child必须失败，不覆盖旧receipt或产物。
4. 每个native npm调用后立即检查exit并throw；receipt失败时不得继续verify/Get-FileHash或上传。PowerShell ErrorActionPreference不能独自替代native exit检查。
5. PR候选Windows门在相关安装器/构建链变更时跑真实完整NSIS与receipt验证，复用现有命令并保存实际source/tree。677已提交workflow已落显式PR head checkout、source/event head相等核对及candidate命名；正式tag push仍fresh重建。677 Hosted候选已执行并FAIL/artifact0，实际3M路径见下；行尾修复后新head仍须重新验证完整链。

677实现已保留writer的dirty拒绝并在错误中输出实际status；workflow仅创建父目录并对native npm失败立即throw。真实Windows临时Git库回归在旧writer得7PASS/1FAIL（原错误不含modified/untracked路径），新writer得8PASS/0FAIL，并断言未写artifact、未还原被改源码；它证明本地诊断合同，不解释41云端究竟哪个路径变脏。

## Windows行尾契约与证据边界

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为候选实际现场，不是模拟；Hosted quality仍由唯一watcher观察，不代填终局。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。新HEAD未知；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。新精确head完整验证/独审/Hosted尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 数据、版本与发布

- 不改变用户数据根、系统凭据service、存储key/schema或浏览器origin，不向备份写入、不从sandbox覆盖真实资料；所有旧cold和原失败保留。
- `v2.1.41`固定0f92，失败run不可改写为成功。三端已由root运行既有版本helper统一为2.1.42，version:check与version:consistency均PASS；最终source及发布仍待验。既有migration2.1.36和CHANGELOG37落后42警告保留，不在本包冒充新缺陷或已修正。
- 工件取得后仍须官方digest、严格flat4、可信expected source/tree和installed逐文件校验；候选工件不能改名当正式Release。
- Desktop/Web/Mobile Web三端最终显示统一实际版本与端别；手机Web独立本机资料不等于跨设备自动同步。正式Release、安装/原资料保护、线上回读各自验收。

## 验收映射

| Intent AC | 检查                                                                              | 当前状态                                                                                    |
| --------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| AC-1      | 新精确head干净checkout全bundle+receipt；缺父目录、已有child与hash/source/tree反例 | 677候选实际FAIL/artifact0，新行尾修复待验                                                   |
| AC-2      | 构建阶段status路径证据；dirty拒绝及native失败不执行后续步骤                       | 677 diagnostic回归8/0；候选已报实际3M并失败，新行尾fixture/Hosted待验；41具体dirty仍UNKNOWN |
| AC-3      | 候选完整安装器Hosted/独审、正常PR/main及新版本来源                                | NOT_RUN；统一2.1.42已确定，发布待验                                                         |
| AC-4      | 真实日常installed/Agent及配置原件保留、工具栏几何、组合Web生产回读                | NOT_VERIFIED                                                                                |

本地clean阶段不排除Hosted独有漂移；缺父目录和级联失败是独立的已证问题，不能据它们补造dirty根因。
