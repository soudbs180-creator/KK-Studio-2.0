# 全项目收敛审计（2026-09-30）

## 覆盖与结论

- FACT：逐项读取 90 项任务的目标/验收/证据、34 张功能映射、现行规则及 22 个登记 worktree；不将历史 DONE 当成当前外部服务证明。
- 当前任务状态：{"DONE":47,"PARTIAL":25,"BLOCKED":4,"TODO":14}；功能状态：{"REAL":2,"PARTIAL":26,"PROTOTYPE":4,"PLANNED":2}。DONE 覆盖已验证的本地候选范围；下表是提交时快照，集成 PR 的合并/检查记录承载最终推广结果。
- 当前 root 集成分支基于 origin/main@1e95a13；snapshot 065b45d 保留原候选，a02b7b5 合入主线。其它 dirty checkout 保留；69 张被旧测试覆盖的历史截图已先保存到工程外，再按各自 HEAD 恢复，新截图只放本轮 evidence。
- FACT：旧演示节点 fixture 与已更名设置入口造成大量误报；同时发现真实几何、禁用反馈、删除保护、原生 CAS/异步确认和记忆隔离缺陷并修复。故障与新证据见 [verification](verification.md)，真实未完成项见 [remaining](remaining.md)。

## 承接清单

| 来源 | 集成证据 | 留下的边界 |
| --- | --- | --- |
| UI-010 / PR #19 (33ac5b3) | 929771c | 四页 Figma 规则覆盖旧尺寸；用户最终视觉验收仍开放 |
| Sidebar / PR #20 (76be5c3) | deb9e73 + 当前取消/删除/CAS 回归 | 文件夹/置顶当前会话态 |
| Google / PR #13 (13671d7) | 57093c3 | 真实凭据与 CLI 登录未验收 |
| Memory / 本地来源分支 (0a88916) | 0dfba3d + 隔离/锁/迁移修复 | 跨应用和真实 Codex 未联调 |
| CodeBuddy / 本地来源分支 (c9ebd90) | 186f7da + HTTP 取消/CLI 安全修复 | 限定短文本 CLI 委派；不冒充 GUI 自动化 |
| Codex config / PR #17 (2618344)、较新主线来源 a913dae | 5267ef8；PR head 的两行历史审查 SHA 补录保留原含义，相关配置/CLI 源码与较新来源一致 | 目标 CLI 消费与设置 UI 待完成 |
| Claude config / PR #18 (dbeee9d) | 7f71878/59b189e | 目标 CLI 消费与设置 UI 待完成 |
| MiniMax (381383d)、Provider #16、ORCH (08b5ae1) | 已在 main；当前回归承接 | 本地目录/配置/领域契约；付费服务与执行 UI 未完成 |
| 图片比较 #21/#22、本机服务、平台版本、插件 #28 | main@1e95a13 + a02b7b5 | 各平台剩余项按功能卡保留 |
| 原首页/Figma/Kaworkai dirty 候选 | 065b45d + 本轮 UI/原生运行证据 | 落地本地画布历史/吸附/图层；远程竞品能力未复制 |
| 旧 WorkBuddy Gateway (cef927e) | 保留原分支/dirty 文件 | 当前产品采用受限 CodeBuddy CLI；旧外部 Gateway 没有当前真实验收，不强行作为可用服务合入 |

## 任务逐项核对

| Task | 状态 | 目标 | 验证级别 |
| --- | --- | --- | --- |
| T0 | DONE | 可复现候选源码与主线整合 | PASS |
| TASK-GOV-001 | DONE | 治理源、ESLint、架构门禁和 CI | PASS |
| TASK-PROV-001 | DONE | 冷却恢复与产品调度入口边界 | PASS |
| T1 | DONE | 读取保护、备份和 revision 冲突 | PASS |
| T2 | DONE | 画布图持久化与稳定节点身份 | PASS |
| T3a | DONE | 原生素材及引用最终验收 | PASS |
| T3b | DONE | 完整项目包导出导入与恢复 | PASS |
| T4 | DONE | 统一实际图片生成入口及健康语义 | PASS |
| T5 | PARTIAL | 持久本地 TaskHost 与未知受理恢复 | PARTIAL |
| T6 | PARTIAL | Desktop ComfyUI最小链实现 | PARTIAL |
| EXT-PROVIDER | BLOCKED | 真实 Provider/GPU 生成验收 | NOT_VERIFIED |
| EXT-COMFY | BLOCKED | 真实 ComfyUI/模型验收 | NOT_VERIFIED |
| T7 | TODO | Desktop可用版本及安装恢复验收 | NOT_VERIFIED |
| T8 | TODO | 成熟Core职责和平台能力边界 | NOT_VERIFIED |
| T9 | TODO | Web本地版及浏览器容量/离线能力 | NOT_VERIFIED |
| T10-PREP | PARTIAL | VPS发布、备份回滚与部署配置准备 | PARTIAL |
| T10 | BLOCKED | VPS staging和生产实机验收 | NOT_VERIFIED |
| T11 | BLOCKED | 旧Web/Vercel切换与退役 | NOT_VERIFIED |
| T12 | TODO | Mobile 独立形态与手机适配 | NOT_VERIFIED |
| UI-001 | PARTIAL | UI tokens和共享组件契约 | PARTIAL |
| UI-002 | DONE | 窄屏composer和动态文案溢出 | PASS |
| UI-003 | PARTIAL | 示例任务/账号与真实服务边界 | PARTIAL |
| UI-004 | PARTIAL | 逐页对齐、IA和最终视觉运行态 | PARTIAL |
| PERF-001 | PARTIAL | 原生素材缩略图/分页及内存IO | PARTIAL |
| EXT-GIT | DONE | 远端PR与main保护规则 | PASS |
| TEST-PROV-001 | DONE | Provider真实入口浏览器回归 | PASS |
| TASK-ASTRA-001 | DONE | Astra 迁移计划与 Git 分支规则同步 | PASS |
| TASK-KK2-MAIN-SYNC | DONE | KK Studio 2.0 本地与云端 main 树同步 | PASS |
| TASK-UI-UNMERGED-001 | DONE | dirty checkout 未合并 UI 回归候选 | PASS |
| TASK-UI-MAIN-001 | DONE | 现行Figma页面校正与交互修复主线整合 | PASS |
| TASK-UI-DISMISS-002 | DONE | 窄屏侧栏关闭与大图重绘稳定性 | PASS |
| TASK-MAIN-CLOSE-002 | DONE | 未完成子任务汇总验收与主线同步 | PASS |
| TASK-UI-CLOSE-003 | DONE | 现行Figma页面缺口复核与交互收口 | PASS |
| TASK-PERF-ASSETS-001 | DONE | 素材列表元数据和原件按需读取 | PASS |
| TASK-GOV-002 | DONE | 跨AI自主开发与分支质量门禁 | PASS |
| TASK-AUDIT-SEC-001 | DONE | 安全边界与异常任务状态审计 | PASS |
| TASK-CAP-001 | PARTIAL | 本地 Skill/MCP/ComfyUI 能力补齐 | PARTIAL |
| TASK-MINIMAX-001 | PARTIAL | MiniMax Design 交互审计与本地技能/MCP复刻 | PARTIAL |
| TASK-MCP-PROTO-001 | TODO | MCP 2026 协议协商与旧版兼容 | NOT_VERIFIED |
| TASK-MCP-REGISTRY-001 | TODO | MCP 多标签页配置写入不丢失 | NOT_VERIFIED |
| TASK-MCP-REGISTRY-002 | TODO | 旧版超限 MCP 配置无损恢复 | NOT_VERIFIED |
| FEATURE-SYSTEM | DONE | 功能卡片体系、状态看板与后端化路线 | PASS |
| BACKEND-IMAGE-PARAMS | PARTIAL | 图片比例与清晰度真实透传供应商 | PARTIAL |
| BACKEND-TEXT-NODE | PARTIAL | 文本节点接入统一任务宿主 | PARTIAL |
| BACKEND-MEDIA-001 | TODO | 视频与音频节点真实生成链 | NOT_VERIFIED |
| BACKEND-MCP-AUTO | TODO | MCP 工具自动调用编排 | NOT_VERIFIED |
| BACKEND-PLATFORM | TODO | 平台账号/积分/云同步/记忆/代理后端 | NOT_VERIFIED |
| BACKEND-ASTRA-001 | TODO | Astra 研究助手实现 | NOT_VERIFIED |
| UI-SKILL-POPOVER-001 | DONE | 窄屏首页弹层遮挡修复与 Skill 空态断言更新 | PASS |
| TASK-RULES-003 | DONE | 修复功能状态与运行证据门禁 | PASS |
| BACKEND-CONVERSATION | PARTIAL | 对话面板文本多轮能力与实际状态收敛 | PARTIAL |
| TASK-DS-001 | PARTIAL | Design System校正与公共UI对齐 | PARTIAL |
| TASK-DS-002 | DONE | Design System逐页迁移与桌面验收 | PASS |
| TASK-UI-005 | DONE | 新增功能 UI 入口与能力展示对齐 | PASS |
| TASK-UI-006 | DONE | 折叠与弹层交互、画布重叠和缩放背景修复 | PASS |
| TASK-AGENT-001 | PARTIAL | 默认 Codex 主 Agent 与 KK 生成任务接入 | PARTIAL |
| TASK-AGENT-002 | PARTIAL | 桌面本地 Agent 托管与其他登录软件适配 | PARTIAL |
| TASK-UI-007 | DONE | 手机平板电脑三档尺寸与图标对齐 | PASS |
| TASK-UI-008 | DONE | 重新制定创作输入框规范并统一三档实现 | PASS |
| TASK-AGENT-003 | DONE | Agent 图片附件、画布引用与视口选择操作 | PASS |
| PLUGIN-DESKTOP-001 | DONE | 修复桌面画布插件的 CSP 加载路径 | PASS |
| REL-2.1.0 | DONE | 2.1.0 本地集成与源码上传 | PASS |
| TASK-RULES-004 | DONE | 现行规则与 Markdown 一致性审计 | PASS |
| TASK-DOCS-HISTORY-001 | TODO | 历史 Markdown 链接与缺失日志勘误 | NOT_VERIFIED |
| TASK-ORCH-001 | DONE | Agent 编排领域状态机与编排器工具面 | PASS |
| TASK-ORCH-002 | TODO | TaskWorkbench 阶段计划视图与审批交互 | NOT_VERIFIED |
| TASK-ORCH-003 | TODO | 编排器驱动生成执行与计划门禁 | NOT_VERIFIED |
| TASK-CANVAS-001 | PARTIAL | 画布交付契约与当轮产物收集 | PARTIAL |
| TASK-TASKSTATE-001 | PARTIAL | 统一任务态契约定稿 | PARTIAL |
| TASK-PROV-002 | DONE | 多供应商接入与多目标配置（Provider Connectivity） | PASS |
| TASK-COMPARE-001 | DONE | 画布图片对比操作 | PASS |
| TASK-COMPARE-002 | DONE | 对比控件窄屏命中区主线回归 | PASS |
| TASK-VERSION-001 | DONE | 桌面/Web/Mobile 独立版本源与自动递增 | PASS |
| TASK-LOCAL-SERVICE-001 | PARTIAL | Web 本机伴随服务与既有浏览器数据迁移 | PARTIAL |
| TASK-CLOSEOUT-2026-09-28 | DONE | 合并后版本与 VPS 状态收口 | PASS |
| TASK-POSTMERGE-MIGRATION-2026-09-28 | DONE | 主线合并后迁移操作单收口 | PASS |
| TASK-UI-CANVAS-001 | DONE | 画布会话分栏与固定侧栏交互修复 | PASS |
| TASK-UI-HOME-002 | DONE | 首页与对话输入区剩余设计反馈收口 | PASS |
| TASK-UI-GOV-003 | DONE | 新版 Figma 四页治理基线与 UI 模板收口 | PASS |
| TASK-CANVAS-KAWORKAI-001 | DONE | Kaworkai 无限画布交互研究与本地画布增强 | PASS |
| TASK-PROJECT-001 | DONE | 项目落地与分支收敛 | PASS |
| TASK-UI-010 | DONE | 现行 UI 规则与真实操作回归 | PASS |
| TASK-PROJECT-SIDEBAR-001 | PARTIAL | 侧栏项目列表与真实项目数据统一 | PARTIAL |
| TASK-PROV-003 | PARTIAL | Codex Provider 配置注入与 model catalog 落盘（agent 侧接线） | PARTIAL |
| TASK-PROV-004 | PARTIAL | Claude Code settings.json 落盘（agent 侧接线） | PARTIAL |
| TASK-AGENT-004 | PARTIAL | Google Interactions 对话和生图 | PARTIAL |
| TASK-AGENT-005 | PARTIAL | Gemini CLI 账号登录通道（免 API Key 对话） | PARTIAL |
| TASK-MEMORY-001 | PARTIAL | 本地长期记忆服务接入对话 | PARTIAL |
| TASK-MEMORY-002 | PARTIAL | 跨产品共享本地记忆（本机共享） | PARTIAL |
| TASK-AGENT-007 | DONE | Codex 通过本机 CodeBuddy CLI 受限委派短文本 | PASS |

每项验收条款、依赖、原证据和本轮证据以 [机器账本](../../governance/task-ledger.json) 为准；本轮未升级的条目沿用其范围，不能推断全部 90 项已经完成。

## Worktree 保留快照

| Branch | Head | 未提交文件数 |
| --- | --- | --- |
| codex/TASK-PROJECT-001-landing-integration | 186f7da | 194 |
| feat/TASK-AGENT-005-google-cli-login | 9c5fafd | 0 |
| feat/TASK-AGENT-004-google-closeout | 13671d7 | 0 |
| codex/T10-PREP-vps-migration | abe1e99 | 0 |
| fix/TASK-COMPARE-002-touch-target | a6629ab | 0 |
| fix/TASK-AGENT-004-conversation-boundary | 48bfd97 | 0 |
| detached | 59d3333 | 41 |
| feat/TASK-LOCAL-SERVICE-001-companion | cf95b4a | 0 |
| feat/TASK-AGENT-006-workbuddy-gateway | cef927e | 1 |
| feat/TASK-AGENT-007-codebuddy-cli | c9ebd90 | 30 |
| feat/TASK-MEMORY-001-local-memory | 0a88916 | 0 |
| fix/TASK-MINIMAX-001-mcp-registry-limit | 381383d | 0 |
| feat/TASK-ORCH-001-agent-orchestration-closure | 08b5ae1 | 0 |
| feat/TASK-PROV-002-provider-connectivity | d783d08 | 0 |
| feat/TASK-PROV-003-provider-wiring-main | a913dae | 2 |
| feat/TASK-PROV-004-claude-landing | dbeee9d | 0 |
| docs/TASK-RULES-004-closeout | 150deba | 0 |
| feat/TASK-UI-009-ui010-integration | 76be5c3 | 6 |
| feat/TASK-UI-009-sidebar-project-groups | 76339c9 | 26 |
| fix/TASK-UI-010-ui-regression | 33ac5b3 | 0 |
| fix/TASK-VERIFY-001-cross-platform-tests | 76339c9 | 0 |
| codex/kaworkai-capability-map | 13d5a69 | 0 |

root 的 dirty 计数是修复提交前快照；其它 worktree 未被重置。patch-id/逐项冲突解决和承接提交用于 squash/cherry-pick 追溯，不能只用 ancestor 判定是否已经承接。
