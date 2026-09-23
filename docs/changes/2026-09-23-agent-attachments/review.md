# TASK-AGENT-003 审查

结论：26 文件 dirty 增量预检 PASS，无未关闭 P0/P1/P2。自审与独立只读上下文 review_agent_attachments 分别执行；模型型号不可得，不虚构。日期 2026-09-23。规则：当前 AGENTS、AI_RULES、REVIEW、Design System 1.3；基线 HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 加 ROOT 当前未提交候选。未提交，不存在新的 head SHA、GitHub approval、Hosted CI 或发布批准。

文件绑定：evidence/source-manifest.json 的 SHA-256 为 a86ea3f085e1ad1271a03431998757fd451a453b26aab0cb093407e25c3a0b95。26 个唯一文件：19 源码/CSS、6 测试、1 audit；19 已有、7 新增。review-base 为 UI008 回传后的 ROOT 文件。独立 reviewer 前后两次核对所有候选/基线 hash，0 缺失、0 漂移。

| ID | 严重度/影响 | 修复与复验 | 结果 |
| --- | --- | --- | --- |
| R1 | P1；导入部分失败或第7张被丢弃后仍可能提交不完整消息 | strictBatch 预检，Promise.allSettled 后整批提交或拒绝；本地/画布错误保留且阻止发送，明确忽略或合法重选解除；独立故障注入与真实浏览器覆盖 | CLOSED |
| R2 | P1；项目/模式 A→B→A 后旧画布读取可能进入新草稿 | 单调 generation 与卸载失效，迟到附件数 0；真实 IndexedDB 延迟读取回归及独立组件执行 | CLOSED |
| R3 | P2；base64 padding 导致 8 MiB 原件误拒绝 | 按结尾 padding 扣减，8,388,607/8,388,608 字节独立验证；浏览器恰好8 MiB通过 | CLOSED |

独立执行 30 项 agentAttachments/Connection/Host/Api Node 单测全部通过；只读编译真实组件/hook 的故障注入覆盖混合非法、部分归档失败、合法恢复、ABA、边界与第7张拒绝。故障注入的 React/FileReader/素材读取是受控依赖，不称为真实浏览器。reviewer 另核对实现者原生真实识图/MCP JSON、完整 363 Node/299 browser 日志，不宣称自己运行过桌面。

UI008 四个共享文件完成三方整合；与新基线差异仅为本轮附件禁用参数、Agent 画布桥/附件接线和引用选择器，无 UI008 覆盖。两项旧测试从附件禁用调整为可添加，有本轮规格依据，并新增断线保留与 API 隔离断言，未 skip。最后截图发现 select 默认小尺寸后，将其并入既有 Agent 控件的默认/hover/disabled/focus规则；CSS 补审与 Prettier 通过并重新绑定以上 manifest。该最后 CSS 的运行验证以原工程最终 verify/Tauri 记录为准。

自审覆盖原件与凭据边界、取消/迟到结果、上游 k/内部 scale 转换、控件快照一致性、项目切换、共享默认行为及当前 UI 来源。拒绝扩大结论到 26 文件外脏基线、任意第三方 MCP、付费生图、正式合并/发布或用户视觉验收。原工程验证完成情况见 verification.md。
