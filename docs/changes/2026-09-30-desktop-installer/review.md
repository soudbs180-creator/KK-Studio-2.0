# Review：Desktop 安装器

- Task ID：TASK-DESKTOP-INSTALLER-001。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md)。
- Base：bd3bc66889b2856e273c2117191a74fdebd6f791。
- Self-review：PASS（AC1–4 本机范围），完整 verify 无flaky、Rust/格式/client check、运行与证据边界通过。
- 独立 review：base→`2cf5249ec6b93e901cc2147e0e1ea3914b067bc7` 的技术/实际运行证据 PASS；最后文档提交仍需绑定新精确 SHA 补审，记录于 PR/交付收据。
- 实际 GitHub 审批、用户产品验收和正式发布：尚未发生。

审查重点：完整 Agent 入包、收据路径/字节校验、真实用户安装保护、测试卸载范围、项目保留、准确区分当前主机与干净系统、历史证据与新 SHA。遵循 REVIEW.md 由独立上下文读取实际 diff。

独立上下文 `/root/installer_review` 使用只读代码/官方 Tauri 源码、独立单测和 fixture，未与作者共同写入 worktree。初审 `df0e8b0` 为 CHANGES REQUIRED，以下 finding 保留修复链：

| ID | 严重度/门禁 | 问题与修复 | 复验 |
| --- | --- | --- | --- |
| INST-001 | P1 merge/release | NSIS 可终止运行中的 portable；启动与每次 mutation 拒绝其它 kk-studio 进程 | 源码、原生进程 fixture、实机 PASS |
| INST-002 | P1 merge/release | Windows spawn 为含空格 /D 加引号导致路径错误；raw verbatim 参数且 /D 最后 | 独立 argv fixture、含空格实机 PASS |
| INST-003 | P1 merge/release | 卸载保留 settings 被误判失败；区分 uninstall/settings，仅清理已核实本轮键 | 源码、两次实机卸载及最终探测为空 PASS |
| INST-004 | P2 merge | 固定卸载键遗漏 MSI GUID；枚举 HKCU/HKLM 及两个 registry view，按 DisplayName 匹配 | GUID 注册 fixture、源码 PASS |
| INST-005 | P2 merge | 旧安装器可能绑定新配置；beforeBundle 身份快照与新鲜度/hash 双重核对 | 独立正常/旧配置拒绝 fixture、NSS 身份计算、实机 PASS |

INST-004 的初始 MSI /S 自动升级推断已撤回：NSIS silent 模式不执行相关页面 callback。实际保留问题是枚举遗漏与“不得覆盖已有安装”的验收边界，不用已撤回推断作为事实。

复审 `61b0c85`、补审 `0fba927` 关闭源码 findings；实机收据复核确认 setup hash、四次 4279 文件、四次启动 EXE 身份一致、隔离快照确实保留项目、主机注册/进程为空，结论 PASS 限于本机安装器范围。最终 head 的补审、CI 与实际合并证据必须另行记录，不能改写早期 SHA。

增量复审 `8ece4c70f0e3e6598537ded6777516dcf32c06c3` PASS：同帧采样依据与原限制、原5fail日志及10次诊断hash、真实重跑原生report/收据/PNG、日志raw/stored身份、完整verify与Rust结果独立核对。补审 `2cf5249ec6b93e901cc2147e0e1ea3914b067bc7` PASS：新增9行可见性断言保留hidden-control失败能力；独立读取160/160日志，raw SHA256 `f2e0e7b4ef8fcf54a18196c959da0afba210eb172d29f82c6de7cd085f587a3c`，无新增finding。最后结果/账本文档提交另补审，不伪造自引用SHA。

2026-09-30 托管只读核对：active rulesets 23866923/23866925 强制稳定线PR、verify/delivery与评论解决，拒绝force/删除，无bypass actors；required approving review count=0、CODEOWNERS approval未强制。GitHub审批与独立AI审查分别记录，作者不approve自己。候选安装器NotSigned，正式发布验收不在本机子任务DONE范围。
