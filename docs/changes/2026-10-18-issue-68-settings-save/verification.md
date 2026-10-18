# Verification：Issue 68 设置保存与关闭同步

- Task ID：`TASK-ISSUE-68`；状态：LOCAL FINAL / Hosted待验；2026-10-18 UTC。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。
- 关联唯一 [Issue #68](https://github.com/soudbs180-creator/KK-Studio-2.0/issues/68)。仅使用既有 `task-ledger.json`。
- Base：`6b933f4ffd80cdd5ca2d3508678a4562fc2b02d8`；branch：`fix/TASK-ISSUE-68-settings-save`；本轮为候选 dirty 源码验证；原回执 sourceHead 仍为 base，不能冒称绑定后续新提交。测试内容由下列 SHA256 绑定，后续提交 SHA 由 review/PR 另记。
- cwd：`C:/Users/Administrator/Documents/Codex/2026-10-18/task/issue68`。本执行环境仅允许该 C 盘任务目录写入，使用 `KK_WORKTREE_ROOT` 覆盖；Git 已登记隔离树，未移动原工作树。创建前已确认远端 main SHA，随后 fetch 再核对一致；创建前漏跑 worktree 预算检查，创建后检查仅确认 `REUSE_EXISTING_BRANCH`，不冒称前置门禁已执行。
- Node 24.20.0；全新 root/Agent/plugins 实体依赖使用锁文件 `npm ci --ignore-scripts`，无 junction/共享依赖写入。首次沙箱安装无进展，已中断本任务进程；升级网络安装成功。

## 失败证据与根因边界

- [原 quality run](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/39060650077) 的 verify 在原生测试 629 行失败。artifact `12111469102` 的 ZIP 39,317,501 字节，SHA256 `63a4ee19811f3dcb408a8cdfffc17943dfa60467ee28d9cbc87d30298322a798`，已下载并完整解压到任务父目录。
- 原 receipt SHA256 `10c91724b8b6480c95f2724802797fb76e6a27a26ac005eb5aeb90a7e833b11b`：sourceHead 为 base、前 8 checks 成功、整体失败、凭据清理完成。最终 UI 有准确保存成功提示，但设置 dialog 始终 open。原件不改写。
- FACT：原测试在保存 click 后立即关闭，再点模型，缺少异步保存成功和弹窗消失两个后置条件。产品的保存期间禁止关闭契约在受控延迟浏览器测试中正常，释放后成功关闭并打开模型菜单。
- INFERENCE：busy 经 effect 传播，关闭 actionability 检查与事件派发间的状态翻转可能吞掉点击。原 CI 没有 pointer/click 轨迹，精确吞点击时序尚未证明，不宣称产品关闭逻辑存在缺陷。
- 只读候选 `fe103d2b0ac24da90f5820b8034f6a016a79221b` 中的 429 修复属于生成结果保存；设置目录和 native lifecycle 与 base blob 相同，没有覆盖 #68，未修改/合并该候选。

## 实际验证

日志及实验原件保留于本工作树父目录；测试运行目录均独立，不清理历史结果。

| 命令/检查                                                        | 结果                              | 证据及边界                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| baseline `npm run typecheck` / `npm run build`                   | PASS                              | `baseline-typecheck.log` / `baseline-build.log`；既有 bundle 体积 warning 保留                                                                                                                                                                                                                                                           |
| baseline settings-navigation，workers=1/retries=0                | 2 PASS                            | `baseline-settings-navigation.log`                                                                                                                                                                                                                                                                                                       |
| 延迟 native IPC fixture settings-navigation，workers=1/retries=0 | 2 PASS                            | `delayed-save-settings.log`；真实生产 bundle，native IPC 为受控 fixture                                                                                                                                                                                                                                                                  |
| `npm run lint`                                                   | PASS                              | `lint-initial.log`；测试代码改动上的初次静态检查                                                                                                                                                                                                                                                                                         |
| 完整 Node/deploy tests                                           | 1852 PASS / 20 既有 skip / 0 FAIL | `node-tests.log`；本地平台条件使skip数与Hosted不同，未修改测试选择或skip条件                                                                                                                                                                                                                                                             |
| 官方 `ensureDesktopRelease`                                      | PASS                              | `native-build.log`；当前源码独占构建，不启动日常客户端                                                                                                                                                                                                                                                                                   |
| 真实 Native 延迟回执实验                                         | 13 checks PASS / exit 0           | 前两次直接替换冻结 Tauri invoke/全局对象未安装成功，失败原件分别为 `native-delay-evidence` / `native-delay-evidence-v2`；不当作产品失败；第三次复用既有 transport hook 成功，native-delay-evidence-v3/receipt.json：真实配置/凭据先落盘、UI无成功提示、关闭/Escape/遮罩保持保护，release后正常关闭并打开模型菜单，全链完成、凭据清理成功 |
| 完整 npm run verify                                              | PASS / exit 0                     | verify.log；Node1852 PASS/20既有skip，Agent199 PASS/2既有skip，产品Edge827首试PASS/0flaky/0skip，设计Node41+Edge8 PASS，开发态4步PASS                                                                                                                                                                                                    |
| Rust fmt / tests --no-default-features --locked                  | PASS / exit 0                     | cargo-fmt.log / cargo-test.log；213 PASS/1既有ignored + 41 PASS；既有dead-code warnings保留                                                                                                                                                                                                                                              |
| delivery / C1已提交head独审                                      | PASS                              | f7420989b3ef60e8f3e4c2fbbc8b787383a9397d，12files/0violations；独立上下文review，P0/P1均0，见review.md                                                                                                                                                                                                                                   |
| Hosted CI / draft PR / 最终集成                                  | NOT VERIFIED                      | 由专用分支推送和draft PR启动；不包含merge/发布                                                                                                                                                                                                                                                                                           |

Desktop 源码版本 2.1.37、Web 2.1.38、Mobile 2.1.3 保持。EXE SHA256 `5ed60610c6d28119ae4ce0323da680fd31a1fc58750d40cc87f243404ca15f89`，官方 receipt input SHA256 `24a03f5c3cc6a270341081179035866c866b516753d2d5325b67ea04e556a044`，reason=current。运行时为本树 Tauri release；所有 native data-dir/profile 使用脚本新 runId。

## 保护与交付范围

- 原工作区开工只读记录 96 条文件状态及 96 个 SHA256，存于父目录 `original-status-before.txt` / `original-dirty-hashes-before.json`，没有暂存、覆盖、reset、checkout 或清理。
- 没有产品源码、schema、IPC、依赖或版本变更；不做恢复任务，不宣称原统一源码缺口已恢复。
- 测试用合成凭据和本机 fixture，不证明真实 Provider、生产服务或用户产品验收；不发布、不部署、不替换日常客户端，不回滚正式 Web 2.1.38。
- 提交/推送/draft PR 已在用户原始专项委托中授权；merge/发布不在本次授权范围。

正式Native生命周期：native-final.log / native-final-evidence/receipt.json，11 checks PASS、exit0、credentialCleanupComplete=true。与延迟实验共用当前源码构建的EXE，数据根/profile各自独立。

## 本地收尾身份与保护

- 全集产品浏览器 JSON：test-results/browser/5da6eacb-c103-4706-b594-830b1168396b/browser-results.json：expected827、unexpected0、flaky0、skipped0；固定1423 production preview、独立Edge profile。设计预览8项另行串行使用1423。
- Native：实际入口 http://tauri.localhost/，index-CR7pJXJ2.js SHA256 203e5c810bb788a2c7e86a9c7d90c09be4cff65a5051b92203471dc5ad601204；index-DSlL41ps.css SHA256 3ec30809f94c4a1a94754ff838fa12a11743167ff1afa8b4229ca3bbc9dbf452。链路 App→SettingsPanel→ModelAccessSettings→ModelProviderSettings，无UI布局变更。
- tests/desktop/taskhost-lifecycle.mjs 文件SHA256：000416b6d5622e02d37f366f3912641ad96d16f0c7555f766d7113ef5e81f6ce；tests/browser/settings-navigation.spec.ts：5623259255816140b1f6eb732b8324239877be73cdd2999c69ee5fbf08b1cfba。
- 延迟v3 receipt SHA256 ef7adf6aaef9792d3e4eec28cf13d9fc90cc7c8468d5ea31158899a8660ef7f8；正式native receipt SHA256 6ab165721d477b2d9115ed95b1b0c48b512d05d938e26202eb58f84cb73095d7。两组PNG及完整实验脚本均保留在任务父目录，未批量复制入Git。
- 正式Native 11项包含重启、取消、幂等、真实本机HTTP fixture生成及元数据秘密隔离；credential-conflict-safe-failure是fixture自身拒绝覆盖已有key，不能称作原生commit失败UI注入。保存失败UI契约由全集中未改的provider-credential-recovery浏览器回归覆盖。
- 2026-10-17T23:47:32Z 只读复核原96个文件SHA256全部一致，status仍96条，见 original-protection-check.json。canonical ledger只追加Issue68关联项，原150对象语义逐项未变。
- 当前局部实现与本地验证完成；独立已提交SHA审查、draft PR和Hosted状态分别记录。最终集成由原main协调者处理，未发布/部署/改版本。

独立已提交SHA复核：f7420989b3ef60e8f3e4c2fbbc8b787383a9397d的两测试LF归一化内容与本地已验证CRLF文件完全一致；完整dirty运行的sourceHead保持base历史值。后续仅文档状态提交不重写旧回执，最终head补审和定向复验另存新目录。
