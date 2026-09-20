# 治理审计映射

依据：用户提供的 57 节 AI Long-Term Project Engineering Governance，2026-09-17 读取的仓库、Git、现有规范及本机验证。下表描述本轮治理落地，不代表产品全量验收。

| 原规范章节 | 原状与发现 | 本轮归属 / 验证方式 |
| --- | --- | --- |
| 1–6 自主性、证据、指令审计 | AGENTS 有 UI/数据规则，但缺少统一证据语言与升级边界；旧默认 change 目录过期 | AGENTS 增加 FACT/INFERENCE/UNKNOWN/CONFLICT、授权边界和恢复顺序；保留更具体的 UI/数据规则 |
| 7–11 结构、事实、规范、ADR | 架构/数据/UI/平台规范已存在，机械迁移 apps/packages 会扩大范围 | governance 索引复用原文；PROJECT_STATE 描述现实；SPEC_BASELINE 给出权威指针；ADR-001 记录同仓库隔离与旧限制的裁决 |
| 12–14 任务、DONE、历史恢复 | 历史工作散在 dated changes；缺少统一 ownership/依赖/验收 | JSON 账本恢复 T0–T12、UI/性能和外部门禁；校验状态、证据、依赖环、active worktree 冲突；Markdown 由机器生成 |
| 15–30 Git、分支、并行、PR、整合 | 原 checkout 178 项 dirty，无 remote，无本地 main；不能直接重命名或覆盖 | 候选快照与任务 worktree 独立；AGENTS/CONTRIBUTING/PR 模板和 ADR 规定短分支、squash、复验及清理。保护规则、远端 review/merge/queue 留在 EXT-GIT，未声称已启用 |
| 31 可执行治理 | 有 tsc/UI checker/Prettier/tests，缺少 ESLint 和 CI | 启用 ESLint 并修复 34 项基线违规；校验 npm-only、账本生成视图、domain 和 server 导入边界；Windows CI 调用同一套实际命令 |
| 32–33 UI 与职责 | 已有 tokens/shared controls/UI guard；App 较大，另有已确认 UI 整改清单 | 复用 UI-STANDARDS/UI_SPEC 与 UI 系统审计；列入 UI-001–004/T8，未为治理模板机械拆文件；本轮未宣称 Figma 全状态通过 |
| 34–38 上下文恢复、压缩、交接 | 日志和历史总结无法单独代表当前事实 | PROJECT_STATE/SPEC_BASELINE/AI_HANDOFF 与 JSON 账本职责分离；恢复时核对真实 Git 和运行证据 |
| 39–44 工程检查、性能、回归、永久约束 | 原 verify 无 ESLint；冷却结束仍不可选；外部 JSON 有 any | 真正启用 lint；统一冷却时钟并覆盖边界；Provider 外部结构用 unknown 与显式读取；性能预算/压力验收继续 PERF-001，未将常规回归冒充性能验收 |
| 45–48 自审、代理、协调、范围 | 共享 dirty checkout 不适合代理同时写；代理调用发生容量失败 | 只读复核与独立 worktree；未获得的代理结果不当审查证据。新发现 App fallback/pinned 调度问题进入 TASK-PROV-001，避免把 helper 通过写成入口修复完成 |
| 49–54 Prototype、持续循环、文档、DoD | Provider/Gateway 基础代码与产品接线、部署能力存在差距 | 账本保留 PARTIAL/BLOCKED；现有 T1/T2 DONE 仅对应其历史证据范围；本轮本地验证和远端/真实服务/原生验收明确分开 |
| 55–57 交付与未来短指令 | 无统一任务恢复入口 | 提供 verification、PR 内容、handoff；下一次按 Task ID 读取 ledger 和关联规范即可继续，无需用户重述项目背景 |

复核范围：当前工作树与已读取的有效规范。未读取的实时 Figma 状态、外部 Provider、ComfyUI 服务、VPS 和远端托管配置属于 UNKNOWN / NOT VERIFIED，不推断为已检查。
