# Review：全项目任务盘点与本地收口

状态：作者自审和修复后只读独立审查已完成（2026-10-03）。

## 作者自审范围

- 对照 `intent.md`、`spec.md`、`plan.md` 和 `git diff origin/main...HEAD` 检查实现范围，没有引入依赖升级、凭据或无关重构。
- MCP 注册表：合法 51+ 数据只读保留，原始字节可导出，显式恢复才裁剪；浏览器 Web Locks 包住重读、冲突检查和写入，无该 API 时拒绝写入并显示只读原因；支持 Web Locks 时包住重读、冲突检查和写入并做写后校验。损坏 JSON 不被覆盖且设置页有导出入口。
- MCP 协议：modern discovery 的 404/405/415/501 与明确 method-not-found 才回退；401/403、5xx、超时、取消、过大和 malformed response 均保持失败；legacy session 清理与 modern sessionless list/call 分开。
- 编排器：重排只物化新计划，按失败项做传递依赖闭包，保留成功项和原计划；审批门、revision、64 计划上限和稳定 ID 均有检查；不声称执行 Provider。
- UI：超限/损坏提示拆成独立组件，原始导出与超限显式恢复入口可访问；浏览器覆盖两条路径。
- `rg` 扫描到的“尚未接入/后续”均属于既有外部或 Prototype 任务，并已在台账保留；本轮 `plan_replan` 的占位分支已移除。

## 独立只读审查

按代码审查技能发起只读 reviewer，范围为 base `21d121d2b884b2b7ced4a98eb0e03c590de5c3cd` 到最终实现 head `3ab8bb9`。首轮发现的 stale add/remove、协议错误文本误回退和重排 ID 冲突已在 `7ac8b84` 修复；随后补齐 Web Locks 互斥、损坏配置导出入口、超时/取消/大小/工具数/分页上限与 partial 重排回归。首轮正式结论为 **With fixes**；针对无 Web Locks 的 localStorage 竞态补丁完成后，最终复审确认无新的 Critical 或 Important 问题。最终文档提交只更新证据与状态，不改变该实现 head。reviewer 不得修改工作树或派生子代理。

复核后的重要项闭环：

- 写入竞态：`McpServerRegistry` 的默认浏览器存储通过 `navigator.locks.request` 使用同一命名的 exclusive lock；无 Web Locks 时拒绝写入并显示只读原因；支持 Web Locks 时包住重读、冲突检查和写入并做写后复读校验；定向单测覆盖并发新增不丢失。
- 边界证据：MCP 定向单测升至 25/25，覆盖默认存储的 Web Locks 与只读路径、timeout、AbortController、2 MB、500 tools、重复 cursor 和 32 页；orchestrator 定向单测升至 25/25，含 partial 重排；MCP 设置浏览器回归 4/4，损坏配置实际下载内容为原始 `not-json`。
- 交付证据：最终 verification、review、ledger 和生成视图在最终提交中同步；所有未由本地环境证明的外部范围仍保留原任务状态。

## 结论

本地实现与回归证据覆盖本轮收口目标；最终命令结果见 `verification.md`。真实第三方 MCP、Provider/GPU、ComfyUI、VPS、Mobile、完整 TaskHost 进程恢复及 Figma 用户视觉验收不属于可由当前本地环境证明的范围，已按台账状态和优先级保留。
