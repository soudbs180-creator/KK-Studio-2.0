# Verification: PR58 主线融合

Task ID: TASK-CHERRY-RED-001。当前状态: IN_PROGRESS / NOT_VERIFIED。

- Base main: `cbda65e4389fc807769a8faf7654892415992589`
- Original PR58 source: `26f7556946542a2ed529dee0623d57cfb91aad8e`
- 环境: Windows、Node24；现有 `TASK-CHERRY-RED-001` 工作区，开工时 clean。
- 外部本轮证据目录: `D:/kk-studio/output/workspace-consolidation-20261015/pr58-integration`。
- 主仓 head/index/status 与 worktree 登记保存在 `baseline.json`；不修改其他 dirty 工作区。
- 基线 typecheck exit 0；基线 Node 1159 total / 1145 pass / 14 existing skip / 0 fail，原日志保留。
- 初次 merge current main exit 1；86 个冲突路径，原始 merge 日志保留，不用旧 SHA 的绿色覆盖新组合。
- Settings 初步 ESLint/格式及独立组件 17/17 PASS；更广单测曾被尚未解决的 model.ts 标记阻挡，保留失败日志并待重跑。

## 组合后的首轮检查

- Desktop/Web 已由主线 2.1.31 递增至 2.1.32，Mobile 保持 2.1.1；version check 通过。CHANGELOG 仍有历史正式发布版本落后警告，当前仅记录 Unreleased，不创建发布或 tag。
- main 原有 139 条任务逐条 JSON 深比较保持不变，新增 Cherry 任务；当前 140 tasks / 37 features / Markdown / snapshot / index 门禁通过。
- Provider 定向 207/207、Native discovery/cancel 9/9、协议兼容 4/4、Settings 独立 17/17 通过。
- 当前 Windows Rust 203/203、打包 13/13、fmt/check/脚本语法通过；Unix 新组合仍需对应 Hosted 运行。
- 第一轮全 Node 1448 项中 7 FAIL：CLI 两边约定和旧 Native mock 未完整合并。已补双 CLI 参数/输出守恒，34/34 GREEN；Native discovery mock 与真实 prepare/fetch/release/cancel 生命周期对齐，原断言保持。失败日志保留。
- verify-first 在格式阶段发现 3 文件，格式修正后 verify-2 的 lint/typecheck、Node 1449 total / 1435 PASS / 14 SKIP / 0 FAIL、Agent 201 total / 199 PASS / 2 SKIP / 0 FAIL、UI256/0、format 与 production build 通过。浏览器启动因固定端口占用停止；不改端口、不复用旧服务、不终止其他任务。
- 端口释放后 production Edge 首轮 779 cases：774 PASS / 5 FAIL / 0 flaky / 0 skip，所有失败和 retry 原件保留。失败涉及新增认证测试定位、无效的 Anthropic+none 测试状态、手动合并漏保留 menu 测试变量，以及新增助手使原短菜单出现有界滚动。修正测试使其保持真实合同：role 定位、合法 Ollama+none 协议变化、恢复变量、滚动后仍断言末动作在视口且原菜单/控件几何断言保留。定向及全量回归待本轮重跑，不把已修文字当作通过。
- Native fixture 与 main 的严格认证/流契约对齐：六协议及两个旧别名共 17 例，合成本轮专有凭据通过实际 IPC 设置/读回，仅清理本轮 ref 并核验为空，日志不含 key/header 原文。这里只完成语法/格式和 fixture 自检，实际 release/Native 尚待运行。

## 冻结前审查与失败守恒

- `5ab6f7e3547496b5e7337d951f4356b5048ce3a4` 的正式独立审查为 CHANGES REQUIRED：NATIVE-001/P1（Unix 共享临时锁目录缺少 uid/私有权限核验），TS-01/P2（无 source 的对话任务污染根图片 publish/cancel/retry/approval 状态）。不以原 SHA 的测试 PASS 覆盖这些结论。
- 同 SHA 的 Hosted macOS/Linux Rust 实际编译失败：Unix 路径错误引用不存在的 `crate::asset_io`。默认包与 Native 后续步骤 SKIPPED，不记通过。原 run/job/step/log 保存在外部 `hosted-current` 子目录。
- 本次修正：Unix 独立锁函数原子创建 0700 目录并检查 euid、类型和权限，拒绝不安全已有目录且不 chmod；0600 锁以 O_NOFOLLOW 打开，核验拥有者、权限及 nlink，再 flock。加入不安全目录、符号链接与硬链接拒绝和独占释放测试。实际 Unix 结果仍须新 SHA Hosted 确认。
- App 六处共用 taskSourceItemId；无来源对话不再回退根图片，明确 source 和普通旧任务保持。定向测试先观察到旧根节点回退断言 FAIL，再 46/46 PASS；独立复核 39/39。新增真实浏览器回归保留失败对话，同时要求后续图片成功且根状态清除；fixture 首次因未等持久化、重开误建第二账号被现有身份保护拒绝，原日志保留，修正为等待归档并编辑原账号。
- Windows 修正后 Rust 203/203 PASS；typecheck PASS。
- 上一组合的正式 launcher 已重建 Windows 2.1.32，加载 index-_W9vteQ6.js；真实 Native 18 项 PASS（17 协议用例及透明读回），owned synthetic credentials 删除并读回为空。当前 App 源码已变化，最终二进制必须重建并重新绑定，不把此回执提升为后继完整 head 的验收。
- TaskHost 9 项前置通过后，第五次启动读项目超过 fixture 的 5 秒等待，原回执保留；采集时已恢复就绪。随后同步 taskkill 报 255 遮蔽主错误，当前无该 PID/端口残留、合成凭据删除循环完成。fixture 改为 30 秒有界就绪并记录实际耗时；异步清理仅在 ChildProcess 明确退出时容忍 kill 竞态，单独记录 cleanupFailure 并保留原 failure，删除凭据增加 null 读回。这不是慢启动根因已修复的声明，须实际重跑。

本文件记录源码冻结时已取得的证据。冻结后完整 verify、Rust、构建/Native、exact-head 独立补审、Hosted/Delivery、合并和 post-main 结果保存在上述外部目录及 PR58 当前 head 的 checks/最终说明；必须核对完整 SHA 和工件哈希，不以此处待验条目或旧 SHA 绿色代替。当前尚未合并。

关联: [spec](spec.md)、[plan](plan.md)、[review](review.md)。旧 Cherry 证据保留在原日期包，仅证明其原 SHA。
