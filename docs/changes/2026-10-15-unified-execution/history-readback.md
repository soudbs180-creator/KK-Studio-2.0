# 历史续读新增证据

TASK-GOV-006；2026-10-15；只读新上下文 `/root/history_resume`。本文件是历史证据摘要，任务状态仍由原账本维护；原交接队列和原始失败不改写。

| ID                                   | 起始rolloutOrdinal | 本轮成功页/返回轮 | 结果              |
| ------------------------------------ | ------------------ | ----------------- | ----------------- |
| 01a12e7f-1a9f-7f32-910b-f1ed05ae724e | 无                 | 1/7               | CURSOR_EXHAUSTED  |
| 01a12db4-8bbd-7302-86e2-958d430555f1 | 无                 | 2/11              | CURSOR_EXHAUSTED  |
| 01a12490-bd87-7360-8178-53a8f10e75b2 | 无                 | 4/36              | CURSOR_EXHAUSTED  |
| 01a12b67-eda8-7b71-8e4b-c2c5a77086fb | 无                 | 3/27              | CURSOR_EXHAUSTED  |
| 01a12de4-cb36-7992-957b-6da30dafd37f | 无                 | 2/10              | CURSOR_EXHAUSTED  |
| 01a12eca-483b-7672-b9d3-23af838d03be | 1492               | 5/42              | CURSOR_EXHAUSTED  |
| 01a12f8d-0dfe-75a1-9ce5-e63861df2cbd | 50                 | 1/3               | CURSOR_EXHAUSTED  |
| 01a11d2a-8d2f-7800-8684-a184e8ada276 | 803                | 1/5               | CURSOR_EXHAUSTED  |
| 01a0ff39-c7a4-7071-8bc4-fdfdb204131a | 9013               | 3/22              | CURSOR_EXHAUSTED  |
| 01a11d81-f117-7692-a475-f6bb43c02486 | 588                | 1/5               | CURSOR_EXHAUSTED  |
| 01a11cbb-b597-7cb3-86d2-63b0accc667c | 1264               | 1/4               | CURSOR_EXHAUSTED  |
| 01a0fe2c-3049-7743-b8b1-126133a1b6fc | 2989               | 2/15              | CURSOR_EXHAUSTED  |
| 01a13e8b-d2ee-7572-8592-7d905634257a | 无                 | 0/0               | INTERFACE_BLOCKED |
| 01a13e8a-1f57-7e73-b9d9-cec59f1ff80a | 无                 | 0/0               | INTERFACE_BLOCKED |
| 01a13e5f-b79d-7a52-a776-5902fb61bf54 | 无                 | 0/0               | INTERFACE_BLOCKED |
| 01a13e40-0f28-71d2-b5a7-cc03ac9dc98c | 无                 | 0/0               | INTERFACE_BLOCKED |
| 01a13e34-6f5a-77b0-a84c-6146bb2af299 | 无                 | 0/0               | INTERFACE_BLOCKED |
| 01a13e28-6d58-7902-be4c-e2f2dbdab729 | 无                 | 0/0               | INTERFACE_BLOCKED |

12成功目标均实际返回hasMore=false、nextCursor=null；6受限各一次错误 `thread/items/list is not supported yet`。39调用中另7次turnLimit20参数拒绝，按同游标改10后成功；不计成功页。没有发消息、读会话存储或执行历史命令。

恢复线索（均为历史事实，当前覆盖UNKNOWN，不能直接新报缺陷）：

- 01a12eca：B3+B4先安全扫描、逐项报告，删除/移动/取消跟踪需后续确认；单一当前文档与更新时间要求保留。
- 01a12490：MCP硬化70034cd9/codex/mcp-runtime-hardening历史Web stdio链路；后续真实Tauri、Windows包、写入确认/撤销receipt、图像视频需求在容量错误后中断。
- 01a12db4：语音/标签3acd0e13、f9cab2a2/codex/feat/canvas-tags-likes-ui；历史尚未合并、Native/Hosted/Provider/用户验收未完。
- 01a12b67：历史全量465通过/10失败，用户要求逐项修复，容量中断；不视为当前版本仍10失败。
- 01a12de4：用户曾报告两截图修改未落地；本轮未取截图，当前结果UNKNOWN。
- 01a12e7f：历史审计P1包括Windows入口、AGENT010、TASKSTATE002生产接线、AI Gateway流式/DPAPI及证据收口。
- 深层审查：UI14-R6短视口、媒体命中区、Hosted根因UNKNOWN、Canvas002/003、Package002、插件标题栏P3；部分有后续关闭证据，须实际main逐项核对。

原主控01a11954正文UNKNOWN与活动列表50条无分页缺口继续开放；本次12目标耗尽不等于全历史穷尽。归并优先级不变，不阻断GDI安全承接。
