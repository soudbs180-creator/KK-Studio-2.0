# 验证记录

Task: TASK-CCSWITCH-LEARN-20261014

基线 `0b19cb00` 为原 dirty checkout 的未验收源码隔离快照。实现提交 `3080a89f`，可见截图修正提交 `19decc93`；独立代码审查 PASS。不是 origin/main、Hosted 或发布验收。

## 最终检查

| 检查                                                     | 实际结果                                                  |
| -------------------------------------------------------- | --------------------------------------------------------- |
| 受影响保存、恢复、身份和提交单元                         | 61/61 PASS                                                |
| 完整 Node 单元与部署测试                                 | 1087 PASS、14 既有 skip、0 fail                           |
| Agent 测试                                               | 172 PASS、2 既有 skip、0 fail                             |
| Rust 默认 features、默认线程完整测试                     | 129/129 PASS；fmt PASS                                    |
| 完整 production 浏览器，固定 1423                        | 517/517 PASS，4 workers、retries=0、0 flaky/skip          |
| lint、typecheck、版本、治理、Markdown、index、UI、format | PASS；UI 224 文件、0 违规                                 |
| development 插件真实流程，固定 1421                      | PASS，errors=[]                                           |
| fresh Desktop/WebView2，固定 9417                        | 20/20 功能、11/11 可见视口检查 PASS，独立系统凭据清理成功 |

对应摘要：[浏览器](evidence/browser-verification.json)、[Rust](evidence/rust-verification.json)、[插件](evidence/development-plugins.json)、[原生](evidence/provider-credential-recovery.json)、[身份绑定](evidence/verification-identity.json)。完整浏览器原始 JSON 保留在隔离工作树 `test-results/ccswitch-full-ui-stable/browser-results.json`。

## 中断与恢复

- Rust 独立进程分别在 metadata 完成/vault 完成后强终止；主配置 revision 2、新模型及备份 revision 1、旧模型完整，原不透明引用保留。两个阶段分别保留旧/新 fixture vault，未产生成功回执。重复重读不写 vault。
- 同 revision 两个子进程真实并发，仅一个胜者；失败者为 conflict，vault 恰好写一次，最终 metadata 与胜者凭据对应。新 cfg(test) gate 只隔离其它顶层测试，未串行化两个 contender。
- Desktop 用本任务唯一合成凭据和独立 data/profile/CODEX_HOME。原生 revision 2 已提交新模型但 cache 仍旧时，强杀并回收自有进程；两次重启恢复相同 connectionId/credentialRef/模型/profile，系统凭据保留。主配置、备份及页面缓存五轮扫描不含秘密，最后仅清理值匹配的本任务引用。
- 原生回执拦截和 foreign credential probe 隔离在打开设置前安装并自检；Tauri 受保护 invoke 不被改写。目录成功使用合成 `/models` 响应，不请求真实供应商；配置与生成验证标记保持原样。
- [目录成功截图](evidence/synthetic-model-directory.png)、[正在编辑截图](evidence/normal-save-editing-label.png)、[第二次重启模型](evidence/cache-publication-crash-restart-2-model.png) 已分别滚动目标到视口并检查完整可见，root 与独立 reviewer 实际查看。

候选 2.1.18 EXE SHA256 `fb0b0de59a0de989fc0c199961482c7122337c46d7c80f981e77830843973fe7`，input `7c95b83ecffa2e028096f794b808b120d3844e88729696224cd93f1119fbebaa`，driver `583714d1876929393d73de3cb81c88fed78aa76763a85461f4bfe239546e2c01`，官方 helper `reason=current`。可见证据 raw sourceHead 为执行时 `3080a89f`；driver 当时尚未提交，其实际哈希与随后 `19decc93` 完全一致，生产输入未变。保留原始报告，不改写 sourceHead。

## 失败历史与证据边界

- 文案先取得两条预期 RED，缓存恢复先取得三条单元 RED；新 Desktop transport 夹具先确认 native 已提交/vault 保留，第一重启仍显示旧模型，才修复共享加载入口。旧不可写 invoke 的两次失败属于夹具失败。
- 完整 Rust 默认并行首次为 127/129：强终止遗弃生产 session mutex，使另一个测试收到 WAIT_ABANDONED。只增测试 admission gate 后默认并行完整 129/129 通过；生产锁行为和全部断言保留。旧 contender 的精确子进程错误未保留，后续仅增加不含秘密的错误分类。
- 首次完整 verify 的 snapshot 引用缺容器上下文，使用现有 KK_CONTAINER_ROOT 参数修正。默认浏览器启动未完成，随后独立浏览器总检在并行原生 renderer 重建期间为 514/517（两项 HTTP 404、一项 seed timeout）；其失败原件保留在 `test-results/ccswitch-full-ui`。停止构建、固定相同产物后完整 517/517 通过，未为此修改生产源码，也未把这些失败称为既有错误。
- 默认 Playwright 清理 `test-results` 后，早期 RED 与 Rust 初次失败的原始文件未保留；上述早期记录来自实际工具结果摘要。后续完整 GREEN 及原生证据已归档，不能将摘要冒称原始日志。
- 完整 `npm run verify` 初次未整体出口 0；其所有组成门禁已分别完成并通过，完整浏览器为稳定产物的独立重跑。

## 主目录整合与官方构建

已将审查后的任务文件整合回 `D:/kk-studio/KK-Studio-2.0`，逐文件先核对原内容与隔离基线；保留其它 dirty 改动、原 HEAD `51fccfc7` 和 index。原主目录生成 schema 字节在构建后恢复，未写入用户数据或任意实际用户凭据。相关 61 单元在主目录再次通过。

主目录通过官方 ensureDesktopRelease 入口构建当时的 2.1.18，EXE SHA256 `78098687653e8c463456417469da5d79bf77968dafb92663fa5a76b9cfee453b`，input `19cab1aca4ca025dc3d8b2a87bdb08d877ff8289bfc0a72b342dd8e1fd06a959`，验收时 `reason=current`。该 EXE 的独立数据真实 Desktop 20/20 功能、11/11 可见视口检查通过，包括两次中断恢复；凭据清理完成、9417 释放。源码映射由 owned 文件哈希与 [整合记录](evidence/integration.json) 证明，raw sourceHead 保持原 HEAD，不把 dirty root 冒称已提交候选。[主目录原生回执](evidence/canonical/provider-credential-recovery.json) · [最终身份](evidence/canonical/verification-identity.json) · [构建身份](evidence/canonical/build-identity.json)。

收尾时另一任务推进 Agent/画布同步与共享 Desktop/Web 2.1.19。覆盖保护拒绝整文件回写；保留其源码、版本和其它任务记录，仅合并本任务状态与文档。本任务12个生产/test/driver文件仍与 `19decc93` 完全同哈希，原 index/HEAD 保留。新主目录 input 为 `e66f66e8041f28d545dc71febca6858310f3df36bc21ca949a3fb9c225ac348e` 时，2.1.18 EXE 对当前 2.1.19 返回 `reason=unverified`。上面的 current 和原生验收只属于当时 2.1.18 快照，不能作为最新组合树的桌面验收；本任务不替代并行任务的 2.1.19 验收。

metadata/vault 两个中间阶段使用文件 fixture，不是实际系统 vault 的崩溃原子性证明；物理断电、收费 Provider、Hosted、签名安装及实际用户 profile/凭据验收不在本次证明范围。
