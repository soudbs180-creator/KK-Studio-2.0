# Verification：KK Codex 生图回传与短提示词

- Task ID：TASK-AGENT-008；记录状态：本地 FINAL，实现 head 独立 review PASS；最终文档 head/托管门禁另核
- 日期/时区：2026-10-01 Asia/Shanghai；日志内部 UTC 保留。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)
- Base：709e51d5c30c9c9216a888c22592e7870df8901e；采证时 task worktree dirty（指纹见收据），随后实现提交为 3c63f1ed655345132f299f3963ad81b8b0f90b78、clean，并经独立精确 SHA 复核。终稿文档提交的 review/CI/推广以 PR #33 和交付收据为准，不将采证状态写成当前状态。
- Node 24.19 / npm 11 / Windows x64 / Edge WebView2；规则基线同 base。

## 实际验证

| 检查 | 退出码 | 结果 | 证据/限制 |
| --- | --- | --- | --- |
| 独立 npm ci | 0 | PASS | 安装本 worktree 锁定依赖 |
| 基线 lint/typecheck | 0/0 | PASS | [基线](evidence/baseline.json) |
| 基线 Codex client | 0 | PASS | 40/40 |
| 生图传输回归 RED | 1 | 预期 FAIL | 41 pass / 2 fail；[日志](evidence/red.txt) |
| 生图传输 GREEN / 事件流 | 0/0 | PASS | Agent 172 pass/2 原平台 skip；SSE 2/2 |
| 并发归档 RED → GREEN | 1 → 0 | PASS | 6 pass/1 fail → 7/7；[失败](evidence/import-red.txt)、[通过](evidence/import-green.txt) |
| 完整 npm run verify | 0 | PASS | root 632 pass/8 原平台 skip；Agent 172 pass/2 skip；browser 377/377，无 flaky；[日志](evidence/verify.txt) |
| cargo fmt / test / check | 0/0/0 | PASS | Rust97/97；[收据](evidence/checks.json) |
| client:build:agent -- --no-bundle | 0 | PASS | 本 worktree 独立生产资源/EXE；[日志](evidence/native-build.txt) |
| Tauri 真实生图/续聊/重连/恢复 | 0 | PASS | 原件 1,768,873 bytes，唯一节点/标记、短聊天恢复；[运行收据](evidence/native-summary.json) |
| 独立实现 head review | 0 | PASS | 3c63f1ed655345132f299f3963ad81b8b0f90b78；43 Codex /9 host+SSE /6边界fixture，交付/治理/版本/指纹均通过；[审查收据](evidence/independent-review.json) |
| PR CI / 最终文档 head review / 主线 | — | PENDING | [PR #33](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/33) 实际门禁，不预写成功 |

## 修复前真实复现和提示词

隔离 Tauri release@709e51d 的 EXE SHA256：94bc763c5f60ba2a3f1ad6043d0695f77dfbfb733d40381b23565a9a6ea9c17f。新账号实际模型 gpt-6-astra，composer 短句 57 字符，POST messageText 57 / prompt 809 / 附件 0 / 记忆 0，用户指令与固定前缀各一次。额外 752 字符是固定 KK 操作说明及分隔符；没有手动拼入旧聊天历史。上轮可见长文是 root 手写验收/排错说明，不能归因于 KK 自动膨胀。

真实 image_generation 完成，PNG 1,703,772 字节、SHA256 209700b8f5184f5f81166d7150344f90eeba23a2b5792ac152163f4bf7c24372；其 Base64 result 超过 2 MiB SSE，UI 显示“Agent 事件超过大小限制。”、连接断开、画布/素材为空。原始隔离证据在工程外 output/kk-image-audit-20261001-run3，归档摘要见后续 evidence，不提交账号/凭据/profile。

## 修复后的运行链与验收

生产 Tauri `http://tauri.localhost/`，隔离 output/kk-image-audit-20261001-run5/data 与 webview profile，实际启动当前 worktree `kk-studio.exe --data-dir ...`。EXE SHA256、实际加载 `/assets/index-B9xS-7sl.js` 和 CSS hash、源文件指纹均记录在[运行收据](evidence/native-summary.json)。不是其它 checkout 的 Vite 或旧产物。App.tsx → ConversationPanel → ConversationMessageFeed → AgentConversationMessages；ConversationComposerRegion → AgentComposer → agentConnection → app-server；完成 → agentHost → 原生 asset_store。没有视觉设计变更，Figma/tokens/共享控件保持基线，Web377回归与 Tauri 同状态截图分别取证。

| AC | 观察结果 | 证据 | 结果 |
| --- | --- | --- | --- |
| AC-1 | KK composer 真实 gpt-6-astra 调用内置生图；完成元数据 620 字符，无 result；图片自动成为 ready 节点/owned asset，连接保持 | [真实图片](evidence/native-image.png)、[运行摘要](evidence/native-summary.json) | PASS Desktop |
| AC-2 | 读取原生 asset_read、重连、关闭后重启、再次启动服务/重连，原件 SHA256 86307db43bb5aea73f2f3b543b36366e8dafa3d8766c54a92a3978bfc687b7b6 一致；节点/标记均一份 | [快照](evidence/native-snapshot.json)、[重启截图](evidence/native-restarted.png) | PASS Desktop |
| AC-3 | 两次请求 57/809、16/768，附加恒为752；前缀/指令各一次，附件/记忆0；同一线程回复 KK_CHAT_OK，重连/重启用户泡泡仍57/16，无固定规则露出 | [请求与恢复](evidence/native-summary.json) | PASS Desktop；Web 共享逻辑回归 |

保留真实缺陷：[run4 重复标记失败](evidence/native-import-failure.json)，随后提交前重检生成身份。审计脚本重启时曾未启动按需 Agent、未从首页打开已有项目；分别保留[脚本失败/修正](evidence/restart-script-corrections.json)，补齐“项目库 → 项目 → 连接设置 → 启动并连接”后实际复验 PASS。不能将这些脚本设置错误当作产品已自动启动 Agent；本次不承诺自动启动。

## 当前结论

本地实现与 AC-1–3 PASS，独立精确 SHA 审查和托管推广另记实际结果；没有提前声称合并。豆包最新 doctor 仍 COMPOSER_NOT_FOUND / doubao-region-ban、hasEditor=false，Cookie 存在不证明登录有效，见[当前状态](evidence/doubao-status.json)。旧额度失败保留，新账号 Codex 成功不代替豆包验收，豆包 CLI 输出自动回画布尚未接入。Mobile、签名、正式安装/发布和其他 Provider 未验证，功能卡仍 PARTIAL。

独立审查实现 head 3c63f1e 为 PASS，无 P0/P1/P2 或合并阻断；P3 AGIMG-DOC-001 指出 spec 的待验收和 verification 的当前 dirty 表述过期，本次终稿已据真实运行证据纠正。审查辅助 fixture 曾因误解素材记录包装和种子节点退出1，修正审查断言后6/6复验，通过范围/限制见 review；没有修改产品或运行证据。新增文档 head 仍需独立补审及托管检查，最终以 PR 精确 head 回读为准。
