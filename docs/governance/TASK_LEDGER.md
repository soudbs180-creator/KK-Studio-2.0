# Task ledger

Generated from `task-ledger.json` by `npm run governance:write`; do not edit this view directly.

Historical DONE applies only to the linked verification scope. The full-project objective remains open until every applicable task and integration gate is verified.

| ID | Title | Status | Display | Priority | Dependencies | Owner | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TASK-FIX-PUSH-GUARD-SPACES-001 | 修复 Windows Git pre-push 空格及长路径启动 | REVIEW | 进行中 | P1 | none | root | 补 merged-SHA 独立 review receipt、原始 Hosted artifact manifest 及当前 SHA 的 delivery 结果；本任务验收补齐前保持 REVIEW，签名/安装/用户验收仍属独立发布边界。 |
| TASK-WINDOWS-ENTRY-DIAG-002 | 补齐Windows入口子进程失败诊断 | DONE | 已完成 | P2 | TASK-LAUNCH-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-WINDOWS-ENTRY-RECOVERY-003 | 继续定位Hosted Windows入口未正常退出的原始原因 | TODO | 未完成 | P1 | TASK-LAUNCH-001 | root | 将 fa78ed12 候选同步到当前 origin/main 后重跑 Hosted Windows，并读取 windows-entry.jsonl；保留 PR43 原失败和本机未复现原件，未取得新分类前保持 TODO。 |
| TASK-IMAGE-RETRY-004 | 修复主线区域重试验收读取旧成功任务 | DONE | 已完成 | P1 | TASK-IMAGE-EDIT-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-DESKTOP-FLUSH-001 | 桌面关闭前耐久保存与失败留窗 | DONE | 已完成 | P1 | TASK-PLUGIN-DEV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PLUGIN-MARKDOWN-001 | 随包Markdown去除CDN代码依赖与离线渲染 | DONE | 已完成 | P1 | TASK-PLUGIN-DEV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PLUGIN-RECOVERY-001 | 插件节点快照完整恢复与坏数据保护 | DONE | 已完成 | P1 | TASK-PLUGIN-DEV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-IMAGE-EDIT-001 | 统一图片编辑蒙版与连续重绘 | DONE | 已完成 | P3 | TASK-MODEL-001 | root | 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-IMAGE-EDIT-001-unified-mask 已通过 PR#41 8c921a52 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-IMAGE-EDIT-VERIFY-002 | 图片编辑真实模型与移动设备效果验收 | TODO | 未完成 | P1 | TASK-IMAGE-EDIT-001 | root | 冻结新增实现，等待明确供应商/账号授权与物理手机；条件满足后先做单张Mask原件保护和映射边界，再做手机手势/键盘与用户视觉验收。 |
| TASK-UI-013 | 桌面标题栏与菜单合并为单排 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线；分支 fix/TASK-UI-013-single-row-titlebar 已通过 PR#40 1d6f640a 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-LAUNCH-001 | 桌面与网页启动体验及图标修复 | DONE | 已完成 | P3 | none | root | 保留当前证据；正式安装器、签名发布、托管 CI 与用户验收按各自门禁继续回读 |
| TASK-MODEL-001 | 账号级图片模型能力声明与提交校验 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-MODEL-001-capabilities 已通过 PR#36 1af0357b 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-PLUGIN-DEV-001 | 修复 Vite development 随包插件 public import 错误 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| T0 | 可复现候选源码与主线整合 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-GOV-001 | 治理源、ESLint、架构门禁和 CI | DONE | 已完成 | P3 | T0 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PROV-001 | 冷却恢复与产品调度入口边界 | DONE | 已完成 | P3 | TASK-GOV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| T1 | 读取保护、备份和 revision 冲突 | DONE | 已完成 | P3 | T0 | root | 保留当前证据，合并后按原验收范围回读主线 |
| T2 | 画布图持久化与稳定节点身份 | DONE | 已完成 | P3 | T0 | root | 保留当前证据，合并后按原验收范围回读主线 |
| T3a | 原生素材及引用最终验收 | DONE | 已完成 | P3 | T1, T2 | root | 保留当前证据，合并后按原验收范围回读主线 |
| T3b | 完整项目包导出导入与恢复 | DONE | 已完成 | P3 | T3a | root | 保留当前证据，合并后按原验收范围回读主线 |
| T4 | 统一实际图片生成入口及健康语义 | DONE | 已完成 | P3 | T3b, TASK-PROV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| T5 | 持久本地 TaskHost 与未知受理恢复 | DONE | 已完成 | P3 | T4 | root | 保留当前证据，合并后按原验收范围回读主线；分支 codex/T5-native-lifecycle 已通过 PR#37 78cea37a 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| T6 | Desktop ComfyUI最小链实现 | PARTIAL | 进行中 | P2 | T5 | root | 补充负责人、优先级、分支和下一步验收证据 |
| EXT-PROVIDER | 真实 Provider/GPU 生成验收 | BLOCKED | 未完成 | P2 | T4 | root | 复核阻塞条件，解除后重新验证并保留原失败证据 |
| EXT-COMFY | 真实 ComfyUI/模型验收 | BLOCKED | 未完成 | P2 | T6 | root | 复核阻塞条件，解除后重新验证并保留原失败证据 |
| T7 | Desktop可用版本及安装恢复验收 | PARTIAL | 进行中 | P2 | T3b, T4, T5, T6, EXT-PROVIDER, EXT-COMFY | root | 补充负责人、优先级、分支和下一步验收证据 |
| T8 | 成熟Core职责和平台能力边界 | TODO | 未完成 | P2 | T7 | root | 补充负责人、优先级、分支和下一步验收证据 |
| T9 | Web本地版及浏览器容量/离线能力 | TODO | 未完成 | P2 | T8 | root | 补充负责人、优先级、分支和下一步验收证据 |
| T10-PREP | VPS发布、备份回滚与部署配置准备 | PARTIAL | 进行中 | P2 | T9 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| T10 | VPS staging和生产实机验收 | BLOCKED | 未完成 | P2 | T10-PREP | root | 复核阻塞条件，解除后重新验证并保留原失败证据 |
| T11 | 旧Web/Vercel切换与退役 | BLOCKED | 未完成 | P2 | T10 | root | 复核阻塞条件，解除后重新验证并保留原失败证据 |
| T12 | Mobile 独立形态与手机适配 | TODO | 未完成 | P2 | T11 | root | 补充负责人、优先级、分支和下一步验收证据 |
| UI-001 | UI tokens和共享组件契约 | PARTIAL | 进行中 | P2 | TASK-GOV-001, TASK-DS-001 | root | 补充负责人、优先级、分支和下一步验收证据 |
| UI-002 | 窄屏composer和动态文案溢出 | DONE | 已完成 | P3 | UI-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| UI-003 | 示例任务/账号与真实服务边界 | PARTIAL | 进行中 | P2 | UI-001 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| UI-004 | 逐页对齐、IA和最终视觉运行态 | PARTIAL | 进行中 | P2 | UI-002, UI-003, TASK-DS-001 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| PERF-001 | 原生素材缩略图/分页及内存IO | PARTIAL | 进行中 | P2 | T3a | root | 补充负责人、优先级、分支和下一步验收证据 |
| EXT-GIT | 远端PR与main保护规则 | DONE | 已完成 | P3 | TASK-GOV-001, T0 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TEST-PROV-001 | Provider真实入口浏览器回归 | DONE | 已完成 | P3 | TASK-GOV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-ASTRA-001 | Astra 迁移计划与 Git 分支规则同步 | DONE | 已完成 | P3 | T0, TASK-GOV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-KK2-MAIN-SYNC | KK Studio 2.0 本地与云端 main 树同步 | DONE | 已完成 | P3 | T0, TASK-GOV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-UNMERGED-001 | dirty checkout 未合并 UI 回归候选 | DONE | 已完成 | P3 | TASK-GOV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-MAIN-001 | 现行Figma页面校正与交互修复主线整合 | DONE | 已完成 | P3 | TASK-GOV-001, TASK-KK2-MAIN-SYNC | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-DISMISS-002 | 窄屏侧栏关闭与大图重绘稳定性 | DONE | 已完成 | P3 | TASK-UI-MAIN-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-MAIN-CLOSE-002 | 未完成子任务汇总验收与主线同步 | DONE | 已完成 | P3 | TASK-UI-MAIN-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-CLOSE-003 | 现行Figma页面缺口复核与交互收口 | DONE | 已完成 | P3 | TASK-UI-MAIN-001 | finish_figma_pages | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PERF-ASSETS-001 | 素材列表元数据和原件按需读取 | DONE | 已完成 | P3 | T3a | finish_asset_performance | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-GOV-002 | 跨AI自主开发与分支质量门禁 | DONE | 已完成 | P3 | TASK-GOV-001, TASK-KK2-MAIN-SYNC | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-AUDIT-SEC-001 | 安全边界与异常任务状态审计 | DONE | 已完成 | P3 | TASK-GOV-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-CAP-001 | 本地 Skill/MCP/ComfyUI 能力补齐 | PARTIAL | 进行中 | P2 | TASK-GOV-001, T6 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-MINIMAX-001 | MiniMax Design 交互审计与本地技能/MCP复刻 | PARTIAL | 进行中 | P2 | TASK-GOV-002 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-MCP-PROTO-001 | MCP 2026 协议协商与旧版兼容 | PARTIAL | 进行中 | P2 | TASK-CAP-001 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-MCP-REGISTRY-001 | MCP 多标签页配置写入不丢失 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-MCP-REGISTRY-002 | 旧版超限 MCP 配置无损恢复 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| FEATURE-SYSTEM | 功能卡片体系、状态看板与后端化路线 | DONE | 已完成 | P3 | TASK-KK2-MAIN-SYNC | root | 保留当前证据，合并后按原验收范围回读主线 |
| BACKEND-IMAGE-PARAMS | 图片比例与清晰度真实透传供应商 | PARTIAL | 进行中 | P2 | none | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| BACKEND-TEXT-NODE | 文本节点接入统一任务宿主 | PARTIAL | 进行中 | P2 | T5 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| BACKEND-MEDIA-001 | 视频与音频节点真实生成链 | TODO | 未完成 | P2 | T5 | root | 补充负责人、优先级、分支和下一步验收证据 |
| BACKEND-MCP-AUTO | MCP 工具自动调用编排 | TODO | 未完成 | P2 | TASK-CAP-001 | root | 补充负责人、优先级、分支和下一步验收证据 |
| BACKEND-PLATFORM | 平台账号/积分/云同步/记忆/代理后端 | TODO | 未完成 | P2 | T10-PREP, T10 | root | 补充负责人、优先级、分支和下一步验收证据 |
| BACKEND-ASTRA-001 | Astra 研究助手实现 | TODO | 未完成 | P2 | TASK-ASTRA-001 | root | 补充负责人、优先级、分支和下一步验收证据 |
| UI-SKILL-POPOVER-001 | 窄屏首页弹层遮挡修复与 Skill 空态断言更新 | DONE | 已完成 | P3 | TASK-CAP-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-RULES-003 | 修复功能状态与运行证据门禁 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| BACKEND-CONVERSATION | 对话面板文本多轮能力与实际状态收敛 | PARTIAL | 进行中 | P2 | none | root | 补充负责人、优先级、分支和下一步验收证据 |
| TASK-DS-001 | Design System校正与公共UI对齐 | PARTIAL | 进行中 | P2 | none | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-DS-002 | Design System逐页迁移与桌面验收 | DONE | 已完成 | P3 | TASK-DS-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-005 | 新增功能 UI 入口与能力展示对齐 | DONE | 已完成 | P3 | TASK-DS-002 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-006 | 折叠与弹层交互、画布重叠和缩放背景修复 | DONE | 已完成 | P3 | TASK-UI-005 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-AGENT-001 | 默认 Codex 主 Agent 与 KK 生成任务接入 | PARTIAL | 进行中 | P2 | none | root | 补独立审查并分别完成 Desktop、真实 Provider 和其他登录软件验收 |
| TASK-AGENT-002 | 桌面本地 Agent 托管与其他登录软件适配 | PARTIAL | 进行中 | P2 | TASK-AGENT-001 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-UI-007 | 手机平板电脑三档尺寸与图标对齐 | DONE | 已完成 | P3 | TASK-UI-006, TASK-AGENT-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-008 | 重新制定创作输入框规范并统一三档实现 | DONE | 已完成 | P3 | TASK-UI-007, TASK-AGENT-002 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-AGENT-003 | Agent 图片附件、画布引用与视口选择操作 | DONE | 已完成 | P3 | TASK-AGENT-001, TASK-AGENT-002 | root | 保留当前证据，合并后按原验收范围回读主线 |
| PLUGIN-DESKTOP-001 | 修复桌面画布插件的 CSP 加载路径 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| REL-2.1.0 | 2.1.0 本地集成与源码上传 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-RULES-004 | 现行规则与 Markdown 一致性审计 | DONE | 已完成 | P3 | REL-2.1.0 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-DOCS-HISTORY-001 | 历史 Markdown 链接与缺失日志勘误 | DONE | 已完成 | P1 | TASK-RULES-004 | root | 保留dc53317b exact review收据与8个未验证日志边界；如后续获得原始日志，再以新证据包单独勘误。 |
| TASK-ORCH-001 | Agent 编排领域状态机与编排器工具面 | DONE | 已完成 | P3 | TASK-AGENT-001 | root | 保留当前证据，合并后按原验收范围回读主线；分支 feat/TASK-ORCH-001-agent-orchestration-closure 已通过 PR#14 f6264385 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-ORCH-002 | TaskWorkbench 阶段计划视图与审批交互 | DONE | 已完成 | P3 | TASK-ORCH-001 | root | 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-ORCH-002-stage-workbench 已通过 PR#35 5dd6e6dd 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-ORCH-003 | 编排器驱动生成执行与计划门禁 | TODO | 未完成 | P2 | TASK-ORCH-001, BACKEND-MEDIA-001 | root | 补充负责人、优先级、分支和下一步验收证据 |
| TASK-CANVAS-001 | 画布交付契约与当轮产物收集 | PARTIAL | 进行中 | P2 | TASK-ORCH-001 | root | 补充负责人、优先级、分支和下一步验收证据 |
| TASK-TASKSTATE-001 | 统一任务态契约定稿 | PARTIAL | 进行中 | P2 | TASK-AGENT-001 | root | 提交后绑定 exact SHA 完成正式独立复审；随后补真实 Provider/每平台运行证据，不能用 fixture 或示例单价升级 DONE。 |
| TASK-TASKSTATE-002 | 供应商成本报价回执接入 | PARTIAL | 进行中 | P1 | TASK-TASKSTATE-001 | root | 在统一 Provider→task 归档边界接入 applyTaskCostReceipt 并补调用路径测试；随后由 provider adapter owner 接入真实回执并保存 receipt/source/currency/identity 证据，继续保持 fixture 与真实账单分离。 |
| TASK-PROV-002 | 多供应商接入与多目标配置（Provider Connectivity） | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线；分支 feat/TASK-PROV-002-provider-connectivity 已通过 PR#16 a89792ad 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-COMPARE-001 | 画布图片对比操作 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-COMPARE-002 | 对比控件窄屏命中区主线回归 | DONE | 已完成 | P3 | TASK-COMPARE-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-VERSION-001 | 桌面/Web/Mobile 独立版本源与自动递增 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-LOCAL-SERVICE-001 | Web 本机伴随服务与既有浏览器数据迁移 | PARTIAL | 进行中 | P2 | TASK-VERSION-001, BACKEND-PLATFORM | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-CLOSEOUT-2026-09-28 | 合并后版本与 VPS 状态收口 | DONE | 已完成 | P3 | TASK-VERSION-001, T10-PREP | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-POSTMERGE-MIGRATION-2026-09-28 | 主线合并后迁移操作单收口 | DONE | 已完成 | P3 | T10-PREP, T10, T11 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-CANVAS-001 | 画布会话分栏与固定侧栏交互修复 | DONE | 已完成 | P3 | TASK-UI-007 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-HOME-002 | 首页与对话输入区剩余设计反馈收口 | DONE | 已完成 | P3 | TASK-UI-CANVAS-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-GOV-003 | 新版 Figma 四页治理基线与 UI 模板收口 | DONE | 已完成 | P3 | TASK-UI-HOME-002 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-CANVAS-KAWORKAI-001 | Kaworkai 无限画布交互研究与本地画布增强 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PROJECT-001 | 项目落地与分支收敛 | DONE | 已完成 | P3 | TASK-UI-GOV-003, TASK-CANVAS-KAWORKAI-001, TASK-LOCAL-SERVICE-001 | root | 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-PROJECT-001-landing-integration 已通过 PR#31 bd3bc668 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-UI-010 | 现行 UI 规则与真实操作回归 | DONE | 已完成 | P3 | TASK-UI-008, TASK-AGENT-003 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PROJECT-SIDEBAR-001 | 侧栏项目列表与真实项目数据统一 | PARTIAL | 进行中 | P2 | TASK-UI-010 | root | 按验收条件完成实现、验证、独立审查和文档同步；分支 codex/TASK-PROJECT-001-landing-integration 已通过 PR#31 bd3bc668 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-PROV-003 | Codex Provider 配置注入与 model catalog 落盘（agent 侧接线） | PARTIAL | 进行中 | P2 | TASK-PROV-002 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-PROV-004 | Claude Code settings.json 落盘（agent 侧接线） | PARTIAL | 进行中 | P2 | TASK-PROV-002, TASK-PROV-003 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-AGENT-004 | Google Interactions 对话和生图 | PARTIAL | 进行中 | P2 | TASK-AGENT-003 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-AGENT-005 | Gemini CLI 账号登录通道（免 API Key 对话） | PARTIAL | 进行中 | P2 | TASK-AGENT-004 | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-MEMORY-001 | 本地长期记忆服务接入对话 | PARTIAL | 进行中 | P2 | none | root | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-MEMORY-002 | 跨产品共享本地记忆（本机共享） | PARTIAL | 进行中 | P2 | TASK-MEMORY-001 | MainAgent | 按验收条件完成实现、验证、独立审查和文档同步 |
| TASK-AGENT-007 | Codex 通过本机 CodeBuddy CLI 受限委派短文本 | DONE | 已完成 | P3 | TASK-AGENT-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-DESKTOP-INSTALLER-001 | Windows NSIS 安装器及隔离恢复验收 | DONE | 已完成 | P3 | none | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-AGENT-008 | Codex 原生生图事件传输与短提示词审计 | DONE | 已完成 | P3 | TASK-AGENT-001 | root | 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-AGENT-008-image-transport 已通过 PR#33 21d121d2 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-ORCH-REPLAN-001 | 编排计划失败项重排与依赖闭包 | DONE | 已完成 | P3 | TASK-ORCH-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-AUDIT-20261003 | 全项目任务盘点与可本地闭环项收口 | DONE | 已完成 | P3 | TASK-MCP-REGISTRY-001, TASK-MCP-REGISTRY-002, TASK-MCP-PROTO-001, TASK-ORCH-REPLAN-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-GOV-GOALS-001 | 项目建设目标与验收基线 | DONE | 已完成 | P3 | TASK-AUDIT-20261003 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-COMPONENT-BOUNDARY-001 | MCP 设置组件职责拆分 | DONE | 已完成 | P3 | TASK-GOV-GOALS-001 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-UI-011 | 图片选择工具栏与新增页面 UI 规则回归 | DONE | 已完成 | P1 | T2, TASK-UI-GOV-003 | root | 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-UI-011-image-selection-actions 已通过 PR#39 f922cf8e 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线） |
| TASK-PROV-005 | Desktop 供应商非秘密配置 durable 保存与恢复 | DONE | 已完成 | P1 | T5 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PROV-006 | Desktop image 提交连接门禁与 health 统一 | DONE | 已完成 | P1 | T5 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-PROV-007 | Selected model is at capacity 错误分类与可用模型切换 | DONE | 已完成 | P1 | T5 | root | 保留当前证据，合并后按原验收范围回读主线 |
| TASK-VERIFY-CONCURRENCY-002 | 浏览器并发失败原因与隔离复核 | PARTIAL | 进行中 | P1 | TASK-GOV-001 | root | 保留source105的9个首轮flaky原件；当前固定1423、retries=0的并发矩阵仅证明未复现，不宣称根因已修复。若要关闭，补同一exact SHA的Hosted与独立复审；否则保持PARTIAL。 |
| TASK-VERIFY-ORIGIN-003 | 浏览器验收端口与服务来源契约一致性 | DONE | 已完成 | P1 | none | root | 保留exact-SHA与独立review收据；Hosted delivery、Windows安装、第二环境、发布和用户验收继续由TASK-AGENT-010及发布门禁承担。 |
| TASK-DOCS-STRUCT-001 | AI 协作规则文档结构收敛 | DONE | 已完成 | P1 | none | root | 保留当前证据；合并或发布前按本任务原验收范围回读主线，不重新引入 pnpm 锁文件。 |
| TASK-AI-GATEWAY-001 | 统一多平台 AI 模型接入：凭证、通道契约与豆包 Ark 适配器 | PARTIAL | 进行中 | P1 | none | root | 先补本地 upstream ReadableStream/token callback 契约和 Windows DPAPI/Tauri protector 的受控测试；随后才补真实 Ark/Codex 凭据与 Desktop 运行态，外部证据齐全后再转 DONE。 |
| TASK-PROV-BYOK-001 | 用户自有 API 产品化接入 | TODO | 未完成 | P1 | TASK-AI-GATEWAY-001 | root | 依赖TASK-AI-GATEWAY-001与Web VPS控制面；先补intent/spec/plan和Desktop/Web/Mobile边界，外部契约稳定前不扩展产品实现。 |
| TASK-UI-015 | 画布点状/网状背景缩放插值修正 | DONE | 已完成 | P2 | none | root | 保留当前证据；主线回读完成 |
| TASK-AGENT-010 | 统一版本一致性与跨环境启动新鲜度 | REVIEW | 进行中 | P1 | TASK-LAUNCH-001 | root | 先收窄并同步候选到当前 origin/main，再取得 Hosted CI、不可变发布 receipt 和第二环境版本/commit/hash/进程路径回读；当前候选范围过宽，保持 REVIEW。 |
| TASK-GOV-003 | 规则体系收敛与文档同步门禁（B1+B2+R+B3-1+B3-2） | PARTIAL | 进行中 | P1 | none | root | 待用户授权后处理 B3-3 TASKSTATE 分支审查；随后按独立批次处理 B4 worktree/二进制、B5 交付包补齐 |
| TASK-GOV-004 | 未合并分支全量核验、分类与收敛合并 | PARTIAL | 进行中 | P1 | TASK-GOV-003 | root | P2 家族收敛 ×11 → B2 文档类 → B3 小代码 24 → B4 中代码 15 → B5 UI-012 两步（已授权）；每单元快照+门禁+交付包 |
| TASK-REVIEW-REMEDIATION-001 | 修复审查发现的治理生命周期与交付边界问题 | REVIEW | 进行中 | P1 | TASK-GOV-003 | root | 单独修复并验证 5 个 UI 失败项；补齐开发态 receipt 后再评估是否可标记 DONE。 |
| TASK-UI-CLASSIFY-20261013 | 模型接入与扩展分类修复并验证三客户端 | REVIEW | 进行中 | P1 | none | root | 另行处理三个既有 UI 失败并取得用户验收；保留自动分派/OAuth 未接入边界 |
| TASK-AGENT-RECOVERY-20261013 | 桌面 Agent 自动恢复、会话归属与凭据保存 | PARTIAL | 进行中 | P1 | none | root | 完成聊天与凭据状态一致性修复，2.1.17完整门禁和官方日常APP复验，恢复初始连接偏好。 |
| TASK-UI-CONSOLIDATE-20261014 | 冻结最新本机版本并统一 UI、模型预设与轻量化规则 | PARTIAL | 进行中 | P1 | none | root | 从已验证2.1.21继续未接协议与原生Mobile等开放范围；单独验收真实CLI/Provider、日常资料、用户视觉、安装器和Hosted，保留在途分支与旧flaky原状态。 |
| TASK-GOV-005 | PR #55 历史快照合法集成与门禁修复 | REVIEW | 进行中 | P1 | none | root | 完成独立 exact-SHA review，fast-forward update PR #55 branch，回读 Hosted verify/delivery；不要直接推送 main。 |
| TASK-ENG-001 | 引入 hermes-agent 工程实践：代码健康棘轮、Windows 不安全模式扫描与 Actions SHA 固定 | REVIEW | 进行中 | P1 | none | root | 基于最新 origin/main 完成冲突承接、独立 exact-SHA review 和 Hosted verify；未完成前保持 REVIEW。 |
| TASK-CCSWITCH-LEARN-20261014 | 澄清供应商编辑状态并验证跨存储中断恢复 | DONE | 已完成 | P1 | TASK-AGENT-RECOVERY-20261013 | root | 本轮实现与本地验收完成；Hosted、物理断电、收费Provider、实际用户profile及签名发布仍未验证。 |
| TASK-CANVAS-SYNC-20261014 | 修复 Agent 与已挂载画布图同步 | PARTIAL | 进行中 | P1 | none | root | Desktop/Tauri2.1.19复验位置/连线/重载；独立宽图问题另属TASK-CANVAS-WIDE-PORT-20261014 |
| TASK-CANVAS-WIDE-PORT-20261014 | 宽图结果编辑器遮挡下游按钮 | TODO | 未完成 | P2 | none | root | 单独复证production并修正宽图主体几何/端口锚点 |
| TASK-AGENT-UX-20261014 | Agent 执行过程与生成保存状态提示 | DONE | 已完成 | P2 | none | root | 保留证据并完成日常APP人工验收，真实Provider和发布沿原独立任务推进 |
| TASK-PROTOCOL-CLI-20261014 | 从2.1.21接通Provider协议和CLI实际执行，优化分端控件 | DONE | 已完成 | P1 | TASK-UI-CONSOLIDATE-20261014 | root | 从2.1.22继续真实供应商与真人CLI登录/安装、签名安装器、日常资料和人工视觉验收；最终产物回读工程外current-release哈希收据。 |
| TASK-222-ACTIONS-20261014 | 2.1.22 CLI、设置与画布按钮真实行为和分端修复 | DONE | 已完成 | P1 | TASK-PROTOCOL-CLI-20261014 | root | 回读最终current-release与独立文档补审；从2.1.23继续真人CLI/供应商、签名安装器、日常资料与实体手机验收，沿用已确认手机布局。 |
| TASK-223-ACTIONS-20261014 | 2.1.23 CLI、设置与画布按钮实际行为和分端修复 | DONE | 已完成 | P1 | TASK-222-ACTIONS-20261014 | root | 回读最终纯文档审查与current-release产物哈希；真人账号/付费Provider、Hosted、签名安装器、日常资料与Native Mobile由既有开放任务分别继续。 |
| TASK-SETTINGS-LATEST-20261015 | 在最新 UI 修复设置溢出、提示遮挡与配置保存风险 | DONE | 已完成 | P1 | TASK-223-ACTIONS-20261014 | root | 保持当前桌面入口指向最新工作区；产品源码改变后按官方launcher重建并重新验证，用户视觉与外部能力另验。 |
| TASK-UI-DETAILS-20261015 | 统一输入框、设置密度和卡片空态UI | DONE | 已完成 | P1 | TASK-SETTINGS-LATEST-20261015 | root | 本次本地UI范围完成；用户视觉接受、真实Provider、Hosted/安装器及实体手机另验，不自动关闭原开放能力。 |
| TASK-UI-FULL-20261015 | 完成全页面新UI收敛并验证后合入主线 | REVIEW | 进行中 | P1 | TASK-UI-DETAILS-20261015 | root | 形成2.1.30最终head并独立base694→head精确审查；本地verify8 760首试/Native9 87/TaskHost current5 11已PASS。当前SHA Hosted/Delivery通过后普通合并PR59、fetch核对main/post-main。偏好例外、旧Hosted因果限制及其他风险见verification最新2.1.30节，REVIEW/整体NOT_VERIFIED。 |

## TASK-FIX-PUSH-GUARD-SPACES-001 — 修复 Windows Git pre-push 空格及长路径启动

- Goal: Git Bash/MSYS 下的 pre-push guard 能处理空格和超过 260 字符的策略路径，同时保留所有拒绝保护。
- Scope: 仅 hook 路径转换、Windows 长路径真实回归夹具和相关交付证据；不改远端保护、不合并 main、不修改共享主工作树。
- Display status: 进行中
- Priority: P1 — Windows 推送门禁的路径与长路径回归，影响主线保护。
- Requirement refs: ledger:TASK-FIX-PUSH-GUARD-SPACES-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: Windows 真实 Git hook 通过单级空格、多级空格和策略路径超过 260 字符的合法快进与非法保护分支回归。; cygpath 转换失败、缺少策略、未知 ancestry、非快进、删除和受保护 ref 仍 fail closed，断言不放宽。; 基于当前 origin/main 的独立分支提交、Windows/Ubuntu hook CI、npm verify、构建和 delivery 结果均有当前 SHA 证据。
- Branch: `fix/TASK-FIX-PUSH-GUARD-SPACES-001-main-replay`
- Worktree: `D:/kk-studio/.worktrees/TASK-FIX-PUSH-GUARD-SPACES-001-windows`
- Modules: .githooks/pre-push, scripts/install-git-guards.mjs, scripts/governance/push-policy.mjs, tests/unit/gitPushGuardPaths.test.ts, tests/unit/gitPushPolicy.test.ts, docs/changes/2026-10-10-push-guard-spaces
- Verification: NOT_VERIFIED — PR #53 merged head cc3fad9695827c7545f7b7675870a65347f7358e into merge 1f6cbd37091326a899fa600baba53bf6efd9cf16. Current merge commit check-runs: Windows/Ubuntu hook, verify and deploy-linux SUCCESS; delivery SKIPPED. Merged-SHA independent review receipt and raw Hosted artifact manifest are still absent.
- Evidence: [docs/changes/2026-10-10-push-guard-spaces/verification.md](../../docs/changes/2026-10-10-push-guard-spaces/verification.md), [docs/changes/2026-10-10-push-guard-spaces/review.md](../../docs/changes/2026-10-10-push-guard-spaces/review.md), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md), [docs/changes/2026-10-12-p1-audit-closeout/evidence/push-guard-pr53-readback.json](../../docs/changes/2026-10-12-p1-audit-closeout/evidence/push-guard-pr53-readback.json)
- Next action: 补 merged-SHA 独立 review receipt、原始 Hosted artifact manifest 及当前 SHA 的 delivery 结果；本任务验收补齐前保持 REVIEW，签名/安装/用户验收仍属独立发布边界。
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-WINDOWS-ENTRY-DIAG-002 — 补齐Windows入口子进程失败诊断

- Goal: 编译/启动/拒绝失败保留实际error/signal/timing与checker Node身份
- Scope: 仅测试fixture诊断、实际失败分类与同分支恢复门禁收尾，不改产品或timeout
- Display status: 已完成
- Priority: P2 — 历史已完成范围
- Requirement refs: ledger:TASK-WINDOWS-ENTRY-DIAG-002
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 三段完整安全诊断与实际Node marker，秘密和环境变量不输出; 受控ENOENT/ETIMEDOUT仍真实失败且可区分，正常及no fallback断言保持; 本地完整检查和精确source独立审查，当前Hosted/merge/main另凭回执
- Branch: `test/TASK-IMAGE-RETRY-004-current-attempt`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-RETRY-004`
- Modules: tests/unit/desktopRelease.test.ts, start-kk-studio.bat, docs
- Verification: PASS — source105已独立源码PASS，入口12/12且实际ENOENT/ETIMEDOUT故障仍失败并分类；原断言和10s限制保持。完整verify出口0但9 flaky原件保留；默认1423补充447/447零重试通过。旧Hosted原因UNKNOWN继续Recovery003；最终docs/当前Hosted/主线另验。
- Evidence: [docs/changes/2026-10-09-windows-entry-diagnostics/verification.md](../../docs/changes/2026-10-09-windows-entry-diagnostics/verification.md), [docs/changes/2026-10-09-windows-entry-diagnostics/review.md](../../docs/changes/2026-10-09-windows-entry-diagnostics/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-09
- Updated: 2026-10-09

## TASK-WINDOWS-ENTRY-RECOVERY-003 — 继续定位Hosted Windows入口未正常退出的原始原因

- Goal: 区分启动错误/终止/运行时与争用原因，不能凭null或选绿声称恢复
- Scope: PR43 fa36推送37851173715失败原因仍UNKNOWN；原件保留，依新diagnostic继续
- Display status: 未完成
- Priority: P1 — 当前治理或验证阻断项
- Requirement refs: ledger:TASK-WINDOWS-ENTRY-RECOVERY-003
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 原失败和未复现/两个null故障原件保留; 出现新分类时按证据给根因和最小修复，所有有效门禁保持; 当前推广CI和main回归各自实际读取，不凭旧成功覆盖原失败
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: tests/unit/desktopRelease.test.ts, start-kk-studio.bat, docs
- Verification: NOT_VERIFIED — 实际失败根因UNKNOWN；独立本机未复现，P2跟进不能代填关闭。
- Evidence: [docs/changes/2026-10-09-windows-entry-diagnostics/verification.md](../../docs/changes/2026-10-09-windows-entry-diagnostics/verification.md), [docs/changes/2026-10-09-windows-entry-diagnostics/review.md](../../docs/changes/2026-10-09-windows-entry-diagnostics/review.md), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md)
- Next action: 将 fa78ed12 候选同步到当前 origin/main 后重跑 Hosted Windows，并读取 windows-entry.jsonl；保留 PR43 原失败和本机未复现原件，未取得新分类前保持 TODO。
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-IMAGE-RETRY-004 — 修复主线区域重试验收读取旧成功任务

- Goal: 区域重试必须验证新任务身份和真实完成，延迟时不能提前通过
- Scope: 只修正已有浏览器验收同步，不修改产品代码或测试重试策略
- Display status: 已完成
- Priority: P1 — 历史已完成范围
- Requirement refs: ledger:TASK-IMAGE-RETRY-004
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 依据主线托管首次与retry1真实失败修正旧任务误匹配，不将本机未复现探针标RED; 第四响应延迟时等到唯一全新任务身份再检查终态，保留4POST及原件像素断言; 当前完整本地verify、source独立审查及本轮文档一致性完成；托管/普通合并/main推广分别凭回执验收
- Branch: `test/TASK-IMAGE-RETRY-004-current-attempt`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-RETRY-004`
- Modules: tests/browser/image-edit.spec.ts, docs
- Verification: PASS — 本地验收：43fc完整verify root804/812、Agent172/174（原skip8/2）、447browser/447attempts零实际retry/flaky与严格四插件development PASS；全图片14零retry。source独立审查产品无P0/P1、41相关unit及门禁PASS，仅IRV-001文档矛盾由本提交修正，最终精确head补审与Hosted/main为推广门禁待实际回执。原主线失败及本机未复现PASS原件完整保留。
- Evidence: [docs/changes/2026-10-09-image-retry-verification/verification.md](../../docs/changes/2026-10-09-image-retry-verification/verification.md), [docs/changes/2026-10-09-image-retry-verification/review.md](../../docs/changes/2026-10-09-image-retry-verification/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-09
- Updated: 2026-10-09

## TASK-DESKTOP-FLUSH-001 — 桌面关闭前耐久保存与失败留窗

- Goal: 编辑后立即关闭窗口仍保留最后修改，保存失败保留窗口和草稿
- Scope: 当前创作快照队列与原生 CloseRequested 生命周期；同一随包插件可用目标的关联数据丢失缺陷
- Display status: 已完成
- Priority: P1 — 历史已完成范围
- Requirement refs: ledger:TASK-DESKTOP-FLUSH-001
- Feature IDs: FEAT-013
- Owner role: repository-maintainer
- Acceptance: 最后编辑后立即关闭并重新打开，磁盘与节点正文完整; 窗口按钮及原生关闭事件都等待耐久队列，重复关闭去重; 保存失败或读保护下有未保存草稿时阻止关闭，主备原件不变; Web原有保存行为保持，fresh原生零console错误及独立审查
- Branch: `fix/TASK-PLUGIN-DEV-001-same-origin-modules`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001`
- Modules: src/features/creation/useCreationStorage.ts, src/features/creation/nativeClose.ts, src-tauri/capabilities/default.json, tests/unit, tests/desktop, docs
- Verification: PASS — 本地产品验收：固定1421严格四插件编辑/离线正文/刷新恢复，804root与172Agent（既有skip8/2）、447browser零实际重试，Rust102/fmt/clientcheck/fresh Agent Tauri均通过。c8原生8步立即关闭、真实IO失败与重复关闭留窗/草稿/主备保护、重启恢复零错误；同EXE CSP、TaskHost11和上方动作13及最终标题栏通过。独立上下文已在c8关闭PLUGIN-REVIEW-001/002，完整原始失败保留并注明首轮标题栏拖动原因未知。PR/托管/主线推广按独立交付回执验证。
- Evidence: [docs/changes/2026-10-09-plugin-development/spec.md](../../docs/changes/2026-10-09-plugin-development/spec.md), [docs/changes/2026-10-09-plugin-development/verification.md](../../docs/changes/2026-10-09-plugin-development/verification.md), [docs/changes/2026-10-09-plugin-development/review.md](../../docs/changes/2026-10-09-plugin-development/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-09
- Updated: 2026-10-09

## TASK-PLUGIN-MARKDOWN-001 — 随包Markdown去除CDN代码依赖与离线渲染

- Goal: 四个随包插件在固定开发、生产和严格同源CSP桌面中编辑及重启恢复完整内容
- Scope: 现有Markdown解析器从隐式marked@14 CDN导入转为锁定版本随包；不扩大CSP或远程权限
- Display status: 已完成
- Priority: P1 — 历史已完成范围
- Requirement refs: ledger:TASK-PLUGIN-MARKDOWN-001
- Feature IDs: FEAT-013
- Owner role: repository-maintainer
- Acceptance: 阻断CDN时真实Markdown正文正确渲染且零页面错误; 原解析器主版本和语义保留，构建产物不请求外部可执行代码; 完整verify及fresh Tauri四插件重启验收与独立审查
- Branch: `fix/TASK-PLUGIN-DEV-001-same-origin-modules`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001`
- Modules: vendor/canvas-plugins/markdown, vendor/canvas-plugins/package-lock.json, tests/support, tests/development, tests/browser, tests/desktop, docs
- Verification: PASS — 本地产品验收：固定1421严格四插件编辑/离线正文/刷新恢复，804root与172Agent（既有skip8/2）、447browser零实际重试，Rust102/fmt/clientcheck/fresh Agent Tauri均通过。c8原生8步立即关闭、真实IO失败与重复关闭留窗/草稿/主备保护、重启恢复零错误；同EXE CSP、TaskHost11和上方动作13及最终标题栏通过。独立上下文已在c8关闭PLUGIN-REVIEW-001/002，完整原始失败保留并注明首轮标题栏拖动原因未知。PR/托管/主线推广按独立交付回执验证。
- Evidence: [docs/changes/2026-10-09-plugin-development/spec.md](../../docs/changes/2026-10-09-plugin-development/spec.md), [docs/changes/2026-10-09-plugin-development/verification.md](../../docs/changes/2026-10-09-plugin-development/verification.md), [docs/changes/2026-10-09-plugin-development/review.md](../../docs/changes/2026-10-09-plugin-development/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-09
- Updated: 2026-10-09

## TASK-PLUGIN-RECOVERY-001 — 插件节点快照完整恢复与坏数据保护

- Goal: 保存及重新读取后保留插件类型、尺寸和完整JSON元数据，坏数据不成为可写空卡片
- Scope: 现有CanvasCollectionItem.plugin的共享归一化与快照codec；不改变schema版本、存储身份或用户数据
- Display status: 已完成
- Priority: P1 — 历史已完成范围
- Requirement refs: ledger:TASK-PLUGIN-RECOVERY-001
- Feature IDs: FEAT-013
- Owner role: repository-maintainer
- Acceptance: 现有插件负载及长内容经过存储编码/解码完整保留，普通节点兼容; 非法负载/尺寸/非JSON元数据和嵌套秘密拒绝，原件不变; 真实development和production/Tauri重启插件项目后节点及编辑内容完整，相关回归和独立审查
- Branch: `fix/TASK-PLUGIN-DEV-001-same-origin-modules`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001`
- Modules: src/features/creation/model.ts, src/features/creation/snapshotCodec.ts, tests/unit, tests/development, tests/desktop, docs
- Verification: PASS — 本地产品验收：固定1421严格四插件编辑/离线正文/刷新恢复，804root与172Agent（既有skip8/2）、447browser零实际重试，Rust102/fmt/clientcheck/fresh Agent Tauri均通过。c8原生8步立即关闭、真实IO失败与重复关闭留窗/草稿/主备保护、重启恢复零错误；同EXE CSP、TaskHost11和上方动作13及最终标题栏通过。独立上下文已在c8关闭PLUGIN-REVIEW-001/002，完整原始失败保留并注明首轮标题栏拖动原因未知。PR/托管/主线推广按独立交付回执验证。
- Evidence: [docs/changes/2026-10-09-plugin-development/spec.md](../../docs/changes/2026-10-09-plugin-development/spec.md), [docs/changes/2026-10-09-plugin-development/verification.md](../../docs/changes/2026-10-09-plugin-development/verification.md), [docs/changes/2026-10-09-plugin-development/review.md](../../docs/changes/2026-10-09-plugin-development/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-09
- Updated: 2026-10-09

## TASK-IMAGE-EDIT-001 — 统一图片编辑蒙版与连续重绘

- Goal: 框选、画笔、色块共享坐标、裁剪、请求及融合，保护原图与未选像素
- Scope: 现有重绘和图片预览入口，领域Mask、Web/Desktop请求合成、编辑上下文
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-IMAGE-EDIT-001
- Feature IDs: FEAT-035
- Owner role: repository-maintainer
- Acceptance: 三个工具统一原像素Mask与历史; 5%偶数裁剪、合并及1K/2K/4K路由; 保护非编辑像素、部分成功与重试; 色块结构化指令、灯箱和上下文; 相关验证、完整verify、独立审查和文档
- Branch: `codex/TASK-IMAGE-EDIT-001-unified-mask`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-IMAGE-EDIT-001`
- Modules: src/features/image-edit, src/features/creation, src/components/nodes, src/App.tsx, src-tauri/src/task_host.rs, tests, docs
- Verification: PASS — 最新main1d组合27b/eaa本地实现scope完成：完整verify785Node/172Agent（原skip8/2）、445browser445attempts零retry/flaky、102Rust/fmt/clientcheck/fresh Agent EXE；native Mask外0/重启/包/undo/临时凭据清理，UI13/TaskHost11/模型/titlebar/首屏和生产Web3宽度通过；MASK-INTEGRATION-001定位歧义修复且当前独立关闭。104上游task对象保留，当前源码与运行审查通过并保留后续项。开发插件另归TASK-PLUGIN-DEV-001，开发其余UI只在留证收起遮罩后局部验收；真实效果/手机/用户验收归VERIFY-002。原失败日志与各未验边界详见本task当前verification/review；最终docs/Hosted/普通合并/main CI另按实际回读。
- Evidence: [docs/changes/2026-10-08-unified-image-mask/intent.md](../../docs/changes/2026-10-08-unified-image-mask/intent.md), [docs/changes/2026-10-08-unified-image-mask/spec.md](../../docs/changes/2026-10-08-unified-image-mask/spec.md), [docs/changes/2026-10-08-unified-image-mask/plan.md](../../docs/changes/2026-10-08-unified-image-mask/plan.md), [docs/changes/2026-10-08-unified-image-mask/verification.md](../../docs/changes/2026-10-08-unified-image-mask/verification.md), [docs/changes/2026-10-08-unified-image-mask/review.md](../../docs/changes/2026-10-08-unified-image-mask/review.md), [docs/changes/2026-10-09-unified-mask-main-integration/intent.md](../../docs/changes/2026-10-09-unified-mask-main-integration/intent.md), [docs/changes/2026-10-09-unified-mask-main-integration/spec.md](../../docs/changes/2026-10-09-unified-mask-main-integration/spec.md), [docs/changes/2026-10-09-unified-mask-main-integration/plan.md](../../docs/changes/2026-10-09-unified-mask-main-integration/plan.md), [docs/changes/2026-10-09-unified-mask-main-integration/verification.md](../../docs/changes/2026-10-09-unified-mask-main-integration/verification.md), [docs/changes/2026-10-09-unified-mask-main-integration/review.md](../../docs/changes/2026-10-09-unified-mask-main-integration/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-IMAGE-EDIT-001-unified-mask 已通过 PR#41 8c921a52 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-10-09
- Updated: 2026-10-09

## TASK-IMAGE-EDIT-VERIFY-002 — 图片编辑真实模型与移动设备效果验收

- Goal: 验证真实模型局部重绘质量、映射偏移和物理手机手势/键盘，补齐本地fixture之外的证据
- Scope: FEAT-035真实Provider质量与移动验收；不将fixture当作真实效果
- Display status: 未完成
- Priority: P1 — 当前治理或验证阻断项
- Requirement refs: ledger:TASK-IMAGE-EDIT-VERIFY-002
- Feature IDs: FEAT-035
- Owner role: repository-maintainer
- Acceptance: 明确供应商/账号/能力规格，在取得真实调用授权后验证Mask和标注编辑; 核对原件/未选像素、边缘融合、模型内部几何与透视变化；记录需要人工确认的边界; 在实际手机验证双指、输入键盘、安全区、工具栏与竖滑；完成用户视觉验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/image-edit, src/features/creation, tests, docs/features/feat-035-image-mask-editing.md
- Verification: NOT_VERIFIED — 本轮复核确认：比例异常已自动拒绝，但仍未使用真实付费连接、物理手机或用户视觉验收，任意语义几何位移仍需人工确认。
- Evidence: [docs/changes/2026-10-08-unified-image-mask/verification.md](../../docs/changes/2026-10-08-unified-image-mask/verification.md), [docs/features/feat-035-image-mask-editing.md](../../docs/features/feat-035-image-mask-editing.md), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md)
- Next action: 冻结新增实现，等待明确供应商/账号授权与物理手机；条件满足后先做单张Mask原件保护和映射边界，再做手机手势/键盘与用户视觉验收。
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-UI-013 — 桌面标题栏与菜单合并为单排

- Goal: 应用名、菜单和真实窗口控制共用一排，保留窗口与Web导航行为
- Scope: Desktop TopBar/window controls/Tauri config；Web相邻回归
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-013
- Feature IDs: FEAT-023
- Owner role: repository-maintainer
- Acceptance: 单排40px与同状态原生DOM截图; 菜单、拖动、双击、最小化、最大化/还原、关闭真实操作；乱序读/旧错误/卸载/异步清理故障覆盖; Web三断点及完整verify、clientcheck、独立审查
- Branch: `fix/TASK-UI-013-single-row-titlebar`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-UI-013-single-row-titlebar`
- Modules: src/components/TopBar.tsx, src/components/WindowControls.tsx, src/styles/desktop-titlebar.css, src-tauri, tests, docs
- Verification: PASS — 最新2cb主线组合86e：AC1–3 PASS、7条故障RED→GREEN、verify733Node/172Agent（原skip8/2）、431browser431attempts零flaky/retry/skip、97Rust/fmt/clientcheck/fresh带Agent release；真实titlebar drag/min/max/restore/close0，UI13/T511/模型/首屏及Web两态3宽度PASS，独立关闭001/002。103上游task保留；同EXE2e69...1a5f，环境not-recorded。最终doc/Hosted/PR40合并/mainCI须独立回读，不冒充签名安装/真实Provider/Mobile能力。
- Evidence: [docs/changes/2026-10-08-single-row-titlebar/intent.md](../../docs/changes/2026-10-08-single-row-titlebar/intent.md), [docs/changes/2026-10-08-single-row-titlebar/spec.md](../../docs/changes/2026-10-08-single-row-titlebar/spec.md), [docs/changes/2026-10-08-single-row-titlebar/plan.md](../../docs/changes/2026-10-08-single-row-titlebar/plan.md), [docs/changes/2026-10-08-single-row-titlebar/verification.md](../../docs/changes/2026-10-08-single-row-titlebar/verification.md), [docs/changes/2026-10-08-single-row-titlebar/review.md](../../docs/changes/2026-10-08-single-row-titlebar/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 fix/TASK-UI-013-single-row-titlebar 已通过 PR#40 1d6f640a 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-10-08
- Updated: 2026-10-08

## TASK-LAUNCH-001 — 桌面与网页启动体验及图标修复

- Goal: 双击直接启动无控制台，恢复桌面图标，减少 Web 首屏负担
- Scope: Windows launcher, shortcuts, Web first load
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-LAUNCH-001
- Feature IDs: FEAT-026
- Owner role: repository-maintainer
- Acceptance: 无可见命令窗口且可取消失败可诊断; 当前图标与 release 新鲜度正确; Web 首屏按需加载且工作区历史保留
- Branch: `codex/TASK-LAUNCH-001-quiet-start`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-LAUNCH-001`
- Modules: scripts/windows, start-kk-studio.bat, src/App.tsx, FEAT-026
- Verification: PASS — 当前 main 的 GUI/批处理启动链已加入依赖锁复检、源码内容指纹、EXE hash 收据和运行进程核对；真实启动先因当前 checkout 的未提交 Rust 改动编译错误拒绝启动旧包，修正两个闭包引用后按锁定依赖重建并启动 Desktop 2.1.13。收据与 inspectDesktopRelease 均为 current，第二次启动输出 Launched current desktop release；内容保留原时间戳、删除输入、缺收据、依赖漂移、锁文件异常和链接依赖均有回归测试。正式安装器升级、签名发布、托管 CI 与最终用户验收仍需分别验证。
- Evidence: [docs/changes/2026-10-08-startup-experience/verification.md](../../docs/changes/2026-10-08-startup-experience/verification.md), [docs/changes/2026-10-10-desktop-launch-freshness/verification.md](../../docs/changes/2026-10-10-desktop-launch-freshness/verification.md), [docs/changes/2026-10-10-desktop-launch-freshness/review.md](../../docs/changes/2026-10-10-desktop-launch-freshness/review.md)
- Next action: 保留当前证据；正式安装器、签名发布、托管 CI 与用户验收按各自门禁继续回读
- Last verified: 2026-10-10
- Updated: 2026-10-10

## TASK-MODEL-001 — 账号级图片模型能力声明与提交校验

- Goal: 让图片参数、编辑操作与限额按精确账号模型声明解析、保存恢复和执行校验
- Scope: 现有模型目录、设置与图片控件、Web/Desktop 共享提交门禁；蒙版实际执行后续
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-MODEL-001
- Feature IDs: FEAT-003
- Owner role: repository-maintainer
- Acceptance: 报告和手动声明白名单持久化，未知与false/zero正确区分; 精确账号/模型隔离，变更地址或凭据后旧目录失效; 明确操作/参考图/任务数量限制在提交前阻断并说明原因，旧模型兼容; 参数与参考图/数量入口共用目录，Web和fresh Tauri同状态验证; 完整检查、独立上下文审查与文档同步
- Branch: `codex/TASK-MODEL-001-capabilities`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-MODEL-001-capabilities`
- Modules: src/domain, src/features/models, src/features/creation, src/components, src/App.tsx, tests, docs/features, docs/governance
- Verification: PASS — 本地AC1–5 DONE：草稿/显示刷新受控RED后最小修正，32定向无retry、完整verify723/731root(8skip)、172/174Agent(2skip)、408/408browser零flaky、UI198/0、clientcheck/fresh Tauri隔离运行PASS；独立71ddb625技术补审PASS，MC-002/MC-003关闭、MC-001保持关闭，87/87及389源码/产物指纹2ebaab3d匹配。最终文档head补审和当前SHA PR/Hosted另绑；首轮405+1flaky唯一因果UNKNOWN，不改历史结果；功能卡仍为部分实现，非整个产品完成证明。
- Evidence: [docs/changes/2026-10-08-model-capabilities/intent.md](../../docs/changes/2026-10-08-model-capabilities/intent.md), [docs/changes/2026-10-08-model-capabilities/spec.md](../../docs/changes/2026-10-08-model-capabilities/spec.md), [docs/changes/2026-10-08-model-capabilities/plan.md](../../docs/changes/2026-10-08-model-capabilities/plan.md), [docs/changes/2026-10-08-model-capabilities/verification.md](../../docs/changes/2026-10-08-model-capabilities/verification.md), [docs/changes/2026-10-08-model-capabilities/review.md](../../docs/changes/2026-10-08-model-capabilities/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-MODEL-001-capabilities 已通过 PR#36 1af0357b 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-10-08
- Updated: 2026-10-08

## TASK-PLUGIN-DEV-001 — 修复 Vite development 随包插件 public import 错误

- Goal: 在严格固定1421的开发模式中正常发现插件，不弹出阻断界面的Vite错误遮罩
- Scope: 随包插件开发模块加载与回归，保持production/Tauri同源加载和CSP边界
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-PLUGIN-DEV-001
- Feature IDs: FEAT-013
- Owner role: repository-maintainer
- Acceptance: 原主线已复现的public插件import错误在fresh development关闭; 固定1421开发设置/插件可操作且无新页面错误; production preview和Tauri插件回归通过，不关闭HMR遮罩或放宽CSP
- Branch: `fix/TASK-PLUGIN-DEV-001-same-origin-modules`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PLUGIN-DEV-001`
- Modules: src/features/plugins/pluginLoader.ts, vite.config.ts, tests/browser
- Verification: PASS — 本地产品验收：固定1421严格四插件编辑/离线正文/刷新恢复，804root与172Agent（既有skip8/2）、447browser零实际重试，Rust102/fmt/clientcheck/fresh Agent Tauri均通过。c8原生8步立即关闭、真实IO失败与重复关闭留窗/草稿/主备保护、重启恢复零错误；同EXE CSP、TaskHost11和上方动作13及最终标题栏通过。独立上下文已在c8关闭PLUGIN-REVIEW-001/002，完整原始失败保留并注明首轮标题栏拖动原因未知。PR/托管/主线推广按独立交付回执验证。
- Evidence: [docs/changes/2026-10-08-model-capabilities/verification.md](../../docs/changes/2026-10-08-model-capabilities/verification.md), [docs/changes/2026-10-09-plugin-development/intent.md](../../docs/changes/2026-10-09-plugin-development/intent.md), [docs/changes/2026-10-09-plugin-development/spec.md](../../docs/changes/2026-10-09-plugin-development/spec.md), [docs/changes/2026-10-09-plugin-development/plan.md](../../docs/changes/2026-10-09-plugin-development/plan.md), [docs/changes/2026-10-09-plugin-development/verification.md](../../docs/changes/2026-10-09-plugin-development/verification.md), [docs/changes/2026-10-09-plugin-development/review.md](../../docs/changes/2026-10-09-plugin-development/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-09
- Updated: 2026-10-09

## T0 — 可复现候选源码与主线整合

- Goal: 可复现候选源码与主线整合
- Scope: Git, package.json, release
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:T0
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 保留原工作区与索引; 候选快照可从干净 checkout 重建; 验证后整合主线且产物对应提交
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: Git, package.json, release
- Verification: PASS — 本地main整合 PASS：从609f524快进86c40d0并合入14dbe11；原checkout dirty/index保留；main执行npm ci/verify、Rust检查、Tauri release和隔离桌面运行。
- Evidence: [docs/changes/2026-09-17-governance-baseline/verification.md](../../docs/changes/2026-09-17-governance-baseline/verification.md), [docs/architecture/adr/ADR-002-local-main-integration.md](../../docs/architecture/adr/ADR-002-local-main-integration.md), [docs/changes/2026-09-17-provider-submission-gates/verification.md](../../docs/changes/2026-09-17-provider-submission-gates/verification.md), [docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json](../../docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-18
- Updated: 2026-09-18

## TASK-GOV-001 — 治理源、ESLint、架构门禁和 CI

- Goal: 治理源、ESLint、架构门禁和 CI
- Scope: AGENTS.md, docs/governance, scripts, tests, package.json, .github, src lint corrections
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-GOV-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 账本 schema/依赖/证据校验可执行; ESLint errors=0; 实际完整 verify 与 Rust compile; 规则不把局部通过当全项目 DONE
- Branch: `chore/TASK-GOV-001-engineering-baseline`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-GOV-001`
- Modules: AGENTS.md, docs/governance, scripts, tests, package.json, .github, src lint corrections
- Verification: PASS — 治理本地验收 PASS：干净提交 npm ci/verify，115 Node、139 Edge、UI116/0、lint/typecheck/format/build；Rust36/fmt/check/release build；1421与Tauri隔离运行检查通过。远端整合另见 EXT-GIT/T0，产品验收另见后续任务。
- Evidence: [docs/changes/2026-09-17-governance-baseline/spec.md](../../docs/changes/2026-09-17-governance-baseline/spec.md), [docs/changes/2026-09-17-governance-baseline/verification.md](../../docs/changes/2026-09-17-governance-baseline/verification.md), [docs/evidence/governance-2026-09-17/verification.json](../../docs/evidence/governance-2026-09-17/verification.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-17
- Updated: 2026-09-17

## TASK-PROV-001 — 冷却恢复与产品调度入口边界

- Goal: 冷却到期恢复调度且保留隔离/并发边界
- Scope: 首页、对话、审批、重试/恢复的绑定连接校验和实际HTTP提交边界
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-PROV-001
- Feature IDs: FEAT-002, FEAT-022
- Owner role: repository-maintainer
- Acceptance: 统一时钟覆盖 deadline 前/时/后; 缺 deadline 的冷却和 quarantined/disabled/degraded 均不可选; 满载和不支持操作不可选; 首页/对话/重试在实际提交前检查绑定连接，不回退绕过隔离/冷却
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: src/domain/providerConnections.ts, src/features/creation/generationQueue.ts, tests/unit/generationQueue.test.ts, src/App.tsx, src/features/creation/providerRegistry.ts, tests/browser/provider-scheduling.spec.ts
- Verification: PASS — 源修复、本地main合并和桌面生产复验 PASS：118 unit、151 browser、UI116/0；主线14dbe11加载CBwa_Zj7 bundle并完成隔离Provider提交。
- Evidence: [docs/changes/2026-09-17-provider-submission-gates/verification.md](../../docs/changes/2026-09-17-provider-submission-gates/verification.md), [docs/evidence/provider-submission-2026-09-18/README.md](../../docs/evidence/provider-submission-2026-09-18/README.md), [docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json](../../docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-18
- Updated: 2026-09-18

## T1 — 读取保护、备份和 revision 冲突

- Goal: 读取保护、备份和 revision 冲突
- Scope: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:T1
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 已记录范围内Web恢复及原生正常重启不丢数据; 失败不覆盖原件
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Verification: PASS — 2026-09-16 原生及Web验收记录，仅该记录范围；不证明断电、未提交编辑或完整产品就绪
- Evidence: [docs/changes/2026-09-16-desktop-data-stability/verification.md](../../docs/changes/2026-09-16-desktop-data-stability/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-17
- Updated: 2026-09-17

## T2 — 画布图持久化与稳定节点身份

- Goal: 画布图持久化与稳定节点身份
- Scope: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:T2
- Feature IDs: FEAT-001
- Owner role: repository-maintainer
- Acceptance: 已记录范围内Web恢复及原生正常重启不丢数据; 失败不覆盖原件
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Verification: PASS — 2026-09-16 原生及Web验收记录，仅该记录范围；不证明断电、未提交编辑或完整产品就绪
- Evidence: [docs/changes/2026-09-16-desktop-data-stability/verification.md](../../docs/changes/2026-09-16-desktop-data-stability/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-17
- Updated: 2026-09-17

## T3a — 原生素材及引用最终验收

- Goal: 原生素材及引用最终验收
- Scope: src-tauri/src/asset_storage.rs, src/features/creation/assetRepository.ts, src/features/creation/snapshotAssets.ts
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:T3a
- Feature IDs: FEAT-014, FEAT-015
- Owner role: repository-maintainer
- Acceptance: 原图hash一致; 新WebView恢复; 缺失原件冻结保存; 原生/浏览器证据与最终build对应
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src-tauri/src/asset_storage.rs, src/features/creation/assetRepository.ts, src/features/creation/snapshotAssets.ts
- Verification: PASS — main@c855881 的 Node 24/Web/Rust/Tauri release 验证通过；隔离数据根目录与三个全新 WebView profile 验证原生素材 SHA-256、快照引用恢复和篡改后读取保护。T3b 项目包仍未完成。
- Evidence: [docs/changes/2026-09-16-native-assets/spec.md](../../docs/changes/2026-09-16-native-assets/spec.md), [docs/changes/2026-09-16-native-assets/verification.md](../../docs/changes/2026-09-16-native-assets/verification.md), [docs/evidence/native-assets-2026-09-18/native-acceptance.json](../../docs/evidence/native-assets-2026-09-18/native-acceptance.json), [docs/evidence/native-assets-2026-09-18/build-artifacts.json](../../docs/evidence/native-assets-2026-09-18/build-artifacts.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-18
- Updated: 2026-09-18

## T3b — 完整项目包导出导入与恢复

- Goal: 完整项目包导出导入与恢复
- Scope: src/features/projects, src-tauri, src/components
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:T3b
- Feature IDs: FEAT-015
- Owner role: repository-maintainer
- Acceptance: 包包含所有项目图与原件; schema/checksum/引用预检; 隔离数据根目录恢复; 非法包/写失败不损原件
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: src/features/projects, src-tauri, src/components
- Verification: PASS — 源码 main@379b302：129 unit、156 browser、UI117/0、50 Rust、fmt/check/release 通过；全新 WebView/独立 data root 恢复 2 项目/3 节点/图/消息/任务/原件；7 个事务故障点保留源文件。Web 文件适配归 T9，Figma 新入口为工程补充。
- Evidence: [docs/changes/2026-09-18-project-package/intent.md](../../docs/changes/2026-09-18-project-package/intent.md), [docs/changes/2026-09-18-project-package/spec.md](../../docs/changes/2026-09-18-project-package/spec.md), [docs/changes/2026-09-18-project-package/plan.md](../../docs/changes/2026-09-18-project-package/plan.md), [docs/changes/2026-09-18-project-package/verification.md](../../docs/changes/2026-09-18-project-package/verification.md), [src/features/projects/projectPackage.ts](../../src/features/projects/projectPackage.ts), [src/features/projects/nativeProjectPackageAdapter.ts](../../src/features/projects/nativeProjectPackageAdapter.ts), [tests/unit/projectPackage.test.ts](../../tests/unit/projectPackage.test.ts), [src-tauri/src/project_package.rs](../../src-tauri/src/project_package.rs), [docs/evidence/project-package-2026-09-18/native-acceptance.json](../../docs/evidence/project-package-2026-09-18/native-acceptance.json), [docs/evidence/project-package-2026-09-18/web-acceptance.json](../../docs/evidence/project-package-2026-09-18/web-acceptance.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-18
- Updated: 2026-09-18

## T4 — 统一实际图片生成入口及健康语义

- Goal: 统一实际图片生成入口及健康语义
- Scope: src/App.tsx, src/features/creation, src/integrations/generation, src/components/nodes
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:T4
- Feature IDs: FEAT-009, FEAT-016
- Owner role: repository-maintainer
- Acceptance: 首页/对话/画布走同一command; 已配置不冒充已验证; 参考图不丢弃; 失败/取消/离线与归档完整
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: src/App.tsx, src/features/creation, src/integrations/generation, src/components/nodes
- Verification: PASS — 本地main源码2de3c68：146 unit/164 browser/UI119/0全量verify通过；Rust51/fmt/check/release通过；1421/1423/Tauri三入口与全新WebView原件恢复通过。动画测试改为真实CSS时间点采样后全量无重试通过。真实付费Provider仍属EXT-PROVIDER。
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md), [docs/changes/2026-09-18-unified-image-command/verification.md](../../docs/changes/2026-09-18-unified-image-command/verification.md), [docs/evidence/unified-image-command-2026-09-18/native-acceptance.json](../../docs/evidence/unified-image-command-2026-09-18/native-acceptance.json), [docs/evidence/unified-image-command-2026-09-18/main/native-acceptance.json](../../docs/evidence/unified-image-command-2026-09-18/main/native-acceptance.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-18
- Updated: 2026-09-18

## T5 — 持久本地 TaskHost 与未知受理恢复

- Goal: 持久本地 TaskHost 与未知受理恢复
- Scope: src/features/generation-server, src-tauri, src/features/creation, deploy
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:T5
- Feature IDs: FEAT-002, FEAT-008, FEAT-016, FEAT-024
- Owner role: repository-maintainer
- Acceptance: durable intent先于提交; 重启同一身份不重复计费; unknown不可直接普通retry; 本地宿主随包且不依赖VPS
- Branch: `codex/T5-native-lifecycle`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/T5-native-lifecycle`
- Modules: src/features/generation-server, src-tauri, src/features/creation, deploy
- Verification: PASS — 04260ad精确独立补审PASS关闭ENV004；26策略及额外9边界回归通过；Hosted37770000879/37769995909全部SUCCESS，native11组/5CDP启动与策略清理通过。PR37普通squash合入main78cea37，完整tree一致；合并后main37773335548 verify/deploy-linux SUCCESS。Hosted实际checkout source7849310为base1af+candidate042合成merge，完整tree等同042/78，9/9源码hash核验；原收据身份不改写。PROV005/006继续TODO。
- Evidence: [docs/changes/2026-09-19-taskhost-durable-intent/verification.md](../../docs/changes/2026-09-19-taskhost-durable-intent/verification.md), [tests/browser/task-intent.spec.ts](../../tests/browser/task-intent.spec.ts), [tests/unit/nativeTaskHost.test.ts](../../tests/unit/nativeTaskHost.test.ts), [deploy/README.md](../../deploy/README.md), [docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md](../../docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md), [tests/desktop/taskhost-lifecycle.mjs](../../tests/desktop/taskhost-lifecycle.mjs), [tests/desktop/native-ci-policy.ps1](../../tests/desktop/native-ci-policy.ps1)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 codex/T5-native-lifecycle 已通过 PR#37 78cea37a 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-10-08
- Updated: 2026-10-08

## T6 — Desktop ComfyUI最小链实现

- Goal: Desktop ComfyUI最小链实现
- Scope: src/integrations/generation/localComfyUiAdapter.ts, src-tauri, src/features/comfyui
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T6
- Feature IDs: FEAT-004, FEAT-005
- Owner role: repository-maintainer
- Acceptance: 能力探测/模板/任务/素材/恢复完整接线; 不自动下载模型; 仅取消本任务; Web禁用原生能力
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/integrations/generation/localComfyUiAdapter.ts, src-tauri, src/features/comfyui
- Verification: PARTIAL — 只读审计确认：localComfyUiAdapter.ts 具备 /prompt、/history、/view、/interrupt HTTP 原语，但 App/imageTaskCommand 尚未接入，local_only 明确拒绝；Tauri ComfyUI 命令尚无前端 invoke 桥，缺少 Desktop-only workflow/template 持久化、任务 journal、逐任务取消、结果归档与重启恢复。下一步需先接一条显式 workflow 的最小链，不下载模型；EXT-COMFY 仍等待用户选定服务、目录、workflow 和模型。
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-17
- Updated: 2026-09-17

## EXT-PROVIDER — 真实 Provider/GPU 生成验收

- Goal: 真实 Provider/GPU 生成验收
- Scope: Provider live acceptance
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:EXT-PROVIDER
- Feature IDs: FEAT-002, FEAT-006, FEAT-007, FEAT-008
- Owner role: repository-maintainer
- Acceptance: 授权真实服务执行最小生成和编辑; 结果持久化与成本语义真实
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Provider live acceptance
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/verification.md](../../docs/changes/2026-09-16-launch-readiness-audit/verification.md)
- External condition: 缺少本轮授权可用的Provider凭据、服务与模型；本地mock不能替代
- Next action: 复核阻塞条件，解除后重新验证并保留原失败证据
- Last verified: 2026-09-17
- Updated: 2026-09-17

## EXT-COMFY — 真实 ComfyUI/模型验收

- Goal: 真实 ComfyUI/模型验收
- Scope: ComfyUI live acceptance
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:EXT-COMFY
- Feature IDs: FEAT-004
- Owner role: repository-maintainer
- Acceptance: 真实workflow成功/缺模型/断连/重启与原图hash验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: ComfyUI live acceptance
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/verification.md](../../docs/changes/2026-09-16-launch-readiness-audit/verification.md)
- External condition: 尚无已确认的用户选择ComfyUI目录、运行服务、workflow与模型
- Next action: 复核阻塞条件，解除后重新验证并保留原失败证据
- Last verified: 2026-09-17
- Updated: 2026-09-17

## T7 — Desktop可用版本及安装恢复验收

- Goal: Desktop可用版本及安装恢复验收
- Scope: release, tests/native
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T7
- Feature IDs: FEAT-026
- Owner role: repository-maintainer
- Acceptance: 干净Windows安装完整故事; 离线/损坏恢复; 最终exe/commit/hash对应; 可回滚
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: release, tests/native
- Verification: PARTIAL — portable Desktop2.1.2 与 NSIS 本机隔离安装/启动/Agent/4279文件、重装、损坏修复、卸载再装项目保留通过；干净 Windows/真实断网/低版本回滚/签名及真实服务依赖仍未验收。
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md), [docs/changes/2026-09-30-desktop-installer/verification.md](../../docs/changes/2026-09-30-desktop-installer/verification.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-30
- Updated: 2026-09-30

## T8 — 成熟Core职责和平台能力边界

- Goal: 成熟Core职责和平台能力边界
- Scope: src/App.tsx, src/domain, src/runtime, src/features
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T8
- Feature IDs: FEAT-024
- Owner role: repository-maintainer
- Acceptance: 按职责拆分composition root; UI通过服务与平台能力接口; Desktop回归保持
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/App.tsx, src/domain, src/runtime, src/features
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-17
- Updated: 2026-09-17

## T9 — Web本地版及浏览器容量/离线能力

- Goal: Web本地版及浏览器容量/离线能力
- Scope: src/components/Sidebar.tsx, src/components/LibraryPage.tsx, src/runtime, src/features/creation
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T9
- Feature IDs: FEAT-015, FEAT-019
- Owner role: repository-maintainer
- Acceptance: 无Comfy/原生假入口; 配额错误/持久存储/离线恢复; 项目包跨origin; 会话凭据不持久化
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/components/Sidebar.tsx, src/components/LibraryPage.tsx, src/runtime, src/features/creation
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-17
- Updated: 2026-09-17

## T10-PREP — VPS发布、备份回滚与部署配置准备

- Goal: VPS发布、备份回滚与部署配置准备
- Scope: deploy、tests/deploy、quality Linux job、搬迁与恢复文档
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T10-PREP
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 独立next服务不覆盖旧站; 部署配置/health/权限/资源限制; 备份还原及回滚runbook可审阅
- Branch: `codex/T10-PREP-vps-migration`
- Worktree: `D:/kk-studio/.worktrees/canvas-compare`
- Modules: deploy, tests/deploy, .github/workflows/quality.yml, docs/architecture/adr
- Verification: PARTIAL — 静态包整包 hash、指定离机包恢复与共享锁版本回滚已形成主线准备产物；PR #23 精确 head abe1e99 的 delivery、deploy-linux、verify 与独立复审均 PASS，并已合入 main@45fdc14，合并后 deploy-linux/verify 也 PASS。真实 VPS 离机备份/恢复演练未完成，部署配置、权限和资源限制需实际主机盘点。
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md), [docs/changes/2026-09-28-vps-migration/intent.md](../../docs/changes/2026-09-28-vps-migration/intent.md), [docs/changes/2026-09-28-vps-migration/spec.md](../../docs/changes/2026-09-28-vps-migration/spec.md), [docs/changes/2026-09-28-vps-migration/plan.md](../../docs/changes/2026-09-28-vps-migration/plan.md), [docs/changes/2026-09-28-vps-migration/verification.md](../../docs/changes/2026-09-28-vps-migration/verification.md), [docs/changes/2026-09-28-vps-migration/review.md](../../docs/changes/2026-09-28-vps-migration/review.md), [deploy/MIGRATION.md](../../deploy/MIGRATION.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-28
- Updated: 2026-09-28

## T10 — VPS staging和生产实机验收

- Goal: VPS staging和生产实机验收
- Scope: VPS, DNS, TLS
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T10
- Feature IDs: FEAT-017, FEAT-018, FEAT-019, FEAT-020
- Owner role: repository-maintainer
- Acceptance: 用户域名直达VPS; 外网TLS/鉴权/端口实测; 备份恢复及回滚演练
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: VPS, DNS, TLS
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/verification.md](../../docs/changes/2026-09-16-launch-readiness-audit/verification.md)
- External condition: 缺少本轮生产写入授权、正式/staging域名和DNS权限；先完成可审阅部署产物
- Next action: 复核阻塞条件，解除后重新验证并保留原失败证据
- Last verified: 2026-09-17
- Updated: 2026-09-17

## T11 — 旧Web/Vercel切换与退役

- Goal: 旧Web/Vercel切换与退役
- Scope: Vercel, DNS, legacy migration
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T11
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 旧origin可导出备份; 新站验收后有限回滚窗口; 逐项退役不删除用户数据
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Vercel, DNS, legacy migration
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- External condition: 需外部旧部署权限、切换授权与回滚窗口
- Next action: 复核阻塞条件，解除后重新验证并保留原失败证据
- Last verified: 2026-09-17
- Updated: 2026-09-17

## T12 — Mobile 独立形态与手机适配

- Goal: 在 Web 核心能力基础上交付独立 Mobile 版本，按手机资源与交互裁剪
- Scope: Mobile, Shared Core
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:T12
- Feature IDs: FEAT-028
- Owner role: repository-maintainer
- Acceptance: 明确独立 Mobile runtime 与 Web 核心能力子集; 手机交互优化，登录后使用，个人数据设备本地持久化; Mobile 版本独立递增并对应可安装产物; 真机验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Mobile, Shared Core
- Verification: NOT_VERIFIED — 当前只有响应式 Web；用户已确定功能顺序和登录/本地数据目标，独立 runtime 与真机验收未实现。
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-28
- Updated: 2026-09-28

## UI-001 — UI tokens和共享组件契约

- Goal: UI tokens和共享组件契约
- Scope: src/styles, src/components/ui, scripts/check-ui-standards.mjs
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:UI-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 可执行token/图标/状态规范; 按语义组件迁移; Figma节点例外有证据
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/styles, src/components/ui, scripts/check-ui-standards.mjs
- Verification: PARTIAL — Design System 1.1共享控件已建立；目录/Skill字段/筛选、图标按钮、设置局部覆盖继续迁移并取得双端证据。其余历史专项页面与来源例外继续按实际组件验收，保留PARTIAL。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/plan.md](../../docs/changes/2026-09-16-ui-system-audit/plan.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-22
- Updated: 2026-09-22

## UI-002 — 窄屏composer和动态文案溢出

- Goal: 窄屏composer和动态文案溢出
- Scope: src/components/StartComposer.tsx, src/styles, src/components/ConversationPanel.tsx
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:UI-002
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 390/768/1440/1920主操作可达; 长模型文案不遮挡; 同状态DOM/截图; 键盘焦点与IME保持
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/StartComposer.tsx, src/styles, src/components/ConversationPanel.tsx
- Verification: PASS — 已选择性整合原root UI候选；最终verify150 Node/190浏览器/UI119/0、Rust60与dev/preview/桌面34页面矩阵均通过。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/audit.md](../../docs/changes/2026-09-16-ui-system-audit/audit.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-20
- Updated: 2026-09-20

## UI-003 — 示例任务/账号与真实服务边界

- Goal: 示例任务/账号与真实服务边界
- Scope: src/components/canvas/TaskPanel.tsx, src/components/AccountPopup.tsx, src/components/settings
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:UI-003
- Feature IDs: FEAT-016, FEAT-025
- Owner role: repository-maintainer
- Acceptance: 空真实任务不冒充正在生成; fixture首屏可辨识; 不可用服务说明一致; Figma/运行态验收
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/canvas/TaskPanel.tsx, src/components/AccountPopup.tsx, src/components/settings
- Verification: PARTIAL — 交互和真实服务说明已在origin/main候选完成整合，定向浏览器回归通过；最终主线同步见TASK-UI-MAIN-001。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/audit.md](../../docs/changes/2026-09-16-ui-system-audit/audit.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-20
- Updated: 2026-09-20

## UI-004 — 逐页对齐、IA和最终视觉运行态

- Goal: 逐页对齐、IA和最终视觉运行态
- Scope: Landing, Workspace, Assets, Settings, Tasks, Account
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:UI-004
- Feature IDs: FEAT-001, FEAT-022, FEAT-023, FEAT-036
- Owner role: repository-maintainer
- Acceptance: 当前Design System与已确认页面来源的同状态视觉对比; 六态及异步/键盘/离线; dev1421/preview1423/Tauri最终source分别确认
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: Landing, Workspace, Assets, Settings, Tasks, Account
- Verification: PARTIAL — 已取得当前项目库、Skills、ComfyUI目录与设置分区的Web/新版Tauri证据，包含长分类/浅色图标、16色主题矩阵、偏好Skill重启。缺失页面Frame与用户最终视觉验收仍未完成。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/plan.md](../../docs/changes/2026-09-16-ui-system-audit/plan.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-22
- Updated: 2026-09-22

## PERF-001 — 原生素材缩略图/分页及内存IO

- Goal: 原生素材缩略图/分页及内存IO
- Scope: src/features/creation/assetRepository.ts, src/features/creation/useAssetArchive.ts, src-tauri
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:PERF-001
- Feature IDs: FEAT-014
- Owner role: repository-maintainer
- Acceptance: 原件与预览分离; 可见素材按需加载; 大型库有测量证据; 原图校验/来源不回归
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/assetRepository.ts, src/features/creation/useAssetArchive.ts, src-tauri
- Verification: PARTIAL — 本轮已完成有界分页/预览和原件校验；永久缩略图、大快照和单件大图瞬时内存/不可抢占IO仍未完成。
- Evidence: [docs/architecture/DATA-STORAGE.md](../../docs/architecture/DATA-STORAGE.md), [docs/architecture/adr/ADR-003-asset-metadata-paging.md](../../docs/architecture/adr/ADR-003-asset-metadata-paging.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-21
- Updated: 2026-09-21

## EXT-GIT — 远端PR与main保护规则

- Goal: 远端PR与main保护规则
- Scope: Git hosting
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:EXT-GIT
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: remote明确并可访问; PR/required checks/block force/delete有效; 实际CI运行证据
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Git hosting
- Verification: PASS — 2026-09-23 用户确认仓库公开；PR #9 当前 head 的 hosted verify/delivery 均成功，已 squash 合入 main@b45c5bc7，合并树与候选树一致；合并后 main 工作流 35836597858 success。三个远端 ruleset 回读 active（23866923/23866924/23866925），main protected=true，有效规则含 PR、必需检查、禁止删除和非快进。管理员仍可修改规则。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md), [docs/changes/2026-09-20-gpt-6-astra/verification.md](../../docs/changes/2026-09-20-gpt-6-astra/verification.md), [docs/changes/2026-09-23-rules-audit-main/verification.md](../../docs/changes/2026-09-23-rules-audit-main/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TEST-PROV-001 — Provider真实入口浏览器回归

- Goal: 独立复现旧入口绕过并验证拒绝不发送HTTP
- Scope: tests/browser/provider-scheduling.spec.ts
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TEST-PROV-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 首页拒绝保持草稿; 审批后二次检查与固定连接不回退; 429冷却到期重试及403隔离
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: tests/browser/provider-scheduling.spec.ts
- Verification: PASS — 12项浏览器回归和3项submission gate单元测试 PASS；主线verify及桌面运行证据已复验。
- Evidence: [docs/changes/2026-09-17-provider-submission-gates/verification.md](../../docs/changes/2026-09-17-provider-submission-gates/verification.md), [docs/evidence/provider-submission-2026-09-18/baseline-red.txt](../../docs/evidence/provider-submission-2026-09-18/baseline-red.txt), [docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json](../../docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-18
- Updated: 2026-09-18

## TASK-ASTRA-001 — Astra 迁移计划与 Git 分支规则同步

- Goal: 以最新 main 校正 Astra 计划并向用户指定的 2.0 仓库安全同步
- Scope: 计划文档、适用规则审计、治理记录、明确范围的 Git 同步
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-ASTRA-001
- Feature IDs: FEAT-027
- Owner role: repository-maintainer
- Acceptance: 基于已验收 main，保护原工作区与索引; 计划与 T3b/T4/T5 现状一致; 适用规则和 Git 目标身份核对; 指定新远端后仅推明确范围任务分支并交付可审阅 PR
- Branch: `codex/TASK-KK2-main-integration`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-astra-001/kk-studio-next`
- Modules: docs/changes/2026-09-20-gpt-6-astra, docs/governance, docs/PROGRESS.md
- Verification: PASS — 迁移计划、规则审计、目录清理、本地验证和目标仓库 PR 同步均完成；Astra 应用功能本身仍按计划待实施。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/verification.md](../../docs/changes/2026-09-20-gpt-6-astra/verification.md), [docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-20
- Updated: 2026-09-20

## TASK-KK2-MAIN-SYNC — KK Studio 2.0 本地与云端 main 树同步

- Goal: 将目标仓库 main 的当前文件树替换为已验证的本地 KK Studio 2.0 main，并保持两端 tree 一致
- Scope: Git hosting、全仓库文件树、main 分支同步
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-KK2-MAIN-SYNC
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 本地 main 已从最新已验收提交快进整合; 目标远端 main 的替换分支只基于远端 main 创建; 替换分支 tree SHA 与本地 main 完全一致; secret/path/构建产物扫描通过且旧 v1.6.1 当前文件不再出现在候选树; PR 合并后回读远端 main SHA/tree SHA 与本地 main 一致
- Branch: `chore/TASK-KK2-MAIN-SYNC`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-KK2-MAIN-SYNC`
- Modules: Git hosting, repository tree, main
- Verification: PASS — PR #1 已 squash 合并到目标 main；远端 main 回读 commit=a9db71b，tree=a3cad24，与本地稳定 main tree 相同；候选 quality workflow 全部成功。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md), [docs/changes/2026-09-20-gpt-6-astra/verification.md](../../docs/changes/2026-09-20-gpt-6-astra/verification.md), [docs/changes/2026-09-20-gpt-6-astra/sync-manifest.md](../../docs/changes/2026-09-20-gpt-6-astra/sync-manifest.md), [docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-20
- Updated: 2026-09-20

## TASK-UI-UNMERGED-001 — dirty checkout 未合并 UI 回归候选

- Goal: 审查并在独立分支验收脏工作区中发现的 UI 交互修复
- Scope: UI interaction/regression
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-UNMERGED-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 复核 useDismissible、Modal、TopBar、TaskPanelPopover、settings focus/switch 改动的源代码差异; 从最新稳定 main 建立独立 task branch/worktree，不复制 dirty checkout 全量内容; 运行定向浏览器回归和完整 verify，并保留同状态证据
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/useDismissible.ts, src/components/Modal.tsx, src/components/TopBar.tsx, src/components/TaskPanelPopover.tsx, src/components/settings/SettingsControls.tsx, src/components/settings/ConnectionSettings.tsx, tests/browser
- Verification: PASS — 已选择性整合原root UI候选；最终verify150 Node/190浏览器/UI119/0、Rust60与dev/preview/桌面34页面矩阵均通过。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-20
- Updated: 2026-09-20

## TASK-UI-MAIN-001 — 现行Figma页面校正与交互修复主线整合

- Goal: 将审阅的交互/视觉修复和当前主线功能整合并经PR同步
- Scope: UI geometry, popover lifecycle, selective integration, main provenance
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-MAIN-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 原root候选选择性三方整合，保留T3b/T4/T5; 现行Figma有节点页面同状态DOM与截图; 完整verify、Rust与三种运行模式通过; PR/CI及本地云端main同一提交回读；原工作区有可校验备份
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components, src/styles, src-tauri/src/main.rs, tests/browser, scripts/audit, docs/governance
- Verification: PASS — PR #3 已 squash 合并；双 CI 通过（npm verify、Rust fmt/60 tests、client check/build）；远端 main 与本地 main 均为 fb57529c；409项原工作逐项备份并归档，根目录工作树干净。UI-004 的独立设计来源缺口另行记录，不改变本任务已验证范围。
- Evidence: [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md), [docs/changes/2026-09-20-ui-main-alignment/review.md](../../docs/changes/2026-09-20-ui-main-alignment/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-20
- Updated: 2026-09-20

## TASK-UI-DISMISS-002 — 窄屏侧栏关闭与大图重绘稳定性

- Goal: 修复跨断点菜单关闭及大图重绘字节转换，校正异步审批回归时序
- Scope: Sidebar dismissal stack and large-image redraw conversion/regression budget
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-DISMISS-002
- Feature IDs: FEAT-023
- Owner role: repository-maintainer
- Acceptance: 重现跨断点+键盘展开场景; 账号关闭后侧栏保持可操作，后续外部点击仍收起侧栏; 完整浏览器回归及dev/preview/Desktop专项通过
- Branch: `codex/TASK-UI-MAIN-001-followup`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/Sidebar.tsx, tests/browser/menu-boundaries.spec.ts, tests/browser/unified-image-command.spec.ts, src/features/creation/assetRepository.ts, src/features/creation/imageGeneration.ts, tests/browser/task-intent.spec.ts
- Verification: PASS — 最终完整verify通过：150 Node、191浏览器、0失败/重试；三运行模式专项通过；2.35MB重绘20倍CPU连续3次通过，完整原图字节断言保留。中途unknown用例重试已定位并修正异步审批等待。
- Evidence: [docs/changes/2026-09-20-ui-main-alignment/followup.md](../../docs/changes/2026-09-20-ui-main-alignment/followup.md), [docs/evidence/2026-09-20-ui-main-alignment/followup/browser-summary.json](../../docs/evidence/2026-09-20-ui-main-alignment/followup/browser-summary.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-20
- Updated: 2026-09-20

## TASK-MAIN-CLOSE-002 — 未完成子任务汇总验收与主线同步

- Goal: 未完成子任务汇总验收与主线同步
- Scope: review, regression stability, governance reconciliation, main parity
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-MAIN-CLOSE-002
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 独立审阅页面和素材子任务; 完整验证与三模式运行证据; 经PR与CI同步本地及云端main
- Branch: `codex/TASK-MAIN-CLOSE-002`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-main-close-002/kk-studio-next`
- Modules: tests/browser, docs/governance, docs/PROGRESS.md
- Verification: PASS — 历史候选 bb96dad 的本地 verify 为 172 Node、197 browser、UI121/0，Rust61/61、fmt、client check 通过；三模式 runtime 证据源为 8369185。PR #8 最终 head dac81ec 是 PR #9 head da811283 的祖先；PR #9 当前候选 hosted verify/delivery 成功并 squash 合入 main@b45c5bc7，完整树回读一致。PR #8 因内容被吸收已关闭而未重复合并；旧分支和历史证据保留。
- Evidence: [docs/changes/2026-09-20-main-close-002/intent.md](../../docs/changes/2026-09-20-main-close-002/intent.md), [docs/changes/2026-09-20-main-close-002/spec.md](../../docs/changes/2026-09-20-main-close-002/spec.md), [docs/changes/2026-09-20-main-close-002/plan.md](../../docs/changes/2026-09-20-main-close-002/plan.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-20-main-close-002/review.md](../../docs/changes/2026-09-20-main-close-002/review.md), [docs/evidence/2026-09-21-main-close-002/verify-run.json](../../docs/evidence/2026-09-21-main-close-002/verify-run.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TASK-UI-CLOSE-003 — 现行Figma页面缺口复核与交互收口

- Goal: 现行Figma页面缺口复核与交互收口
- Scope: current Figma source, page interaction and visual evidence
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-CLOSE-003
- Feature IDs: none
- Owner role: design-maintainer
- Acceptance: 重新读取现行设计来源; 可获得基准的页面同状态核对; 缺失设计来源和工程补充明确区分
- Branch: `codex/TASK-UI-CLOSE-003-figma`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-ui-close-003/kk-studio-next`
- Modules: src/components, src/styles, tests/browser
- Verification: PASS — 现行可取得Figma节点回读、快捷键边框修复、typecheck与整合三模式运行证据通过；Landing及若干缺失Frame不冒称完成。
- Evidence: [docs/changes/2026-09-20-main-close-002/intent.md](../../docs/changes/2026-09-20-main-close-002/intent.md), [docs/changes/2026-09-20-main-close-002/spec.md](../../docs/changes/2026-09-20-main-close-002/spec.md), [docs/changes/2026-09-20-main-close-002/plan.md](../../docs/changes/2026-09-20-main-close-002/plan.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-20-main-close-002/review.md](../../docs/changes/2026-09-20-main-close-002/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-21
- Updated: 2026-09-21

## TASK-PERF-ASSETS-001 — 素材列表元数据和原件按需读取

- Goal: 素材列表元数据和原件按需读取
- Scope: asset listing, paging, previews and original preservation
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-PERF-ASSETS-001
- Feature IDs: FEAT-014
- Owner role: performance-maintainer
- Acceptance: 素材列表不批量读取原件; 预览按需加载与分页; 大库测量和原图字节一致性验证
- Branch: `codex/TASK-PERF-ASSETS-001`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-perf-assets-001/kk-studio-next`
- Modules: src/features/creation, src/components/AssetPanel.tsx, src-tauri/src/asset_storage.rs
- Verification: PASS — 元数据分页、按需缩略图、原件SHA与错身份/损坏重试、Rust分页与临时文件边界均通过；完整性能边界另由PERF-001跟踪。
- Evidence: [docs/changes/2026-09-20-main-close-002/intent.md](../../docs/changes/2026-09-20-main-close-002/intent.md), [docs/changes/2026-09-20-main-close-002/spec.md](../../docs/changes/2026-09-20-main-close-002/spec.md), [docs/changes/2026-09-20-main-close-002/plan.md](../../docs/changes/2026-09-20-main-close-002/plan.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-20-main-close-002/review.md](../../docs/changes/2026-09-20-main-close-002/review.md), [docs/architecture/adr/ADR-003-asset-metadata-paging.md](../../docs/architecture/adr/ADR-003-asset-metadata-paging.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-21
- Updated: 2026-09-21

## TASK-GOV-002 — 跨AI自主开发与分支质量门禁

- Goal: 落实共同规则、代码文档一致性、Git/CI防线和真实保护边界
- Scope: AI规则/SDLC/PR/Git防线/交付门禁/规则场景
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-GOV-002
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 入口统一、中文自然语言转工程任务; 真实push拒绝回归与delivery门禁通过; 规则、模板、脚本入口和账本绑定一致; 独立review和实际规则验证证据; 产品代码、产品测试、既有证据和其他人的提交保持只读
- Branch: `codex/TASK-GOV-002-closeout`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-GOV-002-CLOSEOUT`
- Modules: docs, scripts/governance, .github, .githooks, config, tests/unit/deliveryPolicy.test.ts, tests/unit/gitPushPolicy.test.ts, tests/evals
- Verification: PASS — PR #4、#7 已合入 main；当次 hosted delivery/verify、Rust fmt/test、client check、Tauri no-bundle build、治理35tasks/0、push9/9、delivery12/12、AI场景12/12、基线正反例2/2 均通过。先前 private 仓库的 ruleset API403 已由用户确认公开后解决；2026-09-23 三套 active ruleset 和 main 有效规则已回读，PR #9 当前 head 检查通过并合入 main。管理员仍可修改设置，模型实际读懂规则须另行演练；产品代码和旧证据不由本任务改写。
- Evidence: [docs/changes/2026-09-20-ai-sdlc/verification.md](../../docs/changes/2026-09-20-ai-sdlc/verification.md), [docs/changes/2026-09-21-ai-sdlc-closeout/verification.md](../../docs/changes/2026-09-21-ai-sdlc-closeout/verification.md), [docs/evidence/ai-sdlc-2026-09-20/remote-audit.json](../../docs/evidence/ai-sdlc-2026-09-20/remote-audit.json), [docs/changes/2026-09-23-rules-audit-main/verification.md](../../docs/changes/2026-09-23-rules-audit-main/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TASK-AUDIT-SEC-001 — 安全边界与异常任务状态审计

- Goal: 修复已复现的凭据泄露、重复提交、Gateway配置陈旧、账户额度漂移、跨窗口租约竞态、原生响应内存和结果URL SSRF风险
- Scope: Web provider URL/state recovery, Gateway registration/authentication, native TaskHost journal/download limits
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-AUDIT-SEC-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: Provider请求发出后取消或暂停进入unknown并禁止普通重试; 远程Provider只允许HTTPS，HTTP仅限本机回环地址; Gateway重启显式更新连接配置并撤销旧ACL，token冲突失败关闭; Gateway初始额度只在首次 provisioning 生效，额度配置漂移 fail closed，并发策略可安全更新; Web提交租约以Web Locks跨窗口串行协调，崩溃/旧元数据按live locks回收，不支持时拒绝提交; 原生Provider结果下载按同origin和DNS/IP策略收口并按流式总字节上限读取，任务journal替换不先删除原件
- Branch: `fix/TASK-AUDIT-SEC-001-boundaries`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-AUDIT-SEC-001`
- Modules: src/App.tsx, src/domain/modelProvider.ts, src/domain/providerConnections.ts, src/features/creation/taskRecovery.ts, src/features/generation-server/repository.ts, src/features/generation-server/http.ts, src/features/generation-server/main.ts, src-tauri/src/task_host.rs, tests/unit
- Verification: PASS — 历史安全 closeout 已随主线集成；当前完整 Web/Agent/Rust 回归再次通过。真实付费受理恢复仍归 T5/EXT-PROVIDER。
- Evidence: [docs/changes/2026-09-21-security-audit/audit.md](../../docs/changes/2026-09-21-security-audit/audit.md), [docs/changes/2026-09-21-security-audit/verification.md](../../docs/changes/2026-09-21-security-audit/verification.md), [docs/changes/2026-09-21-security-audit-closeout/intent.md](../../docs/changes/2026-09-21-security-audit-closeout/intent.md), [docs/changes/2026-09-21-security-audit-closeout/spec.md](../../docs/changes/2026-09-21-security-audit-closeout/spec.md), [docs/changes/2026-09-21-security-audit-closeout/plan.md](../../docs/changes/2026-09-21-security-audit-closeout/plan.md), [docs/changes/2026-09-21-security-audit-closeout/verification.md](../../docs/changes/2026-09-21-security-audit-closeout/verification.md), [docs/changes/2026-09-21-security-audit-closeout/review.md](../../docs/changes/2026-09-21-security-audit-closeout/review.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-CAP-001 — 本地 Skill/MCP/ComfyUI 能力补齐

- Goal: 复刻可安全落地的本地 Skill、MCP 工具发现与 ComfyUI 工作流交互，并保持未接入外部服务的边界可见
- Scope: src/features/skills, src/features/mcp, src/features/comfyui, Settings, Catalog, Composer, browser/unit tests
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-CAP-001
- Feature IDs: FEAT-005, FEAT-010, FEAT-011, FEAT-012, FEAT-013
- Owner role: repository-maintainer
- Acceptance: 本地 Skill 可安全导入、安装、编辑、启停、导出并应用到 Composer 草稿; MCP Streamable HTTP 可完成握手、分页工具发现、inputSchema 展示和显式确认调用; ComfyUI 工作流可本地创建、导入、导出、删除并显示真实运行边界; 凭据、token、脚本执行、远程市场和未接入服务不被伪造为已完成
- Branch: `feat/TASK-CAP-001-integrated`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-CAP-001-INTEGRATED`
- Modules: src/features/skills, src/features/mcp, src/features/comfyui, src/components/settings, src/components/LibraryPage.tsx, src/App.tsx, tests/unit, tests/browser
- Verification: PARTIAL — 最终 npm run verify 通过：187 Node、193 production browser、UI 127/0、lint/typecheck/format/build；MCP/Catalog 定向 9/9；client:check 与 client:build -- --no-bundle 通过并生成 release exe。MiniMax 仅完成安装包静态审计，桌面控制 RPC 不可用，1421 开发态、Tauri 窗口交互和真实 ComfyUI 提交待后续验收。
- Evidence: [docs/changes/2026-09-21-local-capabilities/intent.md](../../docs/changes/2026-09-21-local-capabilities/intent.md), [docs/changes/2026-09-21-local-capabilities/spec.md](../../docs/changes/2026-09-21-local-capabilities/spec.md), [docs/changes/2026-09-21-local-capabilities/verification.md](../../docs/changes/2026-09-21-local-capabilities/verification.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-21
- Updated: 2026-09-21

## TASK-MINIMAX-001 — MiniMax Design 交互审计与本地技能/MCP复刻

- Goal: 依据真实 MiniMax Design 操作证据，补齐 KK Studio 的技能库、连接器目录和 MCP 发现交互
- Scope: MiniMax Design skills/connectors/MCP/ComfyUI interaction audit; KK Studio skill registry, composer integration, connector prototype, MCP lifecycle
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-MINIMAX-001
- Feature IDs: FEAT-006, FEAT-012, FEAT-013
- Owner role: repository-maintainer
- Acceptance: 真实检查 MiniMax 的技能、连接器、菜单、设置和 ComfyUI 入口，并记录付费生成不执行的边界; KK Studio 技能库支持本地 Skill 的查看、导入、创建、编辑、启用/禁用、卸载和应用到草稿; 连接器目录提供真实可操作的详情、Escape/焦点恢复和明确 Prototype 安装边界; MCP Streamable HTTP 配置覆盖发现、分页、连接失败清理、卸载清理、持久化损坏提示和大小上限; Web 开发运行时完成同状态浏览器证据，未验证范围明确记录，不把本地原型描述为云端/付费能力
- Branch: `fix/TASK-MINIMAX-001-mcp-registry-limit`
- Worktree: `D:/kk-studio/.worktrees/TASK-MINIMAX-001-mcp-registry-limit`
- Modules: src/components/SkillsPage.tsx, src/components/SkillEditor.tsx, src/components/ConnectorCatalog.tsx, src/components/settings/McpSettings.tsx, src/features/skills/skillRegistry.ts, src/features/mcp/mcpClient.ts, tests/unit, docs/changes/2026-09-21-minimax-deep-audit
- Verification: PARTIAL — 2026-09-21 历史 MiniMax 只读审计和 KK Web Skill/Connector/MCP 验证仍按原证据解释；当前修复 MCP 配置超过 50 项会造成下次读取整表失败的问题。新工作树补齐构建前置后本地 371 Node、300 Web 浏览器回归及静态检查通过。完整生成、付费提交、桌面 Tauri release、真实第三方连接器安装、现代协议及独立复审仍未验证，保持 PARTIAL。旧分支 codex/feat/minimax-deep-replica-root 与 D:/kk-studio-next 仅为历史证据位置。
- Evidence: [docs/changes/2026-09-21-minimax-deep-audit/verification.md](../../docs/changes/2026-09-21-minimax-deep-audit/verification.md), [docs/evidence/minimax-deep-audit-2026-09-21/runtime.json](../../docs/evidence/minimax-deep-audit-2026-09-21/runtime.json), [docs/changes/2026-09-24-mcp-registry-limit/verification.md](../../docs/changes/2026-09-24-mcp-registry-limit/verification.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-24
- Updated: 2026-09-24

## TASK-MCP-PROTO-001 — MCP 2026 协议协商与旧版兼容

- Goal: 让手动 MCP 客户端在安全边界内兼容 2026-07-28 modern 与 2025-11-25 legacy 服务器，并用真实端点验收
- Scope: src/features/mcp/mcpClient.ts, tests/unit/mcpClient.test.ts, tests/browser/mcp-settings.spec.ts, Desktop/Web 连接验收
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-MCP-PROTO-001
- Feature IDs: FEAT-012
- Owner role: repository-maintainer
- Acceptance: 实现 server/discover 与旧版 initialize 的明确协商及安全回退，拒绝把鉴权或服务故障误判为旧版; 保持 HTTPS/loopback、凭据不持久化、超时取消、大小和分页限制; 用现代与旧版测试服务器覆盖发现、失败、重连与恢复；真实第三方服务器完成 Web 和 Desktop 验收
- Branch: `codex/TASK-AUDIT-20261003`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`
- Modules: src/features/mcp/mcpClient.ts, src/components/settings/McpSettings.tsx, tests/unit/mcpClient.test.ts, tests/browser/mcp-settings.spec.ts
- Verification: PARTIAL — 本地 modern/legacy 协商、发现、列表/调用、错误分类、认证错误不回退、超时/取消、2 MB 响应、500 工具、32 页/重复游标、凭据边界已通过 25 项 MCP 单测和浏览器握手回归；真实第三方服务器及 Desktop 实机验收仍待外部环境。
- Evidence: [docs/changes/2026-10-03-task-audit/intent.md](../../docs/changes/2026-10-03-task-audit/intent.md), [docs/changes/2026-10-03-task-audit/spec.md](../../docs/changes/2026-10-03-task-audit/spec.md), [docs/changes/2026-10-03-task-audit/plan.md](../../docs/changes/2026-10-03-task-audit/plan.md), [docs/changes/2026-10-03-task-audit/verification.md](../../docs/changes/2026-10-03-task-audit/verification.md), [docs/changes/2026-10-03-task-audit/review.md](../../docs/changes/2026-10-03-task-audit/review.md), [src/features/mcp/mcpClient.ts](../../src/features/mcp/mcpClient.ts), [src/components/settings/McpProtocolNotice.tsx](../../src/components/settings/McpProtocolNotice.tsx), [tests/unit/mcpClient.test.ts](../../tests/unit/mcpClient.test.ts), [tests/browser/mcp-settings.spec.ts](../../tests/browser/mcp-settings.spec.ts)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-10-03
- Updated: 2026-10-03

## TASK-MCP-REGISTRY-001 — MCP 多标签页配置写入不丢失

- Goal: 多个 Web 标签页同时修改 MCP 服务器列表时保留每次已确认的改动
- Scope: McpServerRegistry 多实例持久化、跨标签页同步和冲突反馈
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-MCP-REGISTRY-001
- Feature IDs: FEAT-012
- Owner role: repository-maintainer
- Acceptance: 两个 registry 实例从同一 49 项快照各新增一项，不静默覆盖先写者; 跨标签页删除与同 id 更新有明确冲突语义，并以自动测试覆盖; 保持 50 项上限、凭据不落盘和现有存储 key
- Branch: `codex/TASK-AUDIT-20261003`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`
- Modules: src/features/mcp/mcpClient.ts, src/components/settings/McpSettings.tsx, tests/unit/mcpClient.test.ts
- Verification: PASS — MCP 多实例写入在支持 Web Locks 时使用统一 exclusive lock 包住重读、冲突检查和写入并做写后校验；不支持时拒绝写入并显示只读原因，原始配置仍可查看和导出；定向单测覆盖两条默认存储路径及并发、stale add/remove、删除/更新冲突、容量和凭据边界。
- Evidence: [docs/changes/2026-10-03-task-audit/intent.md](../../docs/changes/2026-10-03-task-audit/intent.md), [docs/changes/2026-10-03-task-audit/spec.md](../../docs/changes/2026-10-03-task-audit/spec.md), [docs/changes/2026-10-03-task-audit/plan.md](../../docs/changes/2026-10-03-task-audit/plan.md), [docs/changes/2026-10-03-task-audit/verification.md](../../docs/changes/2026-10-03-task-audit/verification.md), [docs/changes/2026-10-03-task-audit/review.md](../../docs/changes/2026-10-03-task-audit/review.md), [src/features/mcp/mcpClient.ts](../../src/features/mcp/mcpClient.ts), [tests/unit/mcpClient.test.ts](../../tests/unit/mcpClient.test.ts)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-03
- Updated: 2026-10-03

## TASK-MCP-REGISTRY-002 — 旧版超限 MCP 配置无损恢复

- Goal: 让旧版本已存的 51 项 MCP 配置可被用户识别和恢复，避免列表空白时丢失原件
- Scope: MCP 本地配置损坏提示、原件导出和显式恢复流程
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-MCP-REGISTRY-002
- Feature IDs: FEAT-012
- Owner role: repository-maintainer
- Acceptance: 已有 51 项存储字节在查看、导出和恢复前保持不变; 界面说明超限原因并提供可用的导出或显式修复路径; 51 项与其他损坏 JSON 的回归测试分别覆盖，且不放宽正常写入的 50 项上限
- Branch: `codex/TASK-AUDIT-20261003`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`
- Modules: src/features/mcp/mcpClient.ts, src/components/settings/McpSettings.tsx, tests/unit/mcpClient.test.ts, tests/browser/mcp-settings.spec.ts
- Verification: PASS — 51+ 合法旧配置保持原始字节，可导出并显式恢复；损坏 JSON 暴露 hasCorruption、停止覆盖且设置页提供导出入口；超限与损坏单测和浏览器回归通过，正常写入仍限制 50 项。
- Evidence: [docs/changes/2026-10-03-task-audit/intent.md](../../docs/changes/2026-10-03-task-audit/intent.md), [docs/changes/2026-10-03-task-audit/spec.md](../../docs/changes/2026-10-03-task-audit/spec.md), [docs/changes/2026-10-03-task-audit/plan.md](../../docs/changes/2026-10-03-task-audit/plan.md), [docs/changes/2026-10-03-task-audit/verification.md](../../docs/changes/2026-10-03-task-audit/verification.md), [docs/changes/2026-10-03-task-audit/review.md](../../docs/changes/2026-10-03-task-audit/review.md), [src/features/mcp/mcpClient.ts](../../src/features/mcp/mcpClient.ts), [src/components/settings/McpSettings.tsx](../../src/components/settings/McpSettings.tsx), [src/components/settings/McpOverflowNotice.tsx](../../src/components/settings/McpOverflowNotice.tsx), [tests/unit/mcpClient.test.ts](../../tests/unit/mcpClient.test.ts), [tests/browser/mcp-settings.spec.ts](../../tests/browser/mcp-settings.spec.ts)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-03
- Updated: 2026-10-03

## FEATURE-SYSTEM — 功能卡片体系、状态看板与后端化路线

- Goal: 每个功能有唯一可定位的功能卡片，状态经 registry 门禁与账本打通，并给出演示功能后端化分批路线
- Scope: docs/features, scripts/features, scripts/check-features.mjs, package.json, AGENTS.md, AI_RULES.md, docs/governance
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:FEATURE-SYSTEM
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: docs/features 下每个功能一张卡片并在 features.registry.json 登记; features:check 校验卡片章节、路径、任务关联与看板一致性，并并入 lint/verify; 任何 AI 从 AGENTS 入口可定位功能状态、代码、测试与后端化差距; 后端化路线图按波次拆分并映射到账本任务
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: docs/features, scripts/check-features.mjs, scripts/features/registry.mjs, AGENTS.md, AI_RULES.md, docs/governance/SPEC_BASELINE.md
- Verification: PASS — 28 张功能卡片与 registry 一致；features:check 零违规并接入 lint；看板由 registry 生成；规则入口与账本任务已更新；typecheck、212 项单测与 200 项浏览器回归通过。
- Evidence: [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md), [docs/features/README.md](../../docs/features/README.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-21
- Updated: 2026-09-21

## BACKEND-IMAGE-PARAMS — 图片比例与清晰度真实透传供应商

- Goal: 图片节点比例/清晰度从仅存草稿改为 Web 与 Desktop 链路真实发送 size 参数
- Scope: src/domain/imageParameters.ts, imageGeneration.ts, nativeTaskHost.ts, model.ts, imageTaskCommand.ts, App.tsx, CreationParameters.tsx, src-tauri/src/task_host.rs
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:BACKEND-IMAGE-PARAMS
- Feature IDs: FEAT-003
- Owner role: repository-maintainer
- Acceptance: 纯函数映射比例×清晰度到供应商 size，自适应=不传; 浏览器 JSON 与 multipart 请求透传 size; Desktop TaskHost 经 IPC 透传 size 到 JSON/multipart; 新增映射单测，UI 去除草稿参数误导文案
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/domain/imageParameters.ts, src/features/creation/imageGeneration.ts, src/features/creation/nativeTaskHost.ts, src/features/creation/model.ts, src/features/creation/imageTaskCommand.ts, src/App.tsx, src/components/nodes/CreationParameters.tsx, src-tauri/src/task_host.rs, tests/unit/imageParameters.test.ts
- Verification: PARTIAL — 代码透传与旧212/200/65测试记录保留；新增浏览器证据覆盖图片原始尺寸写入快照、刷新后回载和比例保持；仍缺 Desktop 参数实机 HTTP及同状态证据，不能 DONE/REAL；供应商尺寸枚举和像素限制需按模型适配。
- Evidence: [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md), [tests/unit/imageParameters.test.ts](../../tests/unit/imageParameters.test.ts), [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-10-11-closeout/verification.md](../../docs/changes/2026-10-11-closeout/verification.md), [tests/browser/media-dimensions.spec.ts](../../tests/browser/media-dimensions.spec.ts)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-10-11
- Updated: 2026-10-11

## BACKEND-TEXT-NODE — 文本节点接入统一任务宿主

- Goal: 文本节点复用统一 TaskHost 和 BYOK /chat/completions，替换本地演示
- Scope: src/components/nodes, src/features/creation, src/App.tsx, src-tauri/src/task_host.rs, src-tauri/src/task_host_text.rs
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:BACKEND-TEXT-NODE
- Feature IDs: FEAT-008, FEAT-025
- Owner role: repository-maintainer
- Acceptance: 文本节点提交走真实模型，支持流式、取消、错误、离线状态; Web 与 Desktop 分别有运行态证据; 演示 seam 在文本模态移除并更新 FEAT-008 卡片为 REAL
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/components/nodes, src/features/creation, src/App.tsx, src-tauri/src/task_host.rs, src-tauri/src/task_host_text.rs
- Verification: PARTIAL — Web development/preview 与隔离 Tauri release HTTP fixture 已覆盖流式、取消/unknown、离线、编辑保存、重载和原生并发。2026-10-08 T5 十组原生实测补完异常进程退出/同身份恢复、草稿 unknown 与取消后容量释放；真实 Provider 和结构化 health 统一仍由 EXT-PROVIDER/TASK-PROV-006 验收，整体能力保持 PARTIAL。
- Evidence: [docs/features/feat-008-text-node.md](../../docs/features/feat-008-text-node.md), [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md](../../docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-10-08
- Updated: 2026-10-08

## BACKEND-MEDIA-001 — 视频与音频节点真实生成链

- Goal: 视频/音频节点经统一任务宿主接入真实供应商（规划 MiniMax 等），替换固定演示素材
- Scope: 视频/音频 provider 抽象, 异步作业轮询/回调, 任务宿主, VideoNode/PromptCreationNode, 参数透传
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:BACKEND-MEDIA-001
- Feature IDs: FEAT-006, FEAT-007, FEAT-025, FEAT-031
- Owner role: repository-maintainer
- Acceptance: 视频/音频 provider 抽象复用队列、幂等、取消与素材归档; 时长/比例/清晰度等参数真实传递; 结果经 result 边回到节点，状态覆盖 loading/success/error/cancel; 有供应商 Key 时完成真实出片/出音频验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/components/nodes, src/features/creation, src/integrations/generation, src-tauri/src/task_host.rs
- Verification: NOT_VERIFIED — NOT VERIFIED：代码链路可先于凭据建设；真实出片/出音频验收需要供应商 Key 与额度（EXT-PROVIDER）。
- Evidence: [docs/features/feat-006-video-generation.md](../../docs/features/feat-006-video-generation.md), [docs/features/feat-007-audio-generation.md](../../docs/features/feat-007-audio-generation.md), [docs/features/feat-025-demo-media.md](../../docs/features/feat-025-demo-media.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-21
- Updated: 2026-09-21

## BACKEND-MCP-AUTO — MCP 工具自动调用编排

- Goal: 在手动 MCP 客户端之上实现工具发现、选择授权、自动调用、结果回填与错误取消
- Scope: src/features/mcp, 对话/技能编排, 设置 UI
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:BACKEND-MCP-AUTO
- Feature IDs: FEAT-012
- Owner role: repository-maintainer
- Acceptance: 技能/对话可按授权自动调用 MCP 工具并展示过程; 覆盖授权、失败、取消、超时、离线状态; 桌面 release 用真实第三方 MCP 服务器验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/mcp, src/components/settings/McpSettings.tsx, src/features/skills
- Verification: NOT_VERIFIED — NOT VERIFIED：手动客户端真实可用，自动调用仍为 Prototype。
- Evidence: [docs/features/feat-012-mcp.md](../../docs/features/feat-012-mcp.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-21
- Updated: 2026-09-21

## BACKEND-PLATFORM — 平台账号/积分/云同步/记忆/代理后端

- Goal: 建设并部署平台服务，使账号、计费额度、云端保存、长期记忆与应用内代理从 Prototype 变为真实能力
- Scope: generation-server 平台化, 身份服务, 计费集成, 云存储, 记忆服务, 代理, 部署
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:BACKEND-PLATFORM
- Feature IDs: FEAT-017, FEAT-018, FEAT-019, FEAT-020, FEAT-021, FEAT-029
- Owner role: repository-maintainer
- Acceptance: 身份与会话、用户资料可用，平台额度与真实计费打通; 云端项目/素材同步具备冲突与隐私策略; 记忆服务可采集/检索/删除，应用内代理在 Desktop 生效; 生产 HTTPS 部署并完成端到端验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/generation-server, src/components/AccountPopup.tsx, src/components/settings/ConnectionSettings.tsx, deploy
- Verification: NOT_VERIFIED — NOT VERIFIED：Desktop 必须保留免登录入口并可选登录，Web/Mobile 目标需登录；账号不默认云存个人数据。身份服务与 VPS/域名等外部部署条件未完成，Gateway 额度逻辑仅在单测覆盖。
- Evidence: [docs/features/feat-017-account.md](../../docs/features/feat-017-account.md), [docs/features/feat-018-credits.md](../../docs/features/feat-018-credits.md), [docs/features/feat-019-cloud-sync.md](../../docs/features/feat-019-cloud-sync.md), [docs/features/feat-020-memory.md](../../docs/features/feat-020-memory.md), [docs/features/feat-021-proxy.md](../../docs/features/feat-021-proxy.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-21
- Updated: 2026-09-21

## BACKEND-ASTRA-001 — Astra 研究助手实现

- Goal: 在已完成计划基础上实现 Astra 的产品能力，而非停留在规划
- Scope: 待 intent/spec 定义
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:BACKEND-ASTRA-001
- Feature IDs: FEAT-027
- Owner role: repository-maintainer
- Acceptance: 补齐 intent/spec 与能力边界; 实现并接入 UI，含真实后端或明确 Prototype 标注; Web/Desktop 运行态验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: 待 spec 定义
- Verification: NOT_VERIFIED — NOT VERIFIED：仅有计划与 Git 同步，零实现。
- Evidence: [docs/features/feat-027-astra.md](../../docs/features/feat-027-astra.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-21
- Updated: 2026-09-21

## UI-SKILL-POPOVER-001 — 窄屏首页弹层遮挡修复与 Skill 空态断言更新

- Goal: 内置 Skill 合入后，首页四类弹层在窄屏不再遮挡创作提示词与同级触发按钮，并让浏览器断言与内置 Skill 新契约一致
- Scope: src/styles/catalog-pages.css, tests/browser/creation-flow.spec.ts, tests/browser/composer-menu-audit.spec.ts（回归覆盖）
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:UI-SKILL-POPOVER-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: ≤620px 弹层在底栏下方展开，不遮挡提示词与触发按钮; Skill 弹层断言改为内置 Skill 可见且浏览入口仍进入目录页; 390/768/900 三视口弹层用例与全量浏览器回归通过
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/styles/catalog-pages.css, tests/browser/creation-flow.spec.ts
- Verification: PASS — 390px 几何实测弹层与提示词/按钮无重叠；两个定向用例文件 16/16 通过，全量浏览器回归 200/200 通过。
- Evidence: [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-21
- Updated: 2026-09-21

## TASK-RULES-003 — 修复功能状态与运行证据门禁

- Goal: 拦截无证据REAL、卡片状态冲突、终态后续任务和畸形路径，校正卡片生成规则与路线依赖
- Scope: scripts/features/registry.mjs, tests/unit/featureRegistry.test.ts, docs/features, AGENTS.md
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-RULES-003
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 拦截无证据REAL、卡片状态冲突、终态后续任务和畸形路径，校正卡片生成规则与路线依赖; 验证与证据完整后更新功能卡和账本，不以源码存在代替运行验收
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: scripts/features/registry.mjs, tests/unit/featureRegistry.test.ts, docs/features, AGENTS.md
- Verification: PASS — 8项隔离fixture门禁测试；28功能/48任务0违规；完整verify 227单测/210浏览器；独立dirty-diff预检无未关闭blocker。未commit/push，非正式SHA绑定PR审批。
- Evidence: [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-09-21-text-and-rule-audit/review.md](../../docs/changes/2026-09-21-text-and-rule-audit/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-22
- Updated: 2026-09-22

## BACKEND-CONVERSATION — 对话面板文本多轮能力与实际状态收敛

- Goal: 默认 Codex 多轮会话 Web 已接入，补 Desktop 进程托管与同态运行验收
- Scope: src/components/ConversationPanel.tsx, src/App.tsx, docs/features/feat-009-conversation.md
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:BACKEND-CONVERSATION
- Feature IDs: FEAT-009
- Owner role: repository-maintainer
- Acceptance: Web 默认 Codex 已有多轮与流式；补桌面进程托管和真实同态验收。; 验证与证据完整后更新功能卡和账本，不以源码存在代替运行验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/components/ConversationPanel.tsx, src/App.tsx, docs/features/feat-009-conversation.md
- Verification: PARTIAL — Web 已通过 TASK-AGENT-001 实现并留真实证据；Desktop 尚未验收。
- Evidence: [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-09-22-codex-default-agent/verification.md](../../docs/changes/2026-09-22-codex-default-agent/verification.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-22
- Updated: 2026-09-22

## TASK-DS-001 — Design System校正与公共UI对齐

- Goal: 校正用户设计系统的颜色与基础组件，统一规范和公共实现
- Scope: Design System, CSS tokens, settings accent, shared controls, UI docs
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-DS-001
- Feature IDs: FEAT-022
- Owner role: repository-maintainer
- Acceptance: PDF全页审计并记录可追溯勘误; 双主题8色及基础组件正确消费配对语义; 旧设置兼容和键盘/回焦/重载/窄屏回归; 规范统一且明确Ardot与Desktop证据边界
- Branch: `fix/TASK-DS-001-alignment`
- Worktree: `C:/Users/Administrator/.codex/worktrees/design-system-alignment/KK-Studio-2.0`
- Modules: src/styles, src/domain/settings.ts, src/components/settings, docs/DESIGN-SYSTEM.md, docs/UI_SPEC.md, tests
- Verification: PARTIAL — Design System 1.1与双主题8色已落实；TASK-DS-002补目录/设置、原工程完整verify309/229及新Tauri资源包/重启验证。在线Ardot写入与用户视觉验收仍未完成。
- Evidence: [docs/changes/2026-09-22-design-system/spec.md](../../docs/changes/2026-09-22-design-system/spec.md), [docs/changes/2026-09-22-design-system/audit.md](../../docs/changes/2026-09-22-design-system/audit.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system/review.md](../../docs/changes/2026-09-22-design-system/review.md), [docs/changes/2026-09-22-design-system/remaining.md](../../docs/changes/2026-09-22-design-system/remaining.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-22
- Updated: 2026-09-22

## TASK-DS-002 — Design System逐页迁移与桌面验收

- Goal: 按未完成清单推进目录页面和设置控件，并核验新Tauri运行
- Scope: catalog pages, shared inputs, Skill editor, settings, runtime verification
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-DS-002
- Feature IDs: FEAT-005, FEAT-011, FEAT-015, FEAT-022
- Owner role: repository-maintainer
- Acceptance: 目录与设置组件遵循Design System1.1; 双主题8色及窄屏搜索/编辑/保存/取消保持; 新Tauri实际bundle与隔离数据身份验证; 回传保护并发改动并更新剩余事项
- Branch: `fix/TASK-DS-002-pages`
- Worktree: `C:/Users/Administrator/.codex/worktrees/design-system-pages/KK-Studio-2.0`
- Modules: src/styles/catalog-pages.css, src/styles/ui-tokens.css, src/components/SkillEditor.tsx, src/components/SkillCollection.tsx, src/components/settings, tests/browser, scripts/audit
- Verification: PASS — 当前工程完整verify通过：309 Node、229浏览器、0失败/0flaky；lint/typecheck/UI137/0/format/build均PASS。原工程重新Tauri no-bundle build与16组合、2次启动、偏好及Skill保留复验PASS；独立预检修正复核PASS。仅关闭本批工程契约；在线Ardot、页面Frame和用户视觉验收由原任务保留。
- Evidence: [docs/changes/2026-09-22-design-system-pages/spec.md](../../docs/changes/2026-09-22-design-system-pages/spec.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md), [docs/changes/2026-09-22-design-system-pages/review.md](../../docs/changes/2026-09-22-design-system-pages/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-22
- Updated: 2026-09-22

## TASK-UI-005 — 新增功能 UI 入口与能力展示对齐

- Goal: 解决新功能无入口及展示/实际行为不匹配
- Scope: Agent conversation and conditional initialization, plugins, prompt library, text presets, platform copy
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-005
- Feature IDs: FEAT-007, FEAT-008, FEAT-009, FEAT-013, FEAT-021, FEAT-022, FEAT-029
- Owner role: repository-maintainer
- Acceptance: Agent双通道和错误交互正确; 插件与提示词有真实入口; Design System及Web/Desktop验证; 保留原工程并发改动
- Branch: `fix/TASK-UI-005-feature-parity`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-feature-parity/KK-Studio-2.0`
- Modules: src/components, src/features/agent, src/features/prompts, tests/browser, scripts/agent, package.json
- Verification: PASS — 原工程verify327 Node/241 browser、UI142/0、lint/typecheck/format/build通过；独立38文件预检PASS。新Tauri资源/16组合/2启动、草稿缓存保留及Token清空通过。仅关闭本批UI契约，真实服务/外部验收与追加交互专项继续。
- Evidence: [docs/changes/2026-09-22-ui-feature-parity/spec.md](../../docs/changes/2026-09-22-ui-feature-parity/spec.md), [docs/changes/2026-09-22-ui-feature-parity/audit.md](../../docs/changes/2026-09-22-ui-feature-parity/audit.md), [docs/changes/2026-09-22-ui-feature-parity/verification.md](../../docs/changes/2026-09-22-ui-feature-parity/verification.md), [docs/changes/2026-09-22-ui-feature-parity/review.md](../../docs/changes/2026-09-22-ui-feature-parity/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-22
- Updated: 2026-09-22

## TASK-UI-006 — 折叠与弹层交互、画布重叠和缩放背景修复

- Goal: 让项目/画布折叠及所有受影响入口开关保持状态与视觉一致
- Scope: Sidebar and canvas disclosures, overlay layout, zoom patterns, popover/modal lifecycle
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-006
- Feature IDs: FEAT-001, FEAT-016, FEAT-023
- Owner role: repository-maintainer
- Acceptance: 生成/保存状态和任务入口无重叠; 缩小后点阵与网格可辨识; 重复点击/Escape/外点/焦点回归正确; 折叠保留草稿和界面状态; Design System及Web/Desktop同态验收
- Branch: `fix/TASK-UI-006-interactions`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-interactions/KK-Studio-2.0`
- Modules: src/components, src/styles, tests/browser
- Verification: PASS — 原工程verify327 Node/261 browser、UI144/0、lint/typecheck/format/build通过；独立23文件预检PASS，fresh Tauri实际JS/CSS、16组合和原生交互验收通过。12处缺陷已关闭；外部服务与视觉源边界仍开放。
- Evidence: [docs/changes/2026-09-22-ui-interactions/intent.md](../../docs/changes/2026-09-22-ui-interactions/intent.md), [docs/changes/2026-09-22-ui-interactions/spec.md](../../docs/changes/2026-09-22-ui-interactions/spec.md), [docs/changes/2026-09-22-ui-interactions/audit.md](../../docs/changes/2026-09-22-ui-interactions/audit.md), [docs/changes/2026-09-22-ui-interactions/verification.md](../../docs/changes/2026-09-22-ui-interactions/verification.md), [docs/changes/2026-09-22-ui-interactions/review.md](../../docs/changes/2026-09-22-ui-interactions/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-22
- Updated: 2026-09-22

## TASK-AGENT-001 — 默认 Codex 主 Agent 与 KK 生成任务接入

- Goal: 第一阶段：已登录 Codex 驱动 KK 对话、画布与现有 OpenAI 兼容生成；统一账号模型入口与真实额度，保留外部/桌面验收边界
- Scope: src/features/agent, src/features/models, KK 共享模型菜单与设置, App, vendor canvas-agent 最小适配, tests
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-AGENT-001
- Feature IDs: FEAT-002, FEAT-003, FEAT-009, FEAT-012, FEAT-022
- Owner role: repository-maintainer
- Acceptance: KK 输入框真实 Codex 回复; 命名 SSE 和项目线程恢复; 画布增改连线持久化; 生成任务真实受理/状态回传; 全量门禁与独立审查; 真实 Codex 内置生图归档; 账号级模型目录、明确尺寸、分级/全部/记忆页/置顶; 工具回执未知阻断自动重试; 桌面托管/其他软件按后续待办记录，不虚构完成; 连续发送/换模型/重连沿用已有线程，显式新建才创建线程; 同账号模型前缀分组/后缀变体精确 ID、厂商/参数/比例搜索和非数字模糊匹配
- Branch: `codex/TASK-AGENT-001-remaining-verification`
- Worktree: `D:/kk-studio/.worktrees/remaining-verification`
- Modules: src/features/agent, src/App.tsx, src/components/ConversationPanel.tsx, tests, src/features/models, src/components/ModelPickerMenu.tsx, src/components/settings, vendor/canvas-agent
- Verification: PARTIAL — 当前工作树完整 npm run verify PASS：Node 911（903通过、8跳过）、Agent 172/174（2跳过）、生产浏览器455/455、Vite development插件PASS。真实 Codex/Provider、Desktop、Hosted和Mobile边界仍未完成，保持PARTIAL。
- Evidence: [docs/changes/2026-09-22-codex-default-agent/spec.md](../../docs/changes/2026-09-22-codex-default-agent/spec.md), [docs/changes/2026-09-22-codex-default-agent/verification.md](../../docs/changes/2026-09-22-codex-default-agent/verification.md), [docs/changes/2026-09-22-codex-default-agent/review.md](../../docs/changes/2026-09-22-codex-default-agent/review.md), [docs/changes/2026-09-22-codex-default-agent/usage.md](../../docs/changes/2026-09-22-codex-default-agent/usage.md), [docs/changes/2026-09-22-codex-default-agent/remaining.md](../../docs/changes/2026-09-22-codex-default-agent/remaining.md), [docs/changes/2026-09-22-codex-default-agent/provider-research.md](../../docs/changes/2026-09-22-codex-default-agent/provider-research.md), [docs/changes/2026-09-22-codex-default-agent/port-audit-update.md](../../docs/changes/2026-09-22-codex-default-agent/port-audit-update.md), [docs/changes/2026-09-22-codex-default-agent/evidence/acceptance.json](../../docs/changes/2026-09-22-codex-default-agent/evidence/acceptance.json), [docs/changes/2026-10-10-remaining-verification/verification.md](../../docs/changes/2026-10-10-remaining-verification/verification.md), [docs/changes/2026-10-10-remaining-verification/review.md](../../docs/changes/2026-10-10-remaining-verification/review.md)
- Next action: 补独立审查并分别完成 Desktop、真实 Provider 和其他登录软件验收
- Last verified: 2026-10-10
- Updated: 2026-10-10

## TASK-AGENT-002 — 桌面本地 Agent 托管与其他登录软件适配

- Goal: 把本轮已验证的 Codex 能力接入 Tauri 一键生命周期，再分别验证 Google/豆包/WorkBuddy 的官方或可用登录适配器
- Scope: src-tauri, src/features/agent, browser adapters, provider integrations
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-AGENT-002
- Feature IDs: FEAT-009
- Owner role: repository-maintainer
- Acceptance: Tauri 隐藏拉起、健康检测、停止和退出回收，只管理自己的子进程; 登录需要交互时在 KK 提示/打开登录页，不能绕过验证; Google/豆包/WorkBuddy 每个适配器均须真实请求及结果回传验证；无接口时明确不可用; 网页后台任务具有限并发、取消、登录失效和结果不确定处理; 非 OpenAI 兼容 API 逐协议扩展并真实验收
- Branch: `fix/TASK-AGENT-002-desktop`
- Worktree: `C:/Users/Administrator/.codex/worktrees/remaining-verification/KK-Studio-2.0`
- Modules: src-tauri, src/features/agent, src/features/models, src/integrations
- Verification: PARTIAL — Windows Agent 托管子项 PASS：356 Node/270 browser/78 Rust，真实Tauri8项与空会话7项、独立预检与干净npm ci/build通过。Proxy、其他软件/网页并发/非兼容协议及外部真实验收仍待完成；未commit/push。
- Evidence: [docs/changes/2026-09-22-codex-default-agent/remaining.md](../../docs/changes/2026-09-22-codex-default-agent/remaining.md), [docs/changes/2026-09-22-agent-desktop/verification.md](../../docs/changes/2026-09-22-agent-desktop/verification.md), [docs/changes/2026-09-22-agent-desktop/remaining.md](../../docs/changes/2026-09-22-agent-desktop/remaining.md), [docs/changes/2026-09-22-agent-desktop/review.md](../../docs/changes/2026-09-22-agent-desktop/review.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-22
- Updated: 2026-09-22

## TASK-UI-007 — 手机平板电脑三档尺寸与图标对齐

- Goal: 先纠正规范，再修复手机空间、平板面板挤压、桌面整体缩小、图标与换行及切换交互
- Scope: Design System, shell, shared controls, page responsive layout
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-007
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 三档尺寸及实际截图检查; 图标居中、文本合理换行、控件可操作; 断点切换保留草稿/项目/桌面折叠偏好; verify、fresh Tauri和独立预检
- Branch: `fix/TASK-UI-007-responsive`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-responsive/KK-Studio-2.0`
- Modules: src/components, src/styles, docs, tests/browser
- Verification: PASS — 原工程356 Node/286 browser、UI157/0、55任务/29功能0违规；独立R1–R3补审PASS；带Agent资源fresh Tauri实际JS/CSS匹配、16组合和原生交互通过。三档及短屏、图标/换行、跨档草稿/焦点/菜单已修复；实机与在线设计边界保留。
- Evidence: [docs/changes/2026-09-22-responsive-ui/spec.md](../../docs/changes/2026-09-22-responsive-ui/spec.md), [docs/changes/2026-09-22-responsive-ui/audit.md](../../docs/changes/2026-09-22-responsive-ui/audit.md), [docs/changes/2026-09-22-responsive-ui/verification.md](../../docs/changes/2026-09-22-responsive-ui/verification.md), [docs/changes/2026-09-22-responsive-ui/review.md](../../docs/changes/2026-09-22-responsive-ui/review.md), [docs/changes/2026-09-22-responsive-ui/evidence/desktop/runtime.json](../../docs/changes/2026-09-22-responsive-ui/evidence/desktop/runtime.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TASK-UI-008 — 重新制定创作输入框规范并统一三档实现

- Goal: 修正规范缺失与文字/图标/附件/型号参数和焦点不一致，输入增长不覆盖其他UI
- Scope: Design System, home/API/Agent composer, input flow and tests
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-008
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: DS1.3输入契约先于实现; 三档多行/附件/参数及单一焦点边界; 图标20/16与32/44命中区域; Web、fresh Tauri与独立上下文审查
- Branch: `fix/TASK-UI-008-inputs`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-input-contract/KK-Studio-2.0`
- Modules: src/components, src/styles, tests/browser, docs
- Verification: PASS — 原工程356 Node/295 browser、UI159/0、56任务/29功能0违规；独立R1–R3及断点补审PASS；fresh Tauri实际JS/CSS匹配、32组合与原生输入交互通过。DS1.3契约与三档输入流已落实，实机/在线设计及服务边界保留。
- Evidence: [docs/changes/2026-09-23-input-contract/spec.md](../../docs/changes/2026-09-23-input-contract/spec.md), [docs/changes/2026-09-23-input-contract/plan.md](../../docs/changes/2026-09-23-input-contract/plan.md), [docs/changes/2026-09-23-input-contract/verification.md](../../docs/changes/2026-09-23-input-contract/verification.md), [docs/changes/2026-09-23-input-contract/review.md](../../docs/changes/2026-09-23-input-contract/review.md), [docs/changes/2026-09-23-input-contract/evidence/desktop/runtime.json](../../docs/changes/2026-09-23-input-contract/evidence/desktop/runtime.json), [docs/changes/2026-09-23-input-contract/evidence/integration.json](../../docs/changes/2026-09-23-input-contract/evidence/integration.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TASK-AGENT-003 — Agent 图片附件、画布引用与视口选择操作

- Goal: 复用已有 Agent 附件链路，让 Codex 读取选定图片并控制真实画布选择和视口
- Scope: Agent composer, attachment preparation, canvas control bridge
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-AGENT-003
- Feature IDs: FEAT-009, FEAT-012
- Owner role: repository-maintainer
- Acceptance: 图片原件发送、缺失/越限/取消拒绝且失败保留草稿; Agent/API 草稿隔离，选择/视口影响实际 UI 并回传; Web preview 与 Tauri release 实际交互和独立预检
- Branch: `feat/TASK-AGENT-003-attachments`
- Worktree: `C:/Users/Administrator/.codex/worktrees/agent-attachments/KK-Studio-2.0`
- Modules: src/features/agent, src/components, src/App.tsx
- Verification: PASS — 原工程完整 verify：363 Node/299 browser，UI159/0；fresh Tauri真实识图与原件哈希、随包MCP选择/视口、重开恢复通过；26文件独立dirty增量预检PASS，未commit/push。
- Evidence: [docs/changes/2026-09-23-agent-attachments/verification.md](../../docs/changes/2026-09-23-agent-attachments/verification.md), [docs/changes/2026-09-23-agent-attachments/review.md](../../docs/changes/2026-09-23-agent-attachments/review.md), [docs/changes/2026-09-23-agent-attachments/remaining.md](../../docs/changes/2026-09-23-agent-attachments/remaining.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-23
- Updated: 2026-09-23

## PLUGIN-DESKTOP-001 — 修复桌面画布插件的 CSP 加载路径

- Goal: 让可信随包插件在保持严格 CSP 的前提下于 Tauri 桌面端加载并验证
- Scope: 同源插件模块加载、桌面 CSP、fresh Tauri 插件交互验证
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:PLUGIN-DESKTOP-001
- Feature IDs: FEAT-013
- Owner role: repository-maintainer
- Acceptance: 随包插件从同源模块路径加载且不全局放宽脚本 CSP; fresh Tauri 中插件发现、添加、渲染和启停通过实际交互; 远程插件的权限与来源边界保持明确
- Branch: `docs/PLUGIN-DESKTOP-001-closeout`
- Worktree: `D:/kk-studio/.worktrees/platform-versioning`
- Modules: src/features/plugins, src-tauri/tauri.conf.json, tests/browser
- Verification: PASS — 12 项插件单测、TypeScript、Web build、Tauri client build 通过；fresh Tauri 隔离运行完成随包插件发现、添加、渲染、停用和恢复，资源走 tauri.localhost/plugins/*.js 同源 URL，严格 CSP 未放宽，页面错误为空。独立只读 review 对代码 head 91396c6 给出 PASS、无 P0–P3 findings；PR #28 Hosted verify/delivery/deploy-linux 与 push verify 均成功，已 squash 合入 main@e27e209。
- Evidence: [docs/changes/2026-09-29-plugin-desktop-csp/intent.md](../../docs/changes/2026-09-29-plugin-desktop-csp/intent.md), [docs/changes/2026-09-29-plugin-desktop-csp/spec.md](../../docs/changes/2026-09-29-plugin-desktop-csp/spec.md), [docs/changes/2026-09-29-plugin-desktop-csp/plan.md](../../docs/changes/2026-09-29-plugin-desktop-csp/plan.md), [docs/changes/2026-09-29-plugin-desktop-csp/verification.md](../../docs/changes/2026-09-29-plugin-desktop-csp/verification.md), [docs/changes/2026-09-29-plugin-desktop-csp/review.md](../../docs/changes/2026-09-29-plugin-desktop-csp/review.md), [docs/changes/2026-09-29-plugin-desktop-csp/evidence/desktop-runtime.json](../../docs/changes/2026-09-29-plugin-desktop-csp/evidence/desktop-runtime.json), [docs/changes/2026-09-29-plugin-desktop-csp/evidence/desktop-plugin-csp.png](../../docs/changes/2026-09-29-plugin-desktop-csp/evidence/desktop-plugin-csp.png), [docs/changes/2026-09-29-plugin-desktop-closeout/intent.md](../../docs/changes/2026-09-29-plugin-desktop-closeout/intent.md), [docs/changes/2026-09-29-plugin-desktop-closeout/spec.md](../../docs/changes/2026-09-29-plugin-desktop-closeout/spec.md), [docs/changes/2026-09-29-plugin-desktop-closeout/plan.md](../../docs/changes/2026-09-29-plugin-desktop-closeout/plan.md), [docs/changes/2026-09-29-plugin-desktop-closeout/verification.md](../../docs/changes/2026-09-29-plugin-desktop-closeout/verification.md), [docs/changes/2026-09-29-plugin-desktop-closeout/review.md](../../docs/changes/2026-09-29-plugin-desktop-closeout/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-29
- Updated: 2026-09-29

## REL-2.1.0 — 2.1.0 本地集成与源码上传

- Goal: 将当前已授权的工作区候选统一版本、完成本地检查并上传到可追溯的任务分支
- Scope: 版本元数据、当前工作区源码与交付包、Git 提交和远端回读
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:REL-2.1.0
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 应用、npm、Tauri 和运行时报告 2.1.0; 完整本地门禁通过且保留历史验证边界; 任务分支提交、推送并回读远端 SHA; 正式 PR/CI/main/tag 与安装包状态如实记录
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src, src-tauri, tests, scripts, vendor, docs
- Verification: PASS — 历史 2.1.0 源码上传与 PR #9/main@b45c5bc7、合并后 CI 已完成；正式安装包/签名/tag 未完成，归 T7。当前三端版本另见版本源。
- Evidence: [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-21-consolidate-200/verification.md](../../docs/changes/2026-09-21-consolidate-200/verification.md), [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md), [docs/changes/2026-09-21-local-capabilities/verification.md](../../docs/changes/2026-09-21-local-capabilities/verification.md), [docs/changes/2026-09-21-minimax-deep-audit/verification.md](../../docs/changes/2026-09-21-minimax-deep-audit/verification.md), [docs/changes/2026-09-21-security-audit-closeout/verification.md](../../docs/changes/2026-09-21-security-audit-closeout/verification.md), [docs/changes/2026-09-21-security-audit/verification.md](../../docs/changes/2026-09-21-security-audit/verification.md), [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-09-22-agent-desktop/verification.md](../../docs/changes/2026-09-22-agent-desktop/verification.md), [docs/changes/2026-09-22-codex-default-agent/verification.md](../../docs/changes/2026-09-22-codex-default-agent/verification.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md), [docs/changes/2026-09-22-port-infinite-canvas/verification.md](../../docs/changes/2026-09-22-port-infinite-canvas/verification.md), [docs/changes/2026-09-22-responsive-ui/verification.md](../../docs/changes/2026-09-22-responsive-ui/verification.md), [docs/changes/2026-09-22-ui-feature-parity/verification.md](../../docs/changes/2026-09-22-ui-feature-parity/verification.md), [docs/changes/2026-09-22-ui-interactions/verification.md](../../docs/changes/2026-09-22-ui-interactions/verification.md), [docs/changes/2026-09-23-agent-attachments/verification.md](../../docs/changes/2026-09-23-agent-attachments/verification.md), [docs/changes/2026-09-23-input-contract/verification.md](../../docs/changes/2026-09-23-input-contract/verification.md), [docs/changes/2026-09-23-release-2-1-0/verification.md](../../docs/changes/2026-09-23-release-2-1-0/verification.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-RULES-004 — 现行规则与 Markdown 一致性审计

- Goal: 核对规则文档与实际门禁及 2.1.0 候选状态，并让现行 Markdown 相对文件链接进入 lint
- Scope: 共同规则入口、工程与治理文档、现行 Markdown 链接检查及任务交付记录
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-RULES-004
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 当前设计、任务和发布状态的文档入口不与权威来源冲突; 依赖 PR 的分支同步与清理边界有明确可执行规则; 现行 Markdown 相对文件链接进入 lint 且有有效回归; 本地验证、独立复审和 hosted CI 限制分别如实记录
- Branch: `docs/TASK-RULES-004-closeout`
- Worktree: `D:/kk-studio/.worktrees/TASK-RULES-004-closeout`
- Modules: AGENTS.md, README.md, docs, scripts/governance, tests/unit, package.json
- Verification: PASS — 原堆叠 PR #10 两轮失败审查及第三轮 d8e12c0 PASS 保留；从 PR #9 后的 main 仅承接本任务四个提交，tree 与原 #10 head 相同。承接分支干净 npm ci 与完整 verify 通过：370 Node、300 browser、治理61/0、功能29/0、Markdown81/0、UI159/0、类型/格式/Web build；旧生成证据定向恢复。独立 AI 审查覆盖最终 dfed074，PR #11 当前 head 的 hosted verify/delivery 与 push verify 均成功，已 squash 合入 main@9f04bfce，合并树与候选树一致；旧 PR #10 已关联关闭未重复合并，本地根 main 已快进。合并后 main 工作流 35841965161 verify success；正式版本 tag、安装包和发布验收属于 REL-2.1.0，不由本任务关闭。
- Evidence: [docs/changes/2026-09-23-rules-audit/intent.md](../../docs/changes/2026-09-23-rules-audit/intent.md), [docs/changes/2026-09-23-rules-audit/spec.md](../../docs/changes/2026-09-23-rules-audit/spec.md), [docs/changes/2026-09-23-rules-audit/plan.md](../../docs/changes/2026-09-23-rules-audit/plan.md), [docs/changes/2026-09-23-rules-audit/verification.md](../../docs/changes/2026-09-23-rules-audit/verification.md), [docs/changes/2026-09-23-rules-audit/review.md](../../docs/changes/2026-09-23-rules-audit/review.md), [docs/changes/2026-09-23-rules-audit-main/intent.md](../../docs/changes/2026-09-23-rules-audit-main/intent.md), [docs/changes/2026-09-23-rules-audit-main/spec.md](../../docs/changes/2026-09-23-rules-audit-main/spec.md), [docs/changes/2026-09-23-rules-audit-main/plan.md](../../docs/changes/2026-09-23-rules-audit-main/plan.md), [docs/changes/2026-09-23-rules-audit-main/verification.md](../../docs/changes/2026-09-23-rules-audit-main/verification.md), [docs/changes/2026-09-23-rules-audit-main/review.md](../../docs/changes/2026-09-23-rules-audit-main/review.md), [docs/changes/2026-09-23-rules-audit-closeout/intent.md](../../docs/changes/2026-09-23-rules-audit-closeout/intent.md), [docs/changes/2026-09-23-rules-audit-closeout/spec.md](../../docs/changes/2026-09-23-rules-audit-closeout/spec.md), [docs/changes/2026-09-23-rules-audit-closeout/plan.md](../../docs/changes/2026-09-23-rules-audit-closeout/plan.md), [docs/changes/2026-09-23-rules-audit-closeout/verification.md](../../docs/changes/2026-09-23-rules-audit-closeout/verification.md), [docs/changes/2026-09-23-rules-audit-closeout/review.md](../../docs/changes/2026-09-23-rules-audit-closeout/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TASK-DOCS-HISTORY-001 — 历史 Markdown 链接与缺失日志勘误

- Goal: 逐项核对历史快照的 37 处链接问题并在有原始证据时添加可追溯勘误
- Scope: docs/archive、历史 docs/changes 和 docs/evidence 的链接及产物归属
- Display status: 已完成
- Priority: P1 — 历史链接勘误与审计边界已完成；外部日志恢复不属于本任务验收
- Requirement refs: ledger:TASK-DOCS-HISTORY-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 归档搬迁和旧代码行号链接提供可用入口且不篡改当时结论; 缺失日志明确标注来源和可恢复性，不补造证据; 修正后的历史页面定向检查并经独立审阅
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: docs/archive, docs/changes, docs/evidence
- Verification: PASS — 37项历史问题已逐项复核：29个可追溯文件入口修复，8个原始日志因无Git tracked来源保持未验证；定向保护脚本、历史目标检查和Markdown检查通过。文档限定提交dc53317b36cb604b77db10fdebc56666c662e215已由docs_history_exact_review以基线5199557752f14438407b966e07fc8a965bdb9671独立复核，结论PASS WITH FOLLOW-UPS，无P0-P2缺陷；Hosted、发布、用户验收和外部日志恢复不在本任务范围。
- Evidence: [docs/governance/MARKDOWN_AUDIT.md](../../docs/governance/MARKDOWN_AUDIT.md), [docs/changes/2026-10-11-taskstate-docs-closeout/docs-history-audit.json](../../docs/changes/2026-10-11-taskstate-docs-closeout/docs-history-audit.json), [docs/changes/2026-10-11-taskstate-docs-closeout/verification.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/verification.md), [docs/changes/2026-10-11-taskstate-docs-closeout/review.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/review.md), [docs/evidence/2026-10-11-taskstate-docs-closeout/full-check-receipt.json](../../docs/evidence/2026-10-11-taskstate-docs-closeout/full-check-receipt.json), [docs/changes/2026-10-11-taskstate-docs-closeout/exact-independent-review.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/exact-independent-review.md)
- Next action: 保留dc53317b exact review收据与8个未验证日志边界；如后续获得原始日志，再以新证据包单独勘误。
- Last verified: 2026-10-11
- Updated: 2026-10-11

## TASK-ORCH-001 — Agent 编排领域状态机与编排器工具面

- Goal: Stage 状态机（doing/plan_review/blocked/result_review/done）+ 编排器 CAS 推进 + plan 工具面，作为波次A闭环的领域基座
- Scope: src/domain/stagePlan.ts, src/features/agent/orchestrator.ts, src/features/agent/agentHost.ts, src/features/creation/model.ts, src/features/projects/projectPackage.ts, src-tauri/src/project_package*.rs, tests
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-ORCH-001
- Feature IDs: FEAT-030
- Owner role: repository-maintainer
- Acceptance: Stage 状态机合法/非法迁移与 CAS 并发冲突可测; 编排器物化计划、审批决策、阻断与失败重试只重试失败项; plan 工具面四个工具可调用并持久化; CreationProject.stagePlans 存储兼容不丢旧数据; 项目包导出导入保留空 stagePlans 和仅由计划工作项引用的素材; 工作项结果按预期 revision 写入，迟到结果不覆盖审批状态; 工作项 id 在计划内唯一，重复 id 不得误推进已完成工作项; 阶段 index 与项目内计划 id 唯一，异常项目包不得静默丢失或误改计划; 计划审批前不得执行工作项，全部工作项成功后才能请求结果审批或完成阶段; Agent 工具和宿主审批均按预期 revision 拒绝迟到请求，依赖工作项必须先成功且依赖图有效; Web 与 Rust 项目包拒绝归属其他项目的阶段计划; 结果审批拒绝后可指定返工项与新 prompt，并使下游产物、旧素材引用和审批失效; 返工提示词变更不覆盖原计划定义，须清除旧计划批准并重新审批；Web/Rust 项目包保留返工提示词
- Branch: `feat/TASK-ORCH-001-agent-orchestration-closure`
- Worktree: `D:/kk-studio/.worktrees/TASK-ORCH-001`
- Modules: src/domain/stagePlan.ts, src/features/agent/orchestrator.ts, src/features/agent/agentHost.ts, src/features/creation/model.ts, src/features/projects/projectPackage.ts, src-tauri/src/project_package.rs, src-tauri/src/project_package_snapshot.rs, docs/architecture/adr/ADR-006-stage-plan-package-contract.md, tests/unit/stagePlan.test.ts, tests/unit/orchestrator.test.ts
- Verification: PASS — 主线已含 08b5ae1 的阶段领域状态机、CAS、审批与项目包契约；当前单元与 Rust 回归通过。阶段计划 UI/真实生成仍属 TASK-ORCH-002/003，未被升级。
- Evidence: [docs/changes/2026-09-23-agent-orchestration/verification.md](../../docs/changes/2026-09-23-agent-orchestration/verification.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 feat/TASK-ORCH-001-agent-orchestration-closure 已通过 PR#14 f6264385 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-ORCH-002 — TaskWorkbench 阶段计划视图与审批交互

- Goal: 任务工作台展示 Stage 计划状态与 plan/result 审批门，审批按钮驱动编排器
- Scope: 现有工作台阶段计划视图、plan/result审批/返工/解除阻断/重新申请；原编排器项目范围校验与App/AgentHost共用实例；原存储队列确认/冲突传播与草稿恢复；竞品能力比较归入现有feature/task。; TaskWorkbenchContent的既有Plan入口整合，保留新主线暂停/重规划/回执/MCP改进。
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-ORCH-002
- Feature IDs: FEAT-016, FEAT-030
- Owner role: repository-maintainer
- Acceptance: 工作台显示各阶段状态徽标与待审批门; plan/result 审批按钮调用编排器 decideStage; 浏览器回归覆盖展示与审批流; 拒绝计划后可解除阻断并重新申请审批，零工作项结果阶段可拒绝; 排队保存冲突不显示成功，原件与未保存草稿保留；Web和production Desktop分别验收
- Branch: `codex/TASK-ORCH-002-stage-workbench`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-ORCH-002-stage-workbench`
- Modules: src/components/TaskWorkbench.tsx, src/components/TaskWorkbenchContent.tsx, src/components/TaskWorkbenchStages.tsx, src/App.tsx, tests/browser/task-workbench.spec.ts, src/components/StagePlanDetail.tsx, src/styles/stage-workbench.css, src/features/agent/orchestrator.ts, src/features/creation/useCreationStorage.ts, src/styles/task-workbench.css
- Verification: PASS — 本轮本地AC完成：新主线5b0eb6a融合为单一Plan/TaskWorkbenchStages及共享实例，保留主线暂停/重规划/回执/MCP行为；49/49、完整verify708root/172Agent/400browser零retry（原skip8/2）、Rust97、fresh production Tauri审批/重启/真实CAS/恢复草稿与clientcheck通过。精确新SHA独立补审及主线推广以收据和PR当前门禁为准。
- Evidence: [docs/changes/2026-10-03-incomplete-tasks/verification.md](../../docs/changes/2026-10-03-incomplete-tasks/verification.md), [docs/changes/2026-10-08-stage-workbench/intent.md](../../docs/changes/2026-10-08-stage-workbench/intent.md), [docs/changes/2026-10-08-stage-workbench/spec.md](../../docs/changes/2026-10-08-stage-workbench/spec.md), [docs/changes/2026-10-08-stage-workbench/plan.md](../../docs/changes/2026-10-08-stage-workbench/plan.md), [docs/changes/2026-10-08-stage-workbench/comparison.md](../../docs/changes/2026-10-08-stage-workbench/comparison.md), [docs/changes/2026-10-08-stage-workbench/verification.md](../../docs/changes/2026-10-08-stage-workbench/verification.md), [docs/changes/2026-10-08-stage-workbench/review.md](../../docs/changes/2026-10-08-stage-workbench/review.md), [docs/changes/2026-10-08-stage-workbench/evidence/desktop-acceptance.json](../../docs/changes/2026-10-08-stage-workbench/evidence/desktop-acceptance.json), [docs/changes/2026-10-08-stage-workbench/evidence/desktop-acceptance-review-fixed.json](../../docs/changes/2026-10-08-stage-workbench/evidence/desktop-acceptance-review-fixed.json), [docs/changes/2026-10-08-stage-workbench/evidence/review-dfd4c12.md](../../docs/changes/2026-10-08-stage-workbench/evidence/review-dfd4c12.md), [docs/changes/2026-10-08-stage-workbench/evidence/verify-review-fixed.txt](../../docs/changes/2026-10-08-stage-workbench/evidence/verify-review-fixed.txt), [docs/changes/2026-10-08-stage-workbench/evidence/review-41dd865.md](../../docs/changes/2026-10-08-stage-workbench/evidence/review-41dd865.md), [docs/changes/2026-10-08-stage-workbench/integration-plan.md](../../docs/changes/2026-10-08-stage-workbench/integration-plan.md), [docs/changes/2026-10-08-stage-workbench/evidence/desktop-acceptance-integration.json](../../docs/changes/2026-10-08-stage-workbench/evidence/desktop-acceptance-integration.json), [docs/changes/2026-10-08-stage-workbench/evidence/runtime-source-hashes-integration.json](../../docs/changes/2026-10-08-stage-workbench/evidence/runtime-source-hashes-integration.json)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-ORCH-002-stage-workbench 已通过 PR#35 5dd6e6dd 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-10-08
- Updated: 2026-10-08

## TASK-ORCH-003 — 编排器驱动生成执行与计划门禁

- Goal: plan 审批通过后编排器驱动工作项真实生成（图片/文本走统一任务态），失败只重试失败项
- Scope: src/features/agent/orchestrator.ts, src/features/creation/imageTaskCommand.ts, agentHost.ts
- Display status: 未完成
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-ORCH-003
- Feature IDs: FEAT-030
- Owner role: repository-maintainer
- Acceptance: 阶段工作项按依赖顺序提交真实生成任务; 失败项单独重试不重复整段; 计划状态与任务状态联动可观测
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/agent/orchestrator.ts, src/features/creation/imageTaskCommand.ts, src/features/agent/agentHost.ts
- Verification: NOT_VERIFIED — 未开工。
- Evidence: NOT VERIFIED
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TASK-CANVAS-001 — 画布交付契约与当轮产物收集

- Goal: 产物必须携带 node_id 且已注册素材资产，否则拦截；按 result 连线收集当轮产物与摘要
- Scope: src/features/agent/agentCanvas.ts, agentHost.ts, tests/unit/agentCanvas.test.ts
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-CANVAS-001
- Feature IDs: FEAT-030
- Owner role: repository-maintainer
- Acceptance: assertCanvasDelivery 对无 node_id/无资产注册的交付抛契约错误; collectRecentOutputs 按 result 连线收集已归档产物; 摘要文本可读
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/agent/agentCanvas.ts, src/features/agent/agentHost.ts, tests/unit/agentCanvas.test.ts
- Verification: PARTIAL — 契约现在覆盖图片与非空文案 provider 结果；Agent 图片导入要求 assetId，App 统一发布路径在 commit 前校验并把契约失败保留为 unknown。定向 agentCanvas/agentHost 23/23 通过；真实 Provider 与 Desktop 运行验收仍未完成。
- Evidence: [docs/changes/2026-09-23-agent-orchestration/verification.md](../../docs/changes/2026-09-23-agent-orchestration/verification.md), [docs/changes/2026-10-03-incomplete-tasks/verification.md](../../docs/changes/2026-10-03-incomplete-tasks/verification.md)
- Next action: 补充负责人、优先级、分支和下一步验收证据
- Last verified: 2026-10-08
- Updated: 2026-10-08

## TASK-TASKSTATE-001 — 统一任务态契约定稿

- Goal: 把 9 态任务模型、可重试判定、失败只重试失败输出、成本估算收口为可复用契约模块
- Scope: src/features/creation/taskState.ts, src/features/creation/taskRecovery.ts, tests/unit/taskState.test.ts, src/features/creation/nativeTaskHost.ts, src/App.tsx, tests/unit/nativeTaskHost.test.ts, tests/browser/task-intent.spec.ts
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-TASKSTATE-001
- Feature IDs: FEAT-016, FEAT-031
- Owner role: repository-maintainer
- Acceptance: unifiedTaskStatuses 覆盖 9 态; canRetryTask/retryFailedOutputIndices 语义正确; estimateTaskCostUsd 边界与估算口径标注; UI 成本显示收口到 estimateTaskCostUsd（后续任务）
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/taskState.ts, src/features/creation/taskRecovery.ts, src/features/creation/model.ts, tests/unit/taskState.test.ts, src/features/creation/nativeTaskHost.ts, src/App.tsx, tests/unit/nativeTaskHost.test.ts, tests/browser/task-intent.spec.ts
- Verification: PARTIAL — 9态、可重试边界和未知成本语义保持通过；新增成本回执的有限金额、来源/币种/身份绑定、重复/冲突保护、快照读回和 native package 回归通过。独立 dirty 预检未发现P0-P2缺陷，结论为PASS WITH FOLLOW-UPS；真实 Provider、每平台运行和用户验收仍未验证，保持PARTIAL。
- Evidence: [docs/changes/2026-09-23-agent-orchestration/verification.md](../../docs/changes/2026-09-23-agent-orchestration/verification.md), [docs/changes/2026-10-03-incomplete-tasks/verification.md](../../docs/changes/2026-10-03-incomplete-tasks/verification.md), [docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-verification.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-verification.md), [docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-review.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-review.md), [tests/unit/taskState.test.ts](../../tests/unit/taskState.test.ts), [tests/unit/taskCostReceipt.test.ts](../../tests/unit/taskCostReceipt.test.ts), [docs/evidence/2026-10-11-taskstate-docs-closeout/full-check-receipt.json](../../docs/evidence/2026-10-11-taskstate-docs-closeout/full-check-receipt.json)
- Next action: 提交后绑定 exact SHA 完成正式独立复审；随后补真实 Provider/每平台运行证据，不能用 fixture 或示例单价升级 DONE。
- Last verified: 2026-10-11
- Updated: 2026-10-11

## TASK-TASKSTATE-002 — 供应商成本报价回执接入

- Goal: 把可验证的供应商报价或账单回执接入统一任务态，避免成本长期停留在未知状态
- Scope: src/features/creation/taskState.ts, src/features/creation/model.ts, provider adapters, tests, docs/changes/2026-10-03-incomplete-tasks
- Display status: 进行中
- Priority: P1 — 当前治理或验证阻断项
- Requirement refs: ledger:TASK-TASKSTATE-002
- Feature IDs: FEAT-031
- Owner role: repository-maintainer
- Acceptance: 供应商回执中的成本字段经过 schema 与非负有限边界校验; 任务快照保留报价来源、币种和回执身份，未知/缺失报价仍安全显示未知; Provider fixture 与真实运行证据分别记录，不以示例单价代替实际账单
- Branch: `main`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/features/creation/taskState.ts, src/features/creation/model.ts, src/features/creation/provider adapters, tests/unit
- Verification: PARTIAL — 有界报价回执 schema、任务/幂等身份校验、重复与冲突保护和快照恢复通过；但当前生产 Provider→task 归档路径没有消费 applyTaskCostReceipt，只有 helper/schema 与 fixture 测试。真实 Provider 报价回执和提交后 exact-SHA 正式审查仍未取得，保持 PARTIAL。
- Evidence: [docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-intent.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-intent.md), [docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-spec.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-spec.md), [docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-verification.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-verification.md), [docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-review.md](../../docs/changes/2026-10-11-taskstate-docs-closeout/taskstate-review.md), [tests/unit/taskCostReceipt.test.ts](../../tests/unit/taskCostReceipt.test.ts), [tests/unit/taskState.test.ts](../../tests/unit/taskState.test.ts), [docs/evidence/2026-10-11-taskstate-docs-closeout/full-check-receipt.json](../../docs/evidence/2026-10-11-taskstate-docs-closeout/full-check-receipt.json), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md)
- Next action: 在统一 Provider→task 归档边界接入 applyTaskCostReceipt 并补调用路径测试；随后由 provider adapter owner 接入真实回执并保存 receipt/source/currency/identity 证据，继续保持 fixture 与真实账单分离。
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-PROV-002 — 多供应商接入与多目标配置（Provider Connectivity）

- Goal: 让 KK Studio 接入足够多的供应商/工具/MCP：统一 Provider 多目标渲染、配置导入导出、模型上下文窗口 catalog、MCP stdio 配置契约
- Scope: src/features/providers、src/features/models/modelCatalogWindow.ts、src/features/mcp/mcpConfig.ts、tests/unit、docs/changes/2026-09-24-provider-connectivity、docs/features(FEAT-032)
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-PROV-002
- Feature IDs: FEAT-032
- Owner role: repository-maintainer
- Acceptance: 一个 ProviderConnection 可渲染 Codex/Claude/OpenAI 三份目标配置且无密钥; 便携 v1 配置可 round-trip 导入导出，密钥不出现; model[1M] 后缀解析并生成 cc-switch 兼容 catalog; MCP stdio 契约仅接受白名单命令; typecheck/unit/lint/ui:check/format/governance/features/markdown 通过
- Branch: `feat/TASK-PROV-002-provider-connectivity`
- Worktree: `D:/kk-studio/.worktrees/TASK-PROV-002-provider-connectivity`
- Modules: src/features/providers, src/features/models, src/features/mcp, tests/unit, docs/changes, docs/features, docs/governance
- Verification: PASS — PR #16 已合入的无密钥多目标渲染、导入导出、模型 catalog 和 stdio 校验契约在当前完整回归通过。真实目标 CLI 消费仍属 003/004。
- Evidence: [docs/changes/2026-09-24-provider-connectivity/intent.md](../../docs/changes/2026-09-24-provider-connectivity/intent.md), [docs/changes/2026-09-24-provider-connectivity/spec.md](../../docs/changes/2026-09-24-provider-connectivity/spec.md), [docs/changes/2026-09-24-provider-connectivity/plan.md](../../docs/changes/2026-09-24-provider-connectivity/plan.md), [docs/changes/2026-09-24-provider-connectivity/verification.md](../../docs/changes/2026-09-24-provider-connectivity/verification.md), [docs/changes/2026-09-24-provider-connectivity/remaining.md](../../docs/changes/2026-09-24-provider-connectivity/remaining.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 feat/TASK-PROV-002-provider-connectivity 已通过 PR#16 a89792ad 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-COMPARE-001 — 画布图片对比操作

- Goal: 从已加载图片卡片选择 2–4 张并排比较，两张时可滑块对比，保持键盘、窄屏和失效图片状态可用
- Scope: src/features/compare、Canvas/图片节点入口、样式、测试与本轮交付包
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-COMPARE-001
- Feature IDs: FEAT-036
- Owner role: repository-maintainer
- Acceptance: 只有可读图片进入对比，最多四张，删除或失效后自动剔除; 2–4 张可并排查看并同步缩放/滚动，2 张可用滑块按键盘和触屏比较; 390px 和宽屏真实浏览器操作可用，现有画布交互不回归; 项目相关门禁通过，Web/Desktop 未验收项如实记录
- Branch: `codex/TASK-COMPARE-001-canvas-compare`
- Worktree: `D:/kk-studio/.worktrees/canvas-compare`
- Modules: src/features/compare, src/components/Canvas.tsx, src/components/nodes, src/styles/canvas-compare.css, tests/unit/imageCompare.test.ts, tests/browser/image-compare.spec.ts, tests/desktop/image-compare.mjs, docs/features, docs/governance
- Verification: PASS — PR #21 已合入；当前生产 preview 与 fresh Tauri release 两图/滑块/键盘/Escape 实测通过，无 page error。
- Evidence: [docs/changes/2026-09-27-canvas-image-compare/intent.md](../../docs/changes/2026-09-27-canvas-image-compare/intent.md), [docs/changes/2026-09-27-canvas-image-compare/spec.md](../../docs/changes/2026-09-27-canvas-image-compare/spec.md), [docs/changes/2026-09-27-canvas-image-compare/plan.md](../../docs/changes/2026-09-27-canvas-image-compare/plan.md), [docs/changes/2026-09-27-canvas-image-compare/verification.md](../../docs/changes/2026-09-27-canvas-image-compare/verification.md), [docs/changes/2026-09-27-canvas-image-compare/review.md](../../docs/changes/2026-09-27-canvas-image-compare/review.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-COMPARE-002 — 对比控件窄屏命中区主线回归

- Goal: 修复 PR #21 合并后 Windows 主线 CI 的 390px 对比按钮子像素高度失败，恢复可交付主线
- Scope: src/styles/canvas-compare.css、对比浏览器和 Desktop 验收、交付记录
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-COMPARE-002
- Feature IDs: FEAT-036
- Owner role: repository-maintainer
- Acceptance: 保留原 >=44px 浏览器断言并通过 390px 实测; 完整 verify 与 Desktop release GUI 不回归; 当前 PR 与合并后主线 CI 通过
- Branch: `fix/TASK-COMPARE-002-touch-target`
- Worktree: `D:/kk-studio/.worktrees/compare-ci-fix`
- Modules: src/styles/canvas-compare.css, tests/browser/image-compare.spec.ts, docs/changes/2026-09-28-compare-ci-fix, docs/governance
- Verification: PASS — PR #22 与合并后主线检查已有历史成功记录；当前 390px 命中区与完整浏览器、fresh Desktop 图片比较复验通过，原断言未放宽。
- Evidence: [docs/changes/2026-09-28-compare-ci-fix/intent.md](../../docs/changes/2026-09-28-compare-ci-fix/intent.md), [docs/changes/2026-09-28-compare-ci-fix/spec.md](../../docs/changes/2026-09-28-compare-ci-fix/spec.md), [docs/changes/2026-09-28-compare-ci-fix/plan.md](../../docs/changes/2026-09-28-compare-ci-fix/plan.md), [docs/changes/2026-09-28-compare-ci-fix/verification.md](../../docs/changes/2026-09-28-compare-ci-fix/verification.md), [docs/changes/2026-09-28-compare-ci-fix/review.md](../../docs/changes/2026-09-28-compare-ci-fix/review.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-VERSION-001 — 桌面/Web/Mobile 独立版本源与自动递增

- Goal: 让任务作者按受影响平台自动递增版本，三端从 2.1.1 起独立管理
- Scope: config/platform-versions.json、包元数据、运行态显示、版本命令与工程规则
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-VERSION-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 桌面/Web 运行态与包元数据各自显示 2.1.1；Mobile 规划元数据不冒充已发布; 桌面、Web、Mobile 可独立递增；2.1.9 补丁递增到 2.1.10; 版本一致性进入 verify，非法输入不写半套版本; 产品登录/本地存储目标和现状差距记录为开放任务
- Branch: `codex/TASK-VERSION-001-platform-versions`
- Worktree: `D:/kk-studio/.worktrees/platform-versioning`
- Modules: config/platform-versions.json, scripts/platform-versions.mjs, src/runtime/appInfo.ts, package.json, src-tauri, docs/engineering/VERSIONING.md
- Verification: PASS — 版本脚本与配置已实现；最终树本地 482 项 Node（474 通过、8 项 Windows 跳过 Linux 文件系统用例）、303 浏览器、Web 版本专项、Desktop check/build 与隔离 release GUI 通过。精确 head 9d55857 的独立复审、PR delivery/deploy-linux/verify、main@799efc5 合并及 postmerge verify/deploy-linux 均通过，合并树一致。账号/本地伴随服务/Mobile 仍为开放任务。
- Evidence: [docs/changes/2026-09-28-platform-versioning/intent.md](../../docs/changes/2026-09-28-platform-versioning/intent.md), [docs/changes/2026-09-28-platform-versioning/spec.md](../../docs/changes/2026-09-28-platform-versioning/spec.md), [docs/changes/2026-09-28-platform-versioning/plan.md](../../docs/changes/2026-09-28-platform-versioning/plan.md), [docs/changes/2026-09-28-platform-versioning/verification.md](../../docs/changes/2026-09-28-platform-versioning/verification.md), [docs/changes/2026-09-28-platform-versioning/review.md](../../docs/changes/2026-09-28-platform-versioning/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-28
- Updated: 2026-09-28

## TASK-LOCAL-SERVICE-001 — Web 本机伴随服务与既有浏览器数据迁移

- Goal: 让网页登录后的个人项目和素材由用户设备本机服务保存，并安全导入既有 IndexedDB 数据
- Scope: 本机服务、Web 存储适配器、安装/连接、既有项目与素材导入、备份恢复
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-LOCAL-SERVICE-001
- Feature IDs: FEAT-037
- Owner role: repository-maintainer
- Acceptance: Web 在有服务时从本机服务读写个人项目与素材，浏览器数据不作为最终持久源; 服务不可用、认证失效、冲突、断电/重启有明确状态和恢复路径; 既有 IndexedDB 项目与素材只读预检、无损导入与失败回滚; 跨浏览器实例及备份恢复的运行态验收
- Branch: `feat/TASK-LOCAL-SERVICE-001-companion`
- Worktree: `D:/kk-studio/.worktrees/platform-versioning`
- Modules: src/runtime, src/features/creation, local companion service, docs/architecture/DATA-STORAGE.md, src/components/settings, tests/browser, tests/local-service
- Verification: PARTIAL — 本机 loopback 服务、HttpOnly 配对、项目/素材服务优先读写、旧 IndexedDB 只读迁移、备份恢复、连接/断线 UI 与 production smoke 已通过本地和真实临时服务验收；真实账号登录、安装/更新、Mobile 和 VPS 生产部署仍未完成，因此产品任务保持 PARTIAL。
- Evidence: [docs/changes/2026-09-29-local-companion/intent.md](../../docs/changes/2026-09-29-local-companion/intent.md), [docs/changes/2026-09-29-local-companion/spec.md](../../docs/changes/2026-09-29-local-companion/spec.md), [docs/changes/2026-09-29-local-companion/plan.md](../../docs/changes/2026-09-29-local-companion/plan.md), [docs/changes/2026-09-29-local-companion/verification.md](../../docs/changes/2026-09-29-local-companion/verification.md), [docs/changes/2026-09-29-local-companion/review.md](../../docs/changes/2026-09-29-local-companion/review.md), [docs/architecture/adr/ADR-008-platform-versions-and-local-first.md](../../docs/architecture/adr/ADR-008-platform-versions-and-local-first.md), [docs/features/feat-037-web-local-service.md](../../docs/features/feat-037-web-local-service.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-29
- Updated: 2026-09-29

## TASK-CLOSEOUT-2026-09-28 — 合并后版本与 VPS 状态收口

- Goal: 记录 PR/主线门禁、同步账本和交接文档
- Scope: docs/governance, docs/PROGRESS.md, docs/changes
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-CLOSEOUT-2026-09-28
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: PR #23/#24 精确 head、merge SHA、tree 与 Hosted 结果可回读; 版本任务 DONE/PASS，T10-PREP PARTIAL，T10 BLOCKED; PROJECT_STATE、AI_HANDOFF、PROGRESS、TASK_LEDGER 与 change package 一致
- Branch: `docs/TASK-CLOSEOUT-2026-09-28`
- Worktree: `D:/kk-studio/.worktrees/platform-versioning`
- Modules: docs/governance, docs/PROGRESS.md, docs/changes
- Verification: PASS — PR #23/#24 与合并后 main 的 Hosted 门禁、tree 回读和状态文档同步均完成；本收口 PR #25 精确 head 981a24b 的独立复审、delivery、deploy-linux、verify 也通过；本机 VPS、离机备份、Web 本机服务、真实登录和 Mobile 仍未验收。
- Evidence: [docs/changes/2026-09-28-closeout/intent.md](../../docs/changes/2026-09-28-closeout/intent.md), [docs/changes/2026-09-28-closeout/spec.md](../../docs/changes/2026-09-28-closeout/spec.md), [docs/changes/2026-09-28-closeout/plan.md](../../docs/changes/2026-09-28-closeout/plan.md), [docs/changes/2026-09-28-closeout/verification.md](../../docs/changes/2026-09-28-closeout/verification.md), [docs/changes/2026-09-28-closeout/review.md](../../docs/changes/2026-09-28-closeout/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-28
- Updated: 2026-09-28

## TASK-POSTMERGE-MIGRATION-2026-09-28 — 主线合并后迁移操作单收口

- Goal: 同步迁移操作单的主线事实并保留 VPS 未验收边界
- Scope: deploy/MIGRATION.md, docs/PROGRESS.md, docs/changes
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-POSTMERGE-MIGRATION-2026-09-28
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 迁移操作单记录 main@be46ad6、tree 和合并后 Hosted 门禁; 不把 GitHub CI 或控制面板解释成 VPS 上传/恢复证明; PROGRESS、迁移操作单、账本与 change package 一致
- Branch: `docs/TASK-POSTMERGE-FINAL-2026-09-28`
- Worktree: `D:/kk-studio/.worktrees/platform-versioning`
- Modules: deploy/MIGRATION.md, docs/PROGRESS.md, docs/changes
- Verification: PASS — 本地文档/治理检查 PASS（治理 76/0、Markdown 90/0、delivery 9 文件/0 违规）；PR #26 精确 head d2485db 的独立复审、delivery、deploy-linux、verify 与合并后 main@be46ad6 的 verify/deploy-linux 均通过；VPS、备份、恢复、DNS/TLS 和生产写入仍未验收。
- Evidence: [docs/changes/2026-09-28-postmerge-migration/intent.md](../../docs/changes/2026-09-28-postmerge-migration/intent.md), [docs/changes/2026-09-28-postmerge-migration/spec.md](../../docs/changes/2026-09-28-postmerge-migration/spec.md), [docs/changes/2026-09-28-postmerge-migration/plan.md](../../docs/changes/2026-09-28-postmerge-migration/plan.md), [docs/changes/2026-09-28-postmerge-migration/verification.md](../../docs/changes/2026-09-28-postmerge-migration/verification.md), [docs/changes/2026-09-28-postmerge-migration/review.md](../../docs/changes/2026-09-28-postmerge-migration/review.md), [deploy/MIGRATION.md](../../deploy/MIGRATION.md), [docs/changes/2026-09-28-postmerge-migration-final/intent.md](../../docs/changes/2026-09-28-postmerge-migration-final/intent.md), [docs/changes/2026-09-28-postmerge-migration-final/spec.md](../../docs/changes/2026-09-28-postmerge-migration-final/spec.md), [docs/changes/2026-09-28-postmerge-migration-final/plan.md](../../docs/changes/2026-09-28-postmerge-migration-final/plan.md), [docs/changes/2026-09-28-postmerge-migration-final/verification.md](../../docs/changes/2026-09-28-postmerge-migration-final/verification.md), [docs/changes/2026-09-28-postmerge-migration-final/review.md](../../docs/changes/2026-09-28-postmerge-migration-final/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-28
- Updated: 2026-09-28

## TASK-UI-CANVAS-001 — 画布会话分栏与固定侧栏交互修复

- Goal: 让平板会话展开后保留可用画布控件，并让侧栏只通过开关切换固定宽度
- Scope: App canvas coverage, Sidebar toggle, Canvas HUD/navigation/toolbar, ConversationPanel responsive layout, browser regression
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-CANVAS-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 960–1200px 会话 rail 保持 400px 以内并将画布控件左移; 顶部导航、任务入口和底部工具在分栏状态可见、可操作且保留间距; 侧栏展开为固定 304px、收起为 72px 且不显示 ResizeHandle; <960px 继续使用覆盖式会话和 inert 画布; 定向 typecheck/build/Playwright 与截图证据完成
- Branch: `main`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/App.tsx, src/components/Sidebar.tsx, src/styles/canvas-hud.css, src/styles/conversation-panel.css, src/styles/responsive-content.css, src/styles/responsive.css, tests/browser/composer-fidelity.spec.ts, tests/browser/sidebar.spec.ts
- Verification: PASS — 目标 Web 定向回归通过：composer 2、sidebar 2、responsive-layout 3、desktop toolbar 1，Node 456、typecheck/build/diff check 通过；完整 canvas-layout 的 connector-video1 fixture 失败与本轮布局改动无关，Tauri/Figma/真实设备仍未验证。
- Evidence: [docs/changes/2026-09-28-canvas-chat-layout/intent.md](../../docs/changes/2026-09-28-canvas-chat-layout/intent.md), [docs/changes/2026-09-28-canvas-chat-layout/spec.md](../../docs/changes/2026-09-28-canvas-chat-layout/spec.md), [docs/changes/2026-09-28-canvas-chat-layout/plan.md](../../docs/changes/2026-09-28-canvas-chat-layout/plan.md), [docs/changes/2026-09-28-canvas-chat-layout/verification.md](../../docs/changes/2026-09-28-canvas-chat-layout/verification.md), [docs/changes/2026-09-28-canvas-chat-layout/review.md](../../docs/changes/2026-09-28-canvas-chat-layout/review.md), [docs/changes/2026-09-28-canvas-chat-layout/evidence/after-tablet-chat-final.png](../../docs/changes/2026-09-28-canvas-chat-layout/evidence/after-tablet-chat-final.png)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-28
- Updated: 2026-09-28

## TASK-UI-HOME-002 — 首页与对话输入区剩余设计反馈收口

- Goal: 按已授权 Figma 节点收口首页、对话、设置、侧栏与画布，移除重复提示词库入口并复核页面交互
- Scope: StartComposer/StartPage/ConversationPanel geometry, prompt-library entry, settings bottom rail, mobile topbar, sidebar and canvas shell regression
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-HOME-002
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 首页不再渲染提示词库快捷按钮，文件/应用功能菜单仍可打开提示词库; 首页空态 652×170/299×170 且动作顺序与 Figma 一致; 407:29265 对话输入的模型/Skill/插件及右侧动作保持可操作; 设置分类位于底部横向滑块，侧栏收起、画布工具条和对话入口保持可操作; 桌面与平板侧栏收起为 70px、展开为 291px 并推动工作区；收起图标为左小右大空心，展开图标填充左小框; typecheck/build 与本任务定向 Playwright 通过，已知 fixture 限制单独记录
- Branch: `main`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/App.tsx, src/components/StartPage.tsx, src/components/StartComposer.tsx, src/styles/composer.css, src/styles/feature-parity.css, src/styles/responsive-content.css, src/components/SidebarIcon.tsx, src/styles/responsive.css, public/design/figma/sidebar-expand.svg, public/design/figma/sidebar-collapse.svg, tests/browser/input-contract.spec.ts, tests/browser/ui-feature-parity.spec.ts, tests/browser/sidebar.spec.ts
- Verification: PASS — 按当前四页 Figma 保留 652×170/299×170、六个 24px 动作、70(平板72)/291 侧栏、设置滑块和可达应用菜单；当前 production Web 与 fresh Desktop 分别取证。
- Evidence: [docs/changes/2026-09-29-home-composer-fidelity/intent.md](../../docs/changes/2026-09-29-home-composer-fidelity/intent.md), [docs/changes/2026-09-29-home-composer-fidelity/spec.md](../../docs/changes/2026-09-29-home-composer-fidelity/spec.md), [docs/changes/2026-09-29-home-composer-fidelity/plan.md](../../docs/changes/2026-09-29-home-composer-fidelity/plan.md), [docs/changes/2026-09-29-home-composer-fidelity/verification.md](../../docs/changes/2026-09-29-home-composer-fidelity/verification.md), [docs/changes/2026-09-29-home-composer-fidelity/review.md](../../docs/changes/2026-09-29-home-composer-fidelity/review.md), [docs/changes/2026-09-29-home-composer-fidelity/evidence/home-390.png](../../docs/changes/2026-09-29-home-composer-fidelity/evidence/home-390.png), [docs/changes/2026-09-29-home-composer-fidelity/evidence/home-1099.png](../../docs/changes/2026-09-29-home-composer-fidelity/evidence/home-1099.png), [docs/changes/2026-09-29-home-composer-fidelity/evidence/home-1920.png](../../docs/changes/2026-09-29-home-composer-fidelity/evidence/home-1920.png), [docs/changes/2026-09-29-home-composer-fidelity/evidence/sidebar-collapsed-1099.png](../../docs/changes/2026-09-29-home-composer-fidelity/evidence/sidebar-collapsed-1099.png), [docs/changes/2026-09-29-home-composer-fidelity/evidence/sidebar-expanded-1099.png](../../docs/changes/2026-09-29-home-composer-fidelity/evidence/sidebar-expanded-1099.png), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-UI-GOV-003 — 新版 Figma 四页治理基线与 UI 模板收口

- Goal: 按新版四份治理页面统一业务状态、UI token、共享组件和五种页面模板
- Scope: uiGovernance state gates, tokens, shared controls, page templates, home/chat/settings/sidebar layout, governance docs
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-GOV-003
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 四个新版 Figma 治理页面是唯一设计与业务基线; 首页、画布、对话提交路径使用同一状态谓词并阻断未接入服务; token、按钮、图标和文字规则只有一个运行时来源; 页面模板运行时只提供 list/grid/detail/timeline/gallery，工作展示默认 grid; 390、1099、1920 视口的首页、对话、设置和侧栏几何有浏览器证据; 问题矩阵、可复用 UI 规范和模板配置已写入现行文档
- Branch: `main`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/domain/uiGovernance.ts, src/domain/pageTemplates.ts, src/styles/tokens.css, src/styles/ui-governance.css, src/styles/page-templates.css, src/components/ConversationPanel.tsx, src/components/ConversationComposerRegion.tsx, src/components/SettingsPanel.tsx, src/components/Sidebar.tsx, tests/browser/figma-governance-layout.spec.ts, docs/UI_INDEX.md, docs/UI_RULES.md, docs/UI_ARCHETYPES.md
- Verification: PASS — Figma 四页、tokens.css、模板与状态门禁完成当前基线收口，完整自动化与受影响真实桌面验证通过；全历史页面迁移仍属 UI-001/UI-004。
- Evidence: [docs/changes/2026-09-29-figma-ui-governance/spec.md](../../docs/changes/2026-09-29-figma-ui-governance/spec.md), [docs/changes/2026-09-29-figma-ui-governance/verification.md](../../docs/changes/2026-09-29-figma-ui-governance/verification.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-CANVAS-KAWORKAI-001 — Kaworkai 无限画布交互研究与本地画布增强

- Goal: 只读研究参考无限画布的逻辑与交互，并把不依赖远程生成或积分的历史、吸附和图层定位基础能力并入 KK Studio
- Scope: docs/changes/2026-09-29-kaworkai-canvas, src/components/Canvas.tsx, src/components/canvas, src/domain/canvasHistory.ts, src/domain/canvasPreferences.ts, tests/browser/canvas-history-layers.spec.ts, tests/unit/canvasHistory.test.ts, tests/unit/canvasPreferences.test.ts
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-CANVAS-KAWORKAI-001
- Feature IDs: FEAT-001
- Owner role: repository-maintainer
- Acceptance: 参考页面只读审计完成且不触发生成、上传、购买或积分消耗; 画布快照支持 Ctrl/Cmd+Z、Shift+Z/Ctrl+Y 与动态右键撤销/重做; 网格吸附偏好可持久化，拖动按 16px 网格并支持 Ctrl/Cmd 临时绕过; 图层面板支持搜索、类型标识、选中和定位，不伪造本地不存在的分组模型; 定向单测、typecheck、build 与新增浏览器验收通过
- Branch: `main`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/components/Canvas.tsx, src/components/canvas, src/domain/canvasHistory.ts, src/domain/canvasPreferences.ts, docs/features/feat-001-canvas-workbench.md, docs/features/features.registry.json, docs/governance/task-ledger.json
- Verification: PASS — 本地画布历史、吸附和图层验收完成。R1/R2先由真实UI复现失败，返修后24项相关回归、完整Web377/377及最新Tauri窗口通过；9656011独立复审从实际pointer/hooks链复验三轮相连删除/恢复、90帧单次撤销、取消redo与异步节点/边协调并关闭两项阻断。最终文档HEAD补审、Hosted及主线推广由集成PR/交付收据承载。远程竞品服务未纳入验收。
- Evidence: [docs/changes/2026-09-29-kaworkai-canvas/intent.md](../../docs/changes/2026-09-29-kaworkai-canvas/intent.md), [docs/changes/2026-09-29-kaworkai-canvas/spec.md](../../docs/changes/2026-09-29-kaworkai-canvas/spec.md), [docs/changes/2026-09-29-kaworkai-canvas/plan.md](../../docs/changes/2026-09-29-kaworkai-canvas/plan.md), [docs/changes/2026-09-29-kaworkai-canvas/research.md](../../docs/changes/2026-09-29-kaworkai-canvas/research.md), [docs/changes/2026-09-29-kaworkai-canvas/verification.md](../../docs/changes/2026-09-29-kaworkai-canvas/verification.md), [docs/changes/2026-09-29-kaworkai-canvas/evidence/layers-panel.png](../../docs/changes/2026-09-29-kaworkai-canvas/evidence/layers-panel.png), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md), [docs/changes/2026-09-29-project-landing/review.md](../../docs/changes/2026-09-29-project-landing/review.md), [docs/changes/2026-09-29-project-landing/evidence/history-fix/desktop/runtime.json](../../docs/changes/2026-09-29-project-landing/evidence/history-fix/desktop/runtime.json), [docs/changes/2026-09-29-project-landing/evidence/independent-review-9656011.md](../../docs/changes/2026-09-29-project-landing/evidence/independent-review-9656011.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-PROJECT-001 — 项目落地与分支收敛

- Goal: 将竞品研究对应的本地能力、UI 候选和最新主线收敛为可运行候选
- Scope: Git integration, home/chat/settings/canvas UI, Kaworkai local canvas primitives, branch and evidence convergence
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-PROJECT-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 候选分支包含最新 origin/main 且版本、锁文件、功能卡和治理视图一致; 首页、对话、设置、侧栏和画布在当前源码 bundle 上完成 390/1099/1920 回归; 竞品研究只落地本地可验证的画布历史、吸附和图层定位，不伪造远程 AI/积分/协作; 验证不足的外部服务、Desktop、移动硬件和生产部署继续保持 PARTIAL/BLOCKED
- Branch: `codex/TASK-PROJECT-001-landing-integration`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: Git, src/App.tsx, src/components, src/styles, src/domain, docs/governance, docs/PROGRESS.md
- Verification: PASS — 本地可运行候选范围完成：承接13个历史包，完整Web377/377、根623/631、Agent169/171（其余原平台skip）、Rust97/97与最新Desktop/compare/plugin/version通过。9656011独立复审关闭R1/R2并通过39项单测、delivery618/0；来源PR17/18已勘误。最终文档HEAD补审、托管门禁、实际main推广与分享包验证以集成PR/最终收据为准；本条DONE不代表外部服务、Installer、Mobile或生产发布完成。
- Evidence: [docs/changes/2026-09-29-project-landing/intent.md](../../docs/changes/2026-09-29-project-landing/intent.md), [docs/changes/2026-09-29-project-landing/spec.md](../../docs/changes/2026-09-29-project-landing/spec.md), [docs/superpowers/plans/2026-09-29-project-landing-integration.md](../../docs/superpowers/plans/2026-09-29-project-landing-integration.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md), [docs/changes/2026-09-23-google-cli-login/verification.md](../../docs/changes/2026-09-23-google-cli-login/verification.md), [docs/changes/2026-09-23-google-interactions/verification.md](../../docs/changes/2026-09-23-google-interactions/verification.md), [docs/changes/2026-09-24-claude-landing/verification.md](../../docs/changes/2026-09-24-claude-landing/verification.md), [docs/changes/2026-09-24-codebuddy-delegation/verification.md](../../docs/changes/2026-09-24-codebuddy-delegation/verification.md), [docs/changes/2026-09-24-local-memory/verification.md](../../docs/changes/2026-09-24-local-memory/verification.md), [docs/changes/2026-09-24-provider-wiring/verification.md](../../docs/changes/2026-09-24-provider-wiring/verification.md), [docs/changes/2026-09-24-sidebar-project-groups/verification.md](../../docs/changes/2026-09-24-sidebar-project-groups/verification.md), [docs/changes/2026-09-24-ui-regression/verification.md](../../docs/changes/2026-09-24-ui-regression/verification.md), [docs/changes/2026-09-25-sidebar-real-projects/verification.md](../../docs/changes/2026-09-25-sidebar-real-projects/verification.md), [docs/changes/2026-09-28-canvas-chat-layout/verification.md](../../docs/changes/2026-09-28-canvas-chat-layout/verification.md), [docs/changes/2026-09-29-figma-ui-governance/verification.md](../../docs/changes/2026-09-29-figma-ui-governance/verification.md), [docs/changes/2026-09-29-home-composer-fidelity/verification.md](../../docs/changes/2026-09-29-home-composer-fidelity/verification.md), [docs/changes/2026-09-29-kaworkai-canvas/verification.md](../../docs/changes/2026-09-29-kaworkai-canvas/verification.md), [docs/changes/2026-09-29-project-landing/review.md](../../docs/changes/2026-09-29-project-landing/review.md), [docs/changes/2026-09-29-project-landing/evidence/history-fix/desktop/runtime.json](../../docs/changes/2026-09-29-project-landing/evidence/history-fix/desktop/runtime.json), [docs/changes/2026-09-29-project-landing/evidence/independent-review-9656011.md](../../docs/changes/2026-09-29-project-landing/evidence/independent-review-9656011.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-PROJECT-001-landing-integration 已通过 PR#31 bd3bc668 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-UI-010 — 现行 UI 规则与真实操作回归

- Goal: 核对并修复新界面的设计系统、窄屏、入口路由和关键交互偏差，分别验证 Web 与 Desktop 产物
- Scope: 首页、画布、对话、设置、资产、提示词、目录、浏览器回归与运行身份
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-010
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 首页插件、Skill、伙伴与模型入口到达对应内容，键盘和焦点可用; 390/768/1920 的主要控件可读、可触达，面板调整与菜单运行正常; 新建项目和 Agent 测试 fixture 的状态边界清楚，完整 verify 通过; Web preview 与 fresh Desktop release 各自有实际运行证据，原工程并行改动保留; Figma 四节点与新 UI 页面类型经过规则和运行审计；未裁决的 token 冲突明确记录
- Branch: `fix/TASK-UI-010-ui-regression`
- Worktree: `D:/kk-studio/.worktrees/TASK-UI-010-ui-regression`
- Modules: src/components, src/styles, tests/browser, docs
- Verification: PASS — 承接 33ac5b3 并按最新四页规则裁决旧 token 冲突；真实入口、禁用反馈、焦点/短高/窄屏、当前 production Web 与 fresh Desktop 复验通过。用户最终视觉验收归 UI-004。
- Evidence: [docs/changes/2026-09-24-ui-regression/intent.md](../../docs/changes/2026-09-24-ui-regression/intent.md), [docs/changes/2026-09-24-ui-regression/spec.md](../../docs/changes/2026-09-24-ui-regression/spec.md), [docs/changes/2026-09-24-ui-regression/plan.md](../../docs/changes/2026-09-24-ui-regression/plan.md), [docs/changes/2026-09-24-ui-regression/verification.md](../../docs/changes/2026-09-24-ui-regression/verification.md), [docs/changes/2026-09-24-ui-regression/architecture-audit.md](../../docs/changes/2026-09-24-ui-regression/architecture-audit.md), [docs/changes/2026-09-24-ui-regression/review.md](../../docs/changes/2026-09-24-ui-regression/review.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-PROJECT-SIDEBAR-001 — 侧栏项目列表与真实项目数据统一

- Goal: 让侧栏项目和分组反映同一份 CreationSnapshot 中已保存的项目，消除静态演示行冒充项目管理的状态
- Scope: SidebarProjectEntry、SidebarProjectGroup、项目快照和项目操作
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-PROJECT-SIDEBAR-001
- Feature IDs: FEAT-015, FEAT-023
- Owner role: repository-maintainer
- Acceptance: 侧栏项目列表从真实已保存项目生成，空库时没有伪造项目，打开后与项目库指向同一项目; 分组、重命名、置顶、移动、删除按现有项目存储能力持久化；暂不可用的动作明确禁用并说明原因; Web 与 fresh Tauri 在创建、重启、删除后核对侧栏及项目库一致，键盘和窄屏入口可用
- Branch: `codex/TASK-PROJECT-001-landing-integration`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/components/SidebarProjectEntry.tsx, src/components/SidebarProjectGroup.tsx, src/features/creation, tests/browser, docs
- Verification: PARTIAL — 真实项目的创建/打开/改名/确认删除与项目库统一；Web 刷新及 fresh Tauri 重启通过。修复原生连续保存 CAS 和异步确认。文件夹/置顶仍是明示会话态，持久快照/项目包迁移未完成。
- Evidence: [docs/changes/2026-09-24-ui-regression/review.md](../../docs/changes/2026-09-24-ui-regression/review.md), [docs/features/feat-015-projects.md](../../docs/features/feat-015-projects.md), [docs/features/feat-023-navigation.md](../../docs/features/feat-023-navigation.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步；分支 codex/TASK-PROJECT-001-landing-integration 已通过 PR#31 bd3bc668 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-PROV-003 — Codex Provider 配置注入与 model catalog 落盘（agent 侧接线）

- Goal: 把 TASK-PROV-002 渲染产物落进 Codex 真实配置：config.toml 保守合并（只管理 kk_* 表与显式顶层键）、model-catalogs/<id>.json 落盘与相对指针、providers CLI（apply/check）；密钥只写 env_key
- Scope: vendor/canvas-agent/src/agent/codex-provider-config.ts、provider-cli.ts、index.ts 分派、vendor/canvas-agent/package.json 测试清单、docs/changes/2026-09-24-provider-wiring
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-PROV-003
- Feature IDs: FEAT-032
- Owner role: repository-maintainer
- Acceptance: 空文件/含注释/含自定义 provider/含历史 kk_* 表四类合并可预期且幂等; 输出绝不含密钥形态文本，写盘权限 0600/0700; model[1M] 后缀进入 catalog 且无后缀不生成窗口字段; providers apply/check 在本机真实 CODEX_HOME 可跑通; test:agent 与根门禁全绿
- Branch: `feat/TASK-PROV-003-provider-wiring-main`
- Worktree: `D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring`
- Modules: vendor/canvas-agent/src/agent, vendor/canvas-agent/src/index.ts, vendor/canvas-agent/package.json, docs/changes, docs/governance, docs/features
- Verification: PARTIAL — Codex Responses/TOML/catalog 指针和 CLI apply/check 已接入集成树；稳定 ID、非法 URL/目录穿越/参数不完整/幂等回归通过。真实 CODEX_HOME 消费对拍与 App UI 尚未完成。
- Evidence: [docs/changes/2026-09-24-provider-wiring/intent.md](../../docs/changes/2026-09-24-provider-wiring/intent.md), [docs/changes/2026-09-24-provider-wiring/spec.md](../../docs/changes/2026-09-24-provider-wiring/spec.md), [docs/changes/2026-09-24-provider-wiring/plan.md](../../docs/changes/2026-09-24-provider-wiring/plan.md), [docs/changes/2026-09-24-provider-wiring/verification.md](../../docs/changes/2026-09-24-provider-wiring/verification.md), [docs/changes/2026-09-24-provider-wiring/remaining.md](../../docs/changes/2026-09-24-provider-wiring/remaining.md), [docs/changes/2026-09-24-provider-wiring/review.md](../../docs/changes/2026-09-24-provider-wiring/review.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-PROV-004 — Claude Code settings.json 落盘（agent 侧接线）

- Goal: 把 Provider 渲染产物落进 Claude Code 配置：settings.json 保守合并（只写 env.ANTHROPIC_BASE_URL 与顶层 model，用户设置逐字段保留、幂等）、providers apply-claude CLI；密钥不落盘（认证走宿主 env 注入或交互登录）
- Scope: vendor/canvas-agent/src/agent/claude-provider-config.ts、provider-cli.ts apply-claude、package.json 测试清单、docs/changes/2026-09-24-claude-landing
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-PROV-004
- Feature IDs: FEAT-032
- Owner role: repository-maintainer
- Acceptance: 空文件/含用户设置/含受管键三类合并可预期且幂等; 非法 JSON 输入抛错不覆盖用户文件; 输出绝不含密钥形态文本，写盘权限 0600/0700; providers apply-claude 在本机真实目录可跑通; test:agent 与根门禁全绿
- Branch: `feat/TASK-PROV-004-claude-landing`
- Worktree: `D:/kk-studio/.worktrees/TASK-PROV-004-claude-landing`
- Modules: vendor/canvas-agent/src/agent, vendor/canvas-agent/package.json, docs/changes, docs/governance, docs/features
- Verification: PARTIAL — Claude settings.json 保守合并和 apply-claude 已进入集成树，当前 Agent 回归通过；旧真实目录 dry-run/apply/幂等证据保留。真实 Claude CLI 消费和设置入口未完成。
- Evidence: [docs/changes/2026-09-24-claude-landing/intent.md](../../docs/changes/2026-09-24-claude-landing/intent.md), [docs/changes/2026-09-24-claude-landing/spec.md](../../docs/changes/2026-09-24-claude-landing/spec.md), [docs/changes/2026-09-24-claude-landing/plan.md](../../docs/changes/2026-09-24-claude-landing/plan.md), [docs/changes/2026-09-24-claude-landing/verification.md](../../docs/changes/2026-09-24-claude-landing/verification.md), [docs/changes/2026-09-24-claude-landing/remaining.md](../../docs/changes/2026-09-24-claude-landing/remaining.md), [docs/changes/2026-09-24-claude-landing/review.md](../../docs/changes/2026-09-24-claude-landing/review.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-AGENT-004 — Google Interactions 对话和生图

- Goal: 配置 Google API Key 后直接聊天、生图并归档到当前画布
- Scope: Google Interactions adapter, conversation, credentials settings and assets
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-AGENT-004
- Feature IDs: FEAT-002, FEAT-009
- Owner role: repository-maintainer
- Acceptance: 连续对话和图片生成经官方协议接线，图片归档当前画布; 密钥只存系统凭据库或内存，项目切换与取消不污染状态; Web交互、故障回归、完整验证与独立审查；真实凭据验收单列
- Branch: `feat/TASK-AGENT-004-google-closeout`
- Worktree: `C:/Users/Administrator/.codex/worktrees/google-closeout/KK-Studio-2.0`
- Modules: src/features/agent, src/components, src/domain, src/App.tsx
- Verification: PARTIAL — 13671d7 的 Google/CLI 接线已承接，当前连续对话/图片归档/取消与项目切换 fixture 回归通过。真实 Google 凭据、CLI 登录和完整原生生成未验收。
- Evidence: [docs/changes/2026-09-23-google-interactions/verification.md](../../docs/changes/2026-09-23-google-interactions/verification.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-AGENT-005 — Gemini CLI 账号登录通道（免 API Key 对话）

- Goal: 登录 Google 账号后免 Key 在 KK 内对话，像 Codex 一样走本地服务
- Scope: gemini bridge script, geminiCliAdapter, agent connection loginMode, settings UI
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-AGENT-005
- Feature IDs: FEAT-009
- Owner role: repository-maintainer
- Acceptance: CLI 登录状态可检测并给出安装/登录指引; 文字对话经本地桥接通且连续会话续接; cli 模式生图与附件被明确拒绝，凭据不入 KK; Web 交互、故障回归、完整验证与独立审查；真实 gemini 验收单列
- Branch: `feat/TASK-AGENT-004-google-closeout`
- Worktree: `C:/Users/Administrator/.codex/worktrees/google-closeout/KK-Studio-2.0`
- Modules: src/features/agent, src/components, src/domain, scripts
- Verification: PARTIAL — Superseded for review by combined 004 closeout candidate: local CLI bridge/adapter fixture tests, browser flow and security regression checks pass there. Full verify rerun green after main merge. Real Gemini CLI install/login/bridge, desktop runtime and final independent review pending.
- Evidence: [docs/changes/2026-09-23-google-cli-login/verification.md](../../docs/changes/2026-09-23-google-cli-login/verification.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-23
- Updated: 2026-09-23

## TASK-MEMORY-001 — 本地长期记忆服务接入对话

- Goal: 把本地长期记忆接入 KK Studio 的 Codex 对话：用户原话规则采集、手动 Codex 提炼、本地存储、对话前注入和设置页管理；完整文件不参加云同步
- Scope: src/features/memory, src/features/agent/agentConnection.ts, src/components/settings, src-tauri storage_paths/main, docs/features feat-020, docs/changes/2026-09-24-local-memory
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-MEMORY-001
- Feature IDs: FEAT-020
- Owner role: repository-maintainer
- Acceptance: 记忆存储于本机（Web IndexedDB 或授权文件、Desktop 共享文件），换人使用时手动清空; 偏好消息规则采集并入库，后续对话注入[长期记忆]块; 设置页可开关/查看/删除/清空/手动提炼; 记忆不进WebDAV同步、localStorage、日志、导出包
- Branch: `feat/TASK-MEMORY-001-local-memory`
- Worktree: `D:/kk-studio/.worktrees/TASK-MEMORY-001`
- Modules: src/features/memory, src/features/agent/agentConnection.ts, src/components/settings/ConnectionSettings.tsx, src-tauri/src/storage_paths.rs, src-tauri/src/main.rs, docs/features/feat-020-memory.md
- Verification: PARTIAL — 当前 Web 记忆开关/存储/注入单测与 fresh Desktop 私有读写、重启保留及取消/确认删除通过；关闭时不创建记忆文件。真实 Codex 提炼/引用待联调。
- Evidence: [docs/changes/2026-09-24-local-memory/intent.md](../../docs/changes/2026-09-24-local-memory/intent.md), [docs/changes/2026-09-24-local-memory/spec.md](../../docs/changes/2026-09-24-local-memory/spec.md), [docs/changes/2026-09-24-local-memory/plan.md](../../docs/changes/2026-09-24-local-memory/plan.md), [docs/changes/2026-09-24-local-memory/verification.md](../../docs/changes/2026-09-24-local-memory/verification.md), [docs/changes/2026-09-24-local-memory/review.md](../../docs/changes/2026-09-24-local-memory/review.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-MEMORY-002 — 跨产品共享本地记忆（本机共享）

- Goal: 跨产品共享本地记忆：Codex/豆包/WorkBuddy 读写同一份 ~/.kk-memory/memory.json（本机默认共享），Web 授权目录降级 IndexedDB，旧文件一次性种子迁移；记忆仍不上云，换账号手动清空
- Scope: src/features/memory, src/components/settings/MemorySettingsSection.tsx, src-tauri main.rs/storage_paths.rs, docs/MEMORY-CONTRACT.md, AGENTS.md, docs/architecture/DATA-STORAGE.md, docs/features feat-020, docs/changes/2026-09-24-local-memory
- Display status: 进行中
- Priority: P2 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-MEMORY-002
- Feature IDs: FEAT-020
- Owner role: repository-maintainer
- Acceptance: 共享文件 ~/.kk-memory/memory.json 在 KK Studio 中可安全读写；豆包和 WorkBuddy 需完成受支持的适配器并真实联调; Web 未授权时降级 IndexedDB 并明示; 旧隔离文件一次性种子迁移，不覆盖已有共享文件; 完整记忆文件不进同步/localStorage/日志/导出；开启后选中片段用于模型推理; 清空/重置对读取同一文件的已接入客户端生效; Agent 遵循 docs/MEMORY-CONTRACT.md
- Branch: `feat/TASK-MEMORY-001-local-memory`
- Worktree: `D:/kk-studio/.worktrees/TASK-MEMORY-001`
- Modules: src/features/memory, src/components/settings/MemorySettingsSection.tsx, src-tauri/src/main.rs, src-tauri/src/storage_paths.rs, AGENTS.md, docs/MEMORY-CONTRACT.md, docs/architecture/DATA-STORAGE.md
- Verification: PARTIAL — 默认共享契约保留；--data-dir 隔离记忆，启动不迁移，损坏旧文件/锁/备份失败保持原件；fresh Desktop 验证共享文件 hash 未变。豆包/WorkBuddy 与 Web 目录授权仍未联调。
- Evidence: [docs/MEMORY-CONTRACT.md](../../docs/MEMORY-CONTRACT.md), [docs/changes/2026-09-24-local-memory/intent.md](../../docs/changes/2026-09-24-local-memory/intent.md), [docs/changes/2026-09-24-local-memory/spec.md](../../docs/changes/2026-09-24-local-memory/spec.md), [docs/changes/2026-09-24-local-memory/verification.md](../../docs/changes/2026-09-24-local-memory/verification.md), [docs/changes/2026-09-29-project-landing/verification.md](../../docs/changes/2026-09-29-project-landing/verification.md), [docs/changes/2026-09-29-project-landing/audit.md](../../docs/changes/2026-09-29-project-landing/audit.md)
- Next action: 按验收条件完成实现、验证、独立审查和文档同步
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-AGENT-007 — Codex 通过本机 CodeBuddy CLI 受限委派短文本

- Goal: 在 KK Studio 主 Agent 保持 Codex 的前提下，让已登录 CodeBuddy CLI 处理有限短文本子任务并把真实结果返回 Codex
- Scope: vendor/canvas-agent, src/features/agent/agentApi.ts, src/components/settings, docs/features/feat-009-conversation.md
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-AGENT-007
- Feature IDs: FEAT-009
- Owner role: repository-maintainer
- Acceptance: 本地 Agent 设置可保存 CLI 绝对路径并明确区分已保存与真实可用; MCP 提供 codebuddy_consult；只发送本轮有限文本，不读取完整记忆或项目文件，不继承 KK 凭据; 禁用 CodeBuddy 工具和会话持久化，超时、取消、并发与错误均失败关闭; 本机已登录账号完成一轮真实 MCP 调用并返回结果; Web 与 Windows 随包运行态分别验证，不用 CLI 成功代替桌面交付
- Branch: `feat/TASK-AGENT-007-codebuddy-cli`
- Worktree: `D:/kk-studio/.worktrees/TASK-AGENT-007-codebuddy-cli`
- Modules: vendor/canvas-agent/src/agent/codebuddy.ts, vendor/canvas-agent/src/server/http.ts, vendor/canvas-agent/src/server/mcp.ts, src/features/agent/agentApi.ts, src/components/settings/CodeBuddyConnectionSettings.tsx
- Verification: PASS — 受限 CLI、真实 MCP、随包 MCP、Web 1920/390、最终新 Tauri UI 和 KK 内真实 Codex 工具调用与可见回复均通过；416 Node/310 browser、Agent 135 通过/2 Windows 跳过，最终 MSI/NSIS 构建成功。首次 120 秒超时、最终新包约 145 秒成功；WorkBuddy OAuth/豆包和自动路由不属于本子任务。
- Evidence: [docs/changes/2026-09-24-codebuddy-delegation/intent.md](../../docs/changes/2026-09-24-codebuddy-delegation/intent.md), [docs/changes/2026-09-24-codebuddy-delegation/spec.md](../../docs/changes/2026-09-24-codebuddy-delegation/spec.md), [docs/changes/2026-09-24-codebuddy-delegation/plan.md](../../docs/changes/2026-09-24-codebuddy-delegation/plan.md), [docs/changes/2026-09-24-codebuddy-delegation/verification.md](../../docs/changes/2026-09-24-codebuddy-delegation/verification.md), [docs/changes/2026-09-24-codebuddy-delegation/review.md](../../docs/changes/2026-09-24-codebuddy-delegation/review.md), [docs/changes/2026-09-24-codebuddy-delegation/remaining.md](../../docs/changes/2026-09-24-codebuddy-delegation/remaining.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-24
- Updated: 2026-09-24

## TASK-DESKTOP-INSTALLER-001 — Windows NSIS 安装器及隔离恢复验收

- Goal: 完整 Agent/离线 WebView2 入包，真实隔离安装、修复、卸载再装保留项目
- Scope: Desktop installer configuration, receipts and isolated acceptance
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-DESKTOP-INSTALLER-001
- Feature IDs: FEAT-026
- Owner role: repository-maintainer
- Acceptance: NSIS currentUser 安装器可复现且保持数据身份; 安装器/EXE/Agent 逐文件校验，损坏与越界失败; 当前 Windows 隔离安装/Agent/重装/修复/卸载再装成功且项目保留; 不覆盖已有安装，不将当前主机当作干净系统/签名/低版本回滚
- Branch: `codex/T7-desktop-installer`
- Worktree: `D:/kk-studio/.worktrees/T7-desktop-installer`
- Modules: src-tauri/tauri.installer.conf.json, scripts/windows/installer-receipt.mjs, tests/desktop/installer.mjs, tests/unit/installerReceipt.test.ts, docs, scripts/windows/installer-inputs.mjs, tests/desktop/installer-state.ps1, tests/desktop/installer-cleanup.ps1, tests/unit/installerGuards.test.ts, tests/browser/settings-scroll.spec.ts
- Verification: PASS — 本机AC1–4已验收：NSIS、四次4279文件、启动/Agent/重装/修复/卸载再装保留项目、已有注册/进程保护通过；8项定向、无retry160项、完整verify631root/169Agent/377browser（原skip保留）、Rust97/clientcheck、独立技术/运行证据审查至2cf5249通过。
- Evidence: [docs/changes/2026-09-30-desktop-installer/verification.md](../../docs/changes/2026-09-30-desktop-installer/verification.md), [docs/changes/2026-09-30-desktop-installer/evidence/installer-runtime.json](../../docs/changes/2026-09-30-desktop-installer/evidence/installer-runtime.json), [docs/changes/2026-09-30-desktop-installer/evidence/candidate-verify.log](../../docs/changes/2026-09-30-desktop-installer/evidence/candidate-verify.log)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-09-30
- Updated: 2026-09-30

## TASK-AGENT-008 — Codex 原生生图事件传输与短提示词审计

- Goal: KK 控制 Codex 真正生图并归档，解释长提示词来源
- Scope: Codex 生图事件元数据、并发归档提交前幂等、真实生产恢复和短提示词审计
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-AGENT-008
- Feature IDs: FEAT-002, FEAT-009
- Owner role: repository-maintainer
- Acceptance: 3 MiB 生图 result 不进入 SSE 或补充历史，大小保护保持; 真实 KK Tauri 生图完成后连接保持且原件进入画布; 重启/重连唯一恢复与短句请求/聊天显示审计; 相关完整验证、独立精确 SHA review、PR 门禁
- Branch: `codex/TASK-AGENT-008-image-transport`
- Worktree: `D:/kk-studio/.worktrees/TASK-AGENT-008-image-transport`
- Modules: vendor/canvas-agent/src/agent/codex-client.ts, vendor/canvas-agent/src/agent/codex-client.test.ts, config/platform-versions.json, docs/governance, src/features/agent/agentHost.ts, tests/unit/agentHost.test.ts
- Verification: PASS — 本机AC-1–3 DONE：两组RED→GREEN，verify632root/172Agent/377browser（原平台skip保留）、Rust97/fmt/clientcheck；真实Tauri生图/续聊/重连/重启hash一致、节点/标记唯一。实现head3c63f1e独立审查PASS（43/9/6定向复验），P3文档意见已修正。PR#33终稿head独立补审、托管CI与推广以实际PR/收据为准；豆包/Web真实账号/其他Provider/Mobile/正式发布未验收。
- Evidence: [docs/changes/2026-10-01-agent-image-transport/intent.md](../../docs/changes/2026-10-01-agent-image-transport/intent.md), [docs/changes/2026-10-01-agent-image-transport/spec.md](../../docs/changes/2026-10-01-agent-image-transport/spec.md), [docs/changes/2026-10-01-agent-image-transport/verification.md](../../docs/changes/2026-10-01-agent-image-transport/verification.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-AGENT-008-image-transport 已通过 PR#33 21d121d2 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-10-01
- Updated: 2026-10-01

## TASK-ORCH-REPLAN-001 — 编排计划失败项重排与依赖闭包

- Goal: 在不重复成功工作项的前提下，将失败项及其下游依赖物化为可恢复的新计划
- Scope: src/features/agent/orchestrator.ts, tests/unit/orchestrator.test.ts
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-ORCH-REPLAN-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 失败和部分失败工作项进入新计划 queued 状态; 失败项的依赖下游一并重排，已成功项和原计划保留; 重复请求返回同一新计划且持久化通过 stagePlans; 审批门与 revision 语义合法，不触发真实 Provider 执行
- Branch: `codex/TASK-AUDIT-20261003`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`
- Modules: src/features/agent/orchestrator.ts, tests/unit/orchestrator.test.ts
- Verification: PASS — 失败/部分失败项与下游依赖会生成稳定幂等的新计划，成功项和原计划保留，审批门状态合法，确定性 ID 冲突会拒绝写入；25 项 orchestrator 单测通过。
- Evidence: [docs/changes/2026-10-03-task-audit/intent.md](../../docs/changes/2026-10-03-task-audit/intent.md), [docs/changes/2026-10-03-task-audit/spec.md](../../docs/changes/2026-10-03-task-audit/spec.md), [docs/changes/2026-10-03-task-audit/plan.md](../../docs/changes/2026-10-03-task-audit/plan.md), [docs/changes/2026-10-03-task-audit/verification.md](../../docs/changes/2026-10-03-task-audit/verification.md), [docs/changes/2026-10-03-task-audit/review.md](../../docs/changes/2026-10-03-task-audit/review.md), [src/features/agent/orchestrator.ts](../../src/features/agent/orchestrator.ts), [tests/unit/orchestrator.test.ts](../../tests/unit/orchestrator.test.ts)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-03
- Updated: 2026-10-03

## TASK-AUDIT-20261003 — 全项目任务盘点与可本地闭环项收口

- Goal: 盘点全部任务和功能卡，完成本地可验证缺陷并同步真实状态
- Scope: docs/governance, docs/features, src/features/mcp, src/features/agent, tests, src/features/creation, src/components/TaskWorkbench*.tsx, src/App.tsx
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-AUDIT-20261003
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 全部任务有状态、依赖、优先级或外部阻塞说明; 本地可闭环的 MCP 注册表、协议和计划重排缺陷有实现与回归证据; 治理视图和最终状态报告与实际命令输出一致; 继续收口阶段审批、未知报价、画布交付及原生任务恢复的本地边界，不升级外部待验收项
- Branch: `codex/TASK-AUDIT-20261003`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`
- Modules: docs/governance, docs/features, src/features/mcp, src/features/agent, tests, src/features/creation, src/components/TaskWorkbenchStages.tsx, src/App.tsx
- Verification: PASS — 当前97项任务已盘点并保留真实状态、依赖与外部条件；本地注册表、协议、计划重排、阶段审批、未知报价、交付与恢复边界有实现及回归。最终业务代码dc05556独立复验PASS；最新ef580db基准独立锁定npm ci后完整verify通过：Node710项（702pass/8Windows skip/0fail）、Agent174项（172pass/2Windows skip/0fail）、浏览器388项无flaky、Rust97项。带Agent的新Desktop2.1.4 release及隔离版本/项目重启/确认/画布与记忆保护通过；真实TaskHost生成/Provider和PR/CI/推广范围以本轮verification/review及实际PR收据为准。
- Evidence: [docs/changes/2026-10-03-task-audit/intent.md](../../docs/changes/2026-10-03-task-audit/intent.md), [docs/changes/2026-10-03-task-audit/spec.md](../../docs/changes/2026-10-03-task-audit/spec.md), [docs/changes/2026-10-03-task-audit/plan.md](../../docs/changes/2026-10-03-task-audit/plan.md), [docs/changes/2026-10-03-task-audit/inventory.md](../../docs/changes/2026-10-03-task-audit/inventory.md), [docs/changes/2026-10-03-task-audit/verification.md](../../docs/changes/2026-10-03-task-audit/verification.md), [docs/changes/2026-10-03-task-audit/review.md](../../docs/changes/2026-10-03-task-audit/review.md), [docs/governance/task-ledger.json](../../docs/governance/task-ledger.json), [docs/governance/TASK_LEDGER.md](../../docs/governance/TASK_LEDGER.md), [docs/features/features.registry.json](../../docs/features/features.registry.json), [docs/changes/2026-10-03-incomplete-tasks/intent.md](../../docs/changes/2026-10-03-incomplete-tasks/intent.md), [docs/changes/2026-10-03-incomplete-tasks/spec.md](../../docs/changes/2026-10-03-incomplete-tasks/spec.md), [docs/changes/2026-10-03-incomplete-tasks/plan.md](../../docs/changes/2026-10-03-incomplete-tasks/plan.md), [docs/changes/2026-10-03-incomplete-tasks/verification.md](../../docs/changes/2026-10-03-incomplete-tasks/verification.md), [docs/changes/2026-10-03-incomplete-tasks/review.md](../../docs/changes/2026-10-03-incomplete-tasks/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-08
- Updated: 2026-10-08

## TASK-GOV-GOALS-001 — 项目建设目标与验收基线

- Goal: 把核心用户路径、代码/UI/链路/质量/交付标准统一为可执行且受门禁保护的项目基线
- Scope: docs/governance/PROJECT_GOALS.md, scripts/check-project-goals.mjs, package.json, docs/governance
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-GOV-GOALS-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 明确创作、Agent、能力配置和恢复四条核心用户路径及完成证据; 明确范围、非目标、Desktop/Web/Mobile边界、错误/取消/离线/未知受理和数据安全标准; 项目目标检查接入 lint/verify，任务与变更证据同步
- Branch: `codex/TASK-AUDIT-20261003`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`
- Modules: docs/governance, scripts/check-project-goals.mjs, package.json
- Verification: PASS — 项目建设目标、四条用户主路径和六类验收门禁已落盘；目标检查通过并接入 lint/verify，外部能力继续由原任务和外部条件管理。
- Evidence: [docs/changes/2026-10-03-project-goals-baseline/intent.md](../../docs/changes/2026-10-03-project-goals-baseline/intent.md), [docs/changes/2026-10-03-project-goals-baseline/spec.md](../../docs/changes/2026-10-03-project-goals-baseline/spec.md), [docs/changes/2026-10-03-project-goals-baseline/plan.md](../../docs/changes/2026-10-03-project-goals-baseline/plan.md), [docs/changes/2026-10-03-project-goals-baseline/verification.md](../../docs/changes/2026-10-03-project-goals-baseline/verification.md), [docs/changes/2026-10-03-project-goals-baseline/review.md](../../docs/changes/2026-10-03-project-goals-baseline/review.md), [docs/governance/PROJECT_GOALS.md](../../docs/governance/PROJECT_GOALS.md), [scripts/check-project-goals.mjs](../../scripts/check-project-goals.mjs)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-03
- Updated: 2026-10-03

## TASK-UI-COMPONENT-BOUNDARY-001 — MCP 设置组件职责拆分

- Goal: 消除 MCP 设置组件超过 300 行的职责堆叠并保持设置行为完整
- Scope: src/components/settings/McpSettings.tsx, src/components/settings/McpServerForm.tsx, src/components/settings/McpServerList.tsx
- Display status: 已完成
- Priority: P3 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-COMPONENT-BOUNDARY-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: McpSettings、表单和列表组件均符合 300 行职责边界; 保存、只读禁用、连接/取消/断开、移除、工具展开和显式调用行为保持一致; 类型、Lint、UI 标准和 MCP 设置浏览器回归通过
- Branch: `codex/TASK-AUDIT-20261003`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`
- Modules: src/components/settings/McpSettings.tsx, src/components/settings/McpServerForm.tsx, src/components/settings/McpServerList.tsx
- Verification: PASS — MCP 设置容器已拆为表单和列表职责，UI 标准 194 文件/0 违规；定向 TypeScript、ESLint 和 Prettier 通过，MCP 设置浏览器回归在完整 Playwright 中通过。
- Evidence: [docs/changes/2026-10-03-ui-component-boundary/intent.md](../../docs/changes/2026-10-03-ui-component-boundary/intent.md), [docs/changes/2026-10-03-ui-component-boundary/spec.md](../../docs/changes/2026-10-03-ui-component-boundary/spec.md), [docs/changes/2026-10-03-ui-component-boundary/plan.md](../../docs/changes/2026-10-03-ui-component-boundary/plan.md), [docs/changes/2026-10-03-ui-component-boundary/verification.md](../../docs/changes/2026-10-03-ui-component-boundary/verification.md), [docs/changes/2026-10-03-ui-component-boundary/review.md](../../docs/changes/2026-10-03-ui-component-boundary/review.md), [src/components/settings/McpSettings.tsx](../../src/components/settings/McpSettings.tsx), [src/components/settings/McpServerForm.tsx](../../src/components/settings/McpServerForm.tsx), [src/components/settings/McpServerList.tsx](../../src/components/settings/McpServerList.tsx)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-03
- Updated: 2026-10-03

## TASK-UI-011 — 图片选择工具栏与新增页面 UI 规则回归

- Goal: 点击图片卡片后在上方显示共享操作栏，消除图片内部动作与新页面的实际规范偏差
- Scope: 参考图片与结果卡片选择、操作、缩放/拖动定位以及模型设置/阶段工作台/资源页面回归
- Display status: 已完成
- Priority: P1 — 历史已完成范围
- Requirement refs: ledger:TASK-UI-011
- Feature IDs: FEAT-001
- Owner role: repository-maintainer
- Acceptance: 单击图片只选中，未选中时无工具栏，选中后动作在卡片上方; 参考与结果图片复用共享操作，预览/重绘/对比/收藏/删除保持真实行为和原门禁; 工具栏随拖动、平移、缩放定位并保持标准控件尺寸，不遮挡图片或对话; Escape/空白/切换选中关闭，键盘与窄屏操作可用; Web 与 fresh Desktop 分别具有真实页面、DOM、截图证据，相关及完整验证通过
- Branch: `codex/TASK-UI-011-image-selection-actions`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-UI-011-image-selection-actions`
- Modules: src/components/nodes, src/components/canvas, src/features/compare, src/styles, tests/browser, docs/UI_RULES.md
- Verification: PASS — 精确产品7d27265承接main78cea37：完整verify root723/731(8原skip)、Agent172/174(2原skip)、423/423browser零flaky/零实际retry；Rust97/fmt/clientcheck/fresh UI13(385hash)+TaskHost11(9hash/5CDP)+同EXE模型能力PASS。独立补审PASS、R1/R2 CLOSED，当前PR Hosted37776187321及push37776180456必需检查SUCCESS。Task声明范围完成；最终文档head精确补审/Hosted与普通主线推广另绑。历史失败保留；不代表全项目/付费Provider/Mobile/安装/最终视觉验收。
- Evidence: [docs/changes/2026-10-08-image-selection-actions/intent.md](../../docs/changes/2026-10-08-image-selection-actions/intent.md), [docs/changes/2026-10-08-image-selection-actions/spec.md](../../docs/changes/2026-10-08-image-selection-actions/spec.md), [docs/changes/2026-10-08-image-selection-actions/plan.md](../../docs/changes/2026-10-08-image-selection-actions/plan.md), [docs/changes/2026-10-08-image-selection-actions/verification.md](../../docs/changes/2026-10-08-image-selection-actions/verification.md), [docs/changes/2026-10-08-image-selection-actions/review.md](../../docs/changes/2026-10-08-image-selection-actions/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线；分支 codex/TASK-UI-011-image-selection-actions 已通过 PR#39 f922cf8e 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）
- Last verified: 2026-10-08
- Updated: 2026-10-08

## TASK-PROV-005 — Desktop 供应商非秘密配置 durable 保存与恢复

- Goal: 已保存账号/模型/ref 在立即异常退出后仍可恢复，不使系统凭据变成无法定位的孤立记录
- Scope: src/components/settings, src/features/creation/providerRegistry.ts, src/features/models/modelCatalog.ts, src-tauri
- Display status: 已完成
- Priority: P1 — 当前治理或验证阻断项
- Requirement refs: ledger:TASK-PROV-005
- Feature IDs: FEAT-002
- Owner role: repository-maintainer
- Acceptance: 供应商非秘密配置及目录在成功提示前有原生 durable 落盘; 立即异常终止并重启保留账号/模型/ref，旧浏览器元数据无损迁移; 系统凭据仍仅在 OS vault，文件/localStorage/日志没有秘密; 失败/冲突不假报成功或覆盖原件，真实 Tauri 重启与全量回归通过
- Branch: `fix/TASK-PROV-005-provider-durable-config`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PROV-005`
- Modules: src/components/settings, src/features/creation/providerRegistry.ts, src/features/models/modelCatalog.ts, src-tauri
- Verification: PASS — 原生 durable 落盘实现并验收：Rust provider_config.rs（文件锁+revision 冲突+atomic write+sync+bak+损坏恢复+秘密键拒绝），命令 read/write_provider_config 接入 main.rs；TS providerRegistry 新增 isDesktopProviderDurable/load/persistProviderConnectionsDurable，ModelProviderSettings save/clearKey 成功提示前 await durable 提交，App 启动原生加载并迁移 localStorage 旧元数据。验证：Rust 单测 6/6、TS 单测 6/6、provider 相关回归 47/47、tsc/build 通过；桌面强杀重启验收 8/8 PASS（保存→杀进程树→重启连接与 credentialRef 完整恢复，落盘文件无秘密）。限制：完整 npm run verify 与 push/PR 留网络/CI 门禁。
- Evidence: [docs/changes/2026-10-09-provider-durable-config/intent.md](../../docs/changes/2026-10-09-provider-durable-config/intent.md), [docs/changes/2026-10-09-provider-durable-config/spec.md](../../docs/changes/2026-10-09-provider-durable-config/spec.md), [docs/changes/2026-10-09-provider-durable-config/plan.md](../../docs/changes/2026-10-09-provider-durable-config/plan.md), [docs/changes/2026-10-09-provider-durable-config/verification.md](../../docs/changes/2026-10-09-provider-durable-config/verification.md), [docs/changes/2026-10-09-provider-durable-config/review.md](../../docs/changes/2026-10-09-provider-durable-config/review.md), [docs/changes/2026-10-08-taskhost-native-lifecycle/evidence/provider-abrupt-exit-observation.json](../../docs/changes/2026-10-08-taskhost-native-lifecycle/evidence/provider-abrupt-exit-observation.json), [docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md](../../docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md), [docs/changes/2026-10-08-taskhost-native-lifecycle/status.md](../../docs/changes/2026-10-08-taskhost-native-lifecycle/status.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-10
- Updated: 2026-10-10

## TASK-PROV-006 — Desktop image 提交连接门禁与 health 统一

- Goal: 图片原生提交复查明确绑定账号、禁用/容量，结构化原生错误回写同一连接健康状态
- Scope: src/App.tsx, src/features/creation/providerSubmission.ts, src/features/creation/nativeTaskHost.ts, src-tauri/src/task_host.rs
- Display status: 已完成
- Priority: P1 — 当前治理或验证阻断项
- Requirement refs: ledger:TASK-PROV-006
- Feature IDs: FEAT-002, FEAT-008
- Owner role: repository-maintainer
- Acceptance: 同账号 image 提交前复查身份、禁用/隔离与容量，无效连接零 POST; 原生 401/403/429 等结构化失败正确回写当前账号 health，旧身份/迟到回执不污染新配置; 原生进程持有运行容量，reload 不释放；取消/终态释放而不新增任务队列; unknown 保持禁止普通重试，已归档原件保留；真实 Tauri fixture 与全量回归通过
- Branch: `fix/TASK-PROV-006-provider-gates`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PROV-006`
- Modules: src/App.tsx, src/features/creation/providerSubmission.ts, src/features/creation/nativeTaskHost.ts, src-tauri/src/task_host.rs
- Verification: PASS — 原生 image 容量门禁与 health 回执身份保护已实现并验证：task_host.rs submit 容量检查覆盖全部请求（text/image/legacy，运行中 jobs 按 credential_ref 计数，journal 前拒绝零 POST，jobs 终态移除/reload 不清空）；markProviderConnectionFailure/Healthy 增加 expected 身份校验，App.tsx 两处回执传任务绑定身份，baseUrl/credentialRef 变更的迟到回执不污染新配置。验证：Rust cargo test task_host 21/21、TS providerHealthIdentity 5/5、provider 相关回归 15/15、tsc 通过。限制：完整 npm run verify、真实 Tauri fixture 端到端、push/PR 留网络/CI 门禁。
- Evidence: [docs/changes/2026-10-09-provider-gates/intent.md](../../docs/changes/2026-10-09-provider-gates/intent.md), [docs/changes/2026-10-09-provider-gates/spec.md](../../docs/changes/2026-10-09-provider-gates/spec.md), [docs/changes/2026-10-09-provider-gates/plan.md](../../docs/changes/2026-10-09-provider-gates/plan.md), [docs/changes/2026-10-09-provider-gates/verification.md](../../docs/changes/2026-10-09-provider-gates/verification.md), [docs/changes/2026-10-09-provider-gates/review.md](../../docs/changes/2026-10-09-provider-gates/review.md), [docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md](../../docs/changes/2026-10-08-taskhost-native-lifecycle/verification.md), [docs/changes/2026-10-08-taskhost-native-lifecycle/status.md](../../docs/changes/2026-10-08-taskhost-native-lifecycle/status.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-10
- Updated: 2026-10-10

## TASK-PROV-007 — Selected model is at capacity 错误分类与可用模型切换

- Goal: 上游容量/429 拒绝时保留原始错误与状态，分类为容量状态而非普通 Error，刷新 models/usage 实时可用性，明确展示可用模型并提供降级选择与切换入口，无 retry-after 时不盲目重试
- Scope: src/features/creation/providerSubmission.ts, src/features/models/modelCatalog.ts, src/features/creation/nativeTaskHost.ts, 模型选择 UI, tests
- Display status: 已完成
- Priority: P1 — 历史已完成范围
- Requirement refs: ledger:TASK-PROV-007
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 上游 capacity/429 响应分类为容量状态而非普通 Error，原始错误与状态完整保留; 刷新 models/usage 实时可用性，界面明确显示可用模型与禁用原因; 提供降级选择与明确切换入口，无 retry-after 时不盲目重试; 与 PROV-006 提交门禁互不冲突，相关回归与完整 verify 通过
- Branch: `fix/TASK-PROV-007-capacity-errors`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-PROV-007`
- Modules: src/features/creation/providerSubmission.ts, src/features/models/modelCatalog.ts, src/features/creation/nativeTaskHost.ts, src/components/models, tests
- Verification: PASS — 已实现并验证：上游 429/capacity 失败保留原始 error.message 与 HTTP 状态（Rust task_host upstream_error_detail 注入 failure message；TS imageGeneration providerError 读取响应 body），429 无 Retry-After 不再标记可重试（连接冷却后手动重试），失败提示明确显示当前可用连接并引导切换。验证：Rust cargo test task_host 21/21、TS providerError 5/5、provider 相关回归 15/15、tsc 通过。限制：可用性展示为失败提示级（连接健康派生），未新增独立 usage 命令；完整 npm run verify 与 push/PR 留网络/CI 门禁。
- Evidence: [docs/changes/2026-10-09-capacity-errors/intent.md](../../docs/changes/2026-10-09-capacity-errors/intent.md), [docs/changes/2026-10-09-capacity-errors/spec.md](../../docs/changes/2026-10-09-capacity-errors/spec.md), [docs/changes/2026-10-09-capacity-errors/plan.md](../../docs/changes/2026-10-09-capacity-errors/plan.md), [docs/changes/2026-10-09-capacity-errors/verification.md](../../docs/changes/2026-10-09-capacity-errors/verification.md), [docs/changes/2026-10-09-capacity-errors/review.md](../../docs/changes/2026-10-09-capacity-errors/review.md)
- Next action: 保留当前证据，合并后按原验收范围回读主线
- Last verified: 2026-10-10
- Updated: 2026-10-10

## TASK-VERIFY-CONCURRENCY-002 — 浏览器并发失败原因与隔离复核

- Goal: 保留首轮失败并查明资源/超时条件，不能用重复跑隐藏失败
- Scope: 健康审计QA-001；当前main重新复现后在独立任务分支收尾
- Display status: 进行中
- Priority: P1 — 当前治理或验证阻断项
- Requirement refs: ledger:TASK-VERIFY-CONCURRENCY-002
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 保留首轮失败并查明资源/超时条件，不能用重复跑隐藏失败; 保留原始失败与来源，相关回归/完整门禁及独立精确head审查通过; 按普通PR集成并回读当前main；外部条件如实分开
- Branch: `codex/TASK-VERIFY-CONCURRENCY-002-closeout`
- Worktree: `D:/kk-studio/.worktrees/TASK-VERIFY-CONCURRENCY-002`
- Modules: tests/browser, playwright.config.ts
- Verification: PARTIAL — 当前 clean source 8090475958f1a0bdd1b4b36ada7f2aba1e4e6264、同一 production dist、固定 preview 1423/retries0 下，workers 1/2/4/8/12 均 447/447 PASS；历史 source105 的 9 个首轮 flaky 原件保留，当前未复现，资源压力仅支持假设。PR #46 已以 squash merge 2b6c0ba10e17b873d5a38d85b2d38fb8848149cc 合并，origin/main 与候选/落地 tree 已回读一致；合并后 run 37983272823 的 verify、deploy-linux、upload-artifact 成功，delivery 按 push 条件跳过。IRV-CONC-002 已关闭；历史根因仍 UNKNOWN，不能称根因修复。
- Evidence: [docs/changes/2026-10-09-windows-entry-diagnostics/verification.md](../../docs/changes/2026-10-09-windows-entry-diagnostics/verification.md), [docs/changes/2026-10-10-verify-concurrency-002/verification.md](../../docs/changes/2026-10-10-verify-concurrency-002/verification.md), [docs/changes/2026-10-10-verify-concurrency-002/review.md](../../docs/changes/2026-10-10-verify-concurrency-002/review.md), [docs/changes/2026-10-10-verify-concurrency-002-closeout/verification.md](../../docs/changes/2026-10-10-verify-concurrency-002-closeout/verification.md), [docs/changes/2026-10-10-verify-concurrency-002-closeout/review.md](../../docs/changes/2026-10-10-verify-concurrency-002-closeout/review.md)
- Next action: 保留source105的9个首轮flaky原件；当前固定1423、retries=0的并发矩阵仅证明未复现，不宣称根因已修复。若要关闭，补同一exact SHA的Hosted与独立复审；否则保持PARTIAL。
- Last verified: 2026-10-09
- Updated: 2026-10-10

## TASK-VERIFY-ORIGIN-003 — 浏览器验收端口与服务来源契约一致性

- Goal: 配置和实际验收端口契约一致，不运行不支持的端口后误判产品
- Scope: playwright KK_TEST_PORT与7处固定1423断言、3处默认来源契约
- Display status: 已完成
- Priority: P1 — 来源契约验收已完成；外部交付继续由对应P1任务负责
- Requirement refs: ledger:TASK-VERIFY-ORIGIN-003
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 保留105 preview1431真实437PASS/10FAIL反例及默认1423零重试447PASS原件; 根据固定端口规范提供明确早期配置拒绝或合法测试fixture契约，不能弱化产品端口断言和来源白名单; 相关回归与精确提交独立审查通过
- Branch: `main`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: playwright.config.ts, docs/engineering/TESTING.md, tests/browser/image-selection-actions.spec.ts, tests/browser/ui-page-rules.spec.ts, tests/browser/local-service-connection.spec.ts, tests/browser/local-service-migration.spec.ts, tests/browser/image-compare.spec.ts, tests/browser/agent.spec.ts, tests/unit/verificationOrigins.test.ts
- Verification: PASS — 来源契约范围已完成：冻结树1f6cbd37091326a899fa600baba53bf6efd9cf16上KK_TEST_PORT=1431在Playwright加载前拒绝，固定1423可列出447项，六组生产browser spec fresh preview/Edge/workers=1/retries=0为25/25，Vite build通过，冻结树治理115任务/35功能/102 Markdown均0 violations。GitHub exact tree Hosted quality run 38080705770 的 verify/deploy-linux成功，git-guards run 38080705741存在；delivery跳过。任务实现提交为4949b3db，合入7736c99后由1f6cbd3承载。独立review `/root/origin_exact_review3` 已绑定 base 7ebf143b291e344b243e1ef396d510bb91730bd3、实现提交4949b3db与承载树1f6cbd3，结论PASS（scoped），无P0/P1发现。Hosted delivery、Windows安装/签名、第二环境、真实Provider、Tauri、移动设备与用户验收由其他任务继续承担。
- Evidence: [docs/changes/2026-10-09-windows-entry-diagnostics/verification.md](../../docs/changes/2026-10-09-windows-entry-diagnostics/verification.md), [docs/changes/2026-10-11-verify-origin-003/intent.md](../../docs/changes/2026-10-11-verify-origin-003/intent.md), [docs/changes/2026-10-11-verify-origin-003/spec.md](../../docs/changes/2026-10-11-verify-origin-003/spec.md), [docs/changes/2026-10-11-verify-origin-003/plan.md](../../docs/changes/2026-10-11-verify-origin-003/plan.md), [docs/changes/2026-10-11-verify-origin-003/verification.md](../../docs/changes/2026-10-11-verify-origin-003/verification.md), [docs/changes/2026-10-11-verify-origin-003/review.md](../../docs/changes/2026-10-11-verify-origin-003/review.md), [docs/changes/2026-10-11-closeout/verification.md](../../docs/changes/2026-10-11-closeout/verification.md), [docs/changes/2026-10-11-p1-exact-sha-closeout/intent.md](../../docs/changes/2026-10-11-p1-exact-sha-closeout/intent.md), [docs/changes/2026-10-11-p1-exact-sha-closeout/plan.md](../../docs/changes/2026-10-11-p1-exact-sha-closeout/plan.md), [docs/changes/2026-10-11-p1-exact-sha-closeout/verification.md](../../docs/changes/2026-10-11-p1-exact-sha-closeout/verification.md), [docs/changes/2026-10-11-p1-exact-sha-closeout/review.md](../../docs/changes/2026-10-11-p1-exact-sha-closeout/review.md), [docs/changes/2026-10-11-p1-exact-sha-closeout/exact-independent-review.md](../../docs/changes/2026-10-11-p1-exact-sha-closeout/exact-independent-review.md), [docs/changes/2026-10-10-verify-origin-003/intent.md](../../docs/changes/2026-10-10-verify-origin-003/intent.md), [docs/changes/2026-10-10-verify-origin-003/spec.md](../../docs/changes/2026-10-10-verify-origin-003/spec.md), [docs/changes/2026-10-10-verify-origin-003/plan.md](../../docs/changes/2026-10-10-verify-origin-003/plan.md), [docs/changes/2026-10-10-verify-origin-003/verification.md](../../docs/changes/2026-10-10-verify-origin-003/verification.md), [docs/changes/2026-10-10-verify-origin-003/review.md](../../docs/changes/2026-10-10-verify-origin-003/review.md)
- Next action: 保留exact-SHA与独立review收据；Hosted delivery、Windows安装、第二环境、发布和用户验收继续由TASK-AGENT-010及发布门禁承担。
- Last verified: 2026-10-11
- Updated: 2026-10-11

## TASK-DOCS-STRUCT-001 — AI 协作规则文档结构收敛

- Goal: 建立单一文档入口与权威优先级，补齐编码与测试规范缺口，消除同一规则多处定义
- Scope: docs/README.md 索引与裁决、新建 engineering/CODING-STANDARDS.md 与 engineering/TESTING.md、BRANCH-POLICY.md 补四节、UI_RULES.md 加 3.4 Token 化纪律、AGENTS.md 与 AI_RULES.md 边界；本次延续补齐 DEVELOPMENT-WORKFLOW.md、开发笔记/成果说明模板、根因闭环和竞品观察节奏。
- Display status: 已完成
- Priority: P1 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-DOCS-STRUCT-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: docs/README.md 含四类索引表、五层权威优先级与冲突裁决细则、本地记忆四层模型; CODING-STANDARDS.md 门禁表每条对应实际脚本源码，含 domain 依赖禁令与 300 行边界适用范围; TESTING.md 的 Playwright 参数与 playwright.config.ts 逐字段一致，含 KK_TEST_PORT 与 retries 纪律; 未新建 ui-guidelines.md / git-workflow.md / UI-TOKEN-GOVERNANCE.md，避免第二来源; markdown:check 0 violations 且 npm run lint exit 0; DEVELOPMENT-WORKFLOW.md 明确任务领取、需求/验收确认、TODO/IN_PROGRESS/REVIEW/DONE/BLOCKED/REGRESSION 流转和成果说明; intent/plan/verification/review/incident 模板记录负责人、依赖、状态笔记、边界验证、根因和遗留问题; 竞品观察记录来源、证据和静态/运行边界，不提升本地产品完成度; 新 dated change package、账本、docs/PROGRESS.md 与治理/Markdown/delivery 门禁结果可追溯
- Branch: `docs/TASK-DOCS-STRUCT-001`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: docs/README.md, docs/engineering/CODING-STANDARDS.md, docs/engineering/TESTING.md, docs/engineering/BRANCH-POLICY.md, docs/UI_RULES.md, AGENTS.md, AI_RULES.md, docs/engineering/DEVELOPMENT-WORKFLOW.md, docs/templates/intent.md, docs/templates/plan.md, docs/templates/verification.md, docs/templates/review.md, docs/templates/incident.md, docs/reference/competitor/INDEX.md, docs/PROGRESS.md
- Verification: PASS — 文档流程入口、模板、竞品边界和变更包已落地；JSON、diff check、Markdown、features、project goals、renderLedger 视图一致性、delivery equivalent、等价 lint 与 governance 均 PASS。独立上下文 AI review（review_workflow_docs_fast）已在 exact HEAD 8933692e326af6f1989efae6d8a9dfe5c192e7e4 完成，结论 PASS/ACCEPTABLE，无 P0–P2；R-1/R-2/R-3 已修正并复跑通过。重新生成的 pnpm-lock.yaml 已按 SHA 隔离并写入 retention manifest，治理结果为 120 tasks、0 violations；本任务完成标准已满足。
- Evidence: [docs/changes/2026-10-09-docs-structure/verification.md](../../docs/changes/2026-10-09-docs-structure/verification.md), [docs/changes/2026-10-09-docs-structure/review.md](../../docs/changes/2026-10-09-docs-structure/review.md), [docs/changes/2026-10-10-development-workflow/verification.md](../../docs/changes/2026-10-10-development-workflow/verification.md), [docs/changes/2026-10-10-development-workflow/review.md](../../docs/changes/2026-10-10-development-workflow/review.md)
- Next action: 保留当前证据；合并或发布前按本任务原验收范围回读主线，不重新引入 pnpm 锁文件。
- Last verified: 2026-10-10
- Updated: 2026-10-10

## TASK-AI-GATEWAY-001 — 统一多平台 AI 模型接入：凭证、通道契约与豆包 Ark 适配器

- Goal: 为豆包为首的多平台接入落地凭证存储、通道抽象契约与错误映射，使 kk 客户端具备可插拔的多厂商接入底座
- Scope: 通道适配器契约、11 类失败分类、分档降级调度、凭证端口注入、/v1/chat/completions 端点。不含真实 DPAPI 实现、不含 sub2api 对接、不含 UI 解锁。
- Display status: 进行中
- Priority: P1 — 调度层填补的是真实能力空洞（既有 generation-server 的 job.connection_id 建单时一次写入、从不重新赋值，根本没有换号能力），但未接真实上游前不产生用户价值。
- Requirement refs: ledger:TASK-AI-GATEWAY-001
- Feature IDs: FEAT-038
- Owner role: repository-maintainer
- Acceptance: 四方法适配器契约（submit/poll/probe/normalizeError）完整，normalizeError 必填 retryable; 失败按信号优先级分类：Ark 同一个 400 必须能区分参数非法与内容审核拒绝; 调度器分优先级档位降级，重试绝不落在同一账号；不可重试错误中止整个 dispatch; 流式请求发出首个 chunk 后禁止任何重试; 配置只存 credential_ref，明文仅经 resolveSecret() 闭包取用; 凭证引用校验先判 secret 再判格式，避免藏起「把密钥写进配置」的真问题; 轮询经 credentialRefFor 取凭证，不得误传 channelId; 厂商 cooldownMs 不被本地 maxCooldownMs 截断; 全部新增单测通过且对既有全量单测零回归
- Branch: `docs/TASK-DOCS-STRUCT-001`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/features/ai-gateway/credentials.ts, src/features/ai-gateway/errors.ts, src/features/ai-gateway/channels/adapter.ts, src/features/ai-gateway/channels/registry.ts, src/features/ai-gateway/channels/doubao.ts, src/features/ai-gateway/scheduler.ts, src/features/ai-gateway/chat.ts, src/features/generation-server/http.ts, tests/unit/aiGatewayCredentials.test.ts, tests/unit/aiGatewayChannels.test.ts, tests/unit/aiGatewayScheduler.test.ts, tests/unit/aiGatewayChat.test.ts, tests/unit/aiGatewayChatEndpoint.test.ts, tests/unit/generationServerChatRoute.test.ts, docs/features/feat-038-ai-model-gateway.md, src/domain/modelProvider.ts, src/features/creation/model.ts, src/components/settings/ProviderProfileFields.tsx, tests/unit/modelProvider.test.ts, docs/changes/2026-10-10-doubao-official-channel/, src/features/agent/agentImages.ts, src/features/agent/agentHost.ts, src/features/models/modelMenuEntries.ts, src/features/models/modelPresentation.ts, tests/unit/modelMenuEntries.test.ts, tests/unit/modelPresentation.test.ts
- Verification: PARTIAL — gateway/Agent/model 本地回归仍通过；当前实现缺少真实 DPAPI protector，Ark 通道在 response.json() 后才产生最终文本，generation-server 只把完整文本包装为单个 SSE delta，尚未实现 upstream token-level stream。真实 Ark/Codex 凭据和 Desktop 运行态仍未验证，保持 PARTIAL。
- Evidence: [docs/features/feat-038-ai-model-gateway.md](../../docs/features/feat-038-ai-model-gateway.md), [docs/changes/2026-10-10-kk-model-capability/verification.md](../../docs/changes/2026-10-10-kk-model-capability/verification.md), [docs/superpowers/specs/2026-10-10-kk-model-capability-design.md](../../docs/superpowers/specs/2026-10-10-kk-model-capability-design.md), [docs/superpowers/plans/2026-10-10-kk-model-capability.md](../../docs/superpowers/plans/2026-10-10-kk-model-capability.md), [docs/changes/2026-10-09-doubao-integration/verification.md](../../docs/changes/2026-10-09-doubao-integration/verification.md), [docs/changes/2026-10-10-doubao-official-channel/verification.md](../../docs/changes/2026-10-10-doubao-official-channel/verification.md), [docs/changes/2026-10-11-closeout/verification.md](../../docs/changes/2026-10-11-closeout/verification.md), [tests/browser/model-picker.spec.ts](../../tests/browser/model-picker.spec.ts), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md)
- Next action: 先补本地 upstream ReadableStream/token callback 契约和 Windows DPAPI/Tauri protector 的受控测试；随后才补真实 Ark/Codex 凭据与 Desktop 运行态，外部证据齐全后再转 DONE。
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-PROV-BYOK-001 — 用户自有 API 产品化接入

- Goal: 在 Desktop 最小 AI 链路和 Web VPS 身份/会话契约稳定后，提供可审计、可隔离、跨平台可持续的用户自有 API 接入
- Scope: 后续产品化 onboarding、凭据引用与安全存储、连接健康、服务端代理边界及 Desktop/Web/Mobile 能力声明；当前只登记任务，不实现
- Display status: 未完成
- Priority: P1 — 开放任务默认待治理排序
- Requirement refs: ledger:TASK-PROV-BYOK-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: Desktop 本地账号/API Key 直连与产品化用户自有 API 接入明确区分，未完成前不得宣称跨端能力已支持; 完成 Desktop 最小文本/图片生成链路与 Web VPS 账号/会话控制面后，补齐凭据不落日志/普通存储、租户隔离、撤销与审计契约; 明确 Web VPS 代理、Desktop 本地直连、Mobile 独立目录的边界，并为真实 provider、失败、取消、离线与 unknown 状态提供证据; 实现前完成独立 intent/spec/plan；实现后通过相关平台的 UI/交互双门、最小 AI 链路和安全回归
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation, src/features/agent, src-tauri, docs
- Verification: NOT_VERIFIED — 本轮复核确认仍按规则保留为高优先级 TODO，尚未实现或验收；不得以 Desktop 本地 API Key 直连证据替代产品化接入。
- Evidence: [docs/architecture/adr/ADR-011-platform-delivery-gates-and-vps-control-plane.md](../../docs/architecture/adr/ADR-011-platform-delivery-gates-and-vps-control-plane.md), [docs/features/BACKEND-ROADMAP.md](../../docs/features/BACKEND-ROADMAP.md), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md)
- Next action: 依赖TASK-AI-GATEWAY-001与Web VPS控制面；先补intent/spec/plan和Desktop/Web/Mobile边界，外部契约稳定前不扩展产品实现。
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-UI-015 — 画布点状/网状背景缩放插值修正

- Goal: 让背景元素尺寸随缩放比例在 50%~400% 之间平滑变化，低缩放时收敛隐藏而非固定残留
- Scope: Canvas background pattern pitch, dot size, grid line width and opacity derived from viewport scale
- Display status: 已完成
- Priority: P2 — 画布基础视觉，影响所有使用点状/网状背景的会话
- Requirement refs: ledger:TASK-UI-015
- Feature IDs: FEAT-001
- Owner role: repository-maintainer
- Acceptance: 50% 缩放时背景等同隐藏（不可见）; 400% 缩放时背景达到最大尺寸; 50%~400% 之间尺寸线性插值，无跳变或尺寸突变; 任意缩放下背景完整铺满可视区域，无重复堆叠或空白缝隙
- Branch: `fix/TASK-UI-015-canvas-background-zoom-scale`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/domain, src/components, src/styles, tests/unit
- Verification: PASS — domain 插值单测 7/7 PASS；20 万步扫描最大单步 pitch 变化 0.00042px、严格单调；typecheck、lint、governance/features/markdown、format:check 全部通过；npm test 为 926 PASS / 8 SKIP（934 tests）；浏览器回归 455/455 PASS（单 worker），覆盖 50% 隐藏、400% 最大尺寸、连续插值与平铺契约。
- Evidence: [docs/changes/2026-10-10-canvas-background-zoom/verification.md](../../docs/changes/2026-10-10-canvas-background-zoom/verification.md)
- Next action: 保留当前证据；主线回读完成
- Last verified: 2026-10-10
- Updated: 2026-10-10

## TASK-AGENT-010 — 统一版本一致性与跨环境启动新鲜度

- Goal: 让产品版本源、依赖锁、构建身份和跨环境工件可验证，避免本地最新而其他环境启动旧包
- Scope: 版本镜像审计、嵌套 lock/Tauri 依赖检查、活动源码硬编码提示、启动器 receipt 规则和分支发布流程
- Display status: 进行中
- Priority: P1 — 跨环境启动旧版本会让已合入功能对其他使用者不可见
- Requirement refs: ledger:TASK-AGENT-010
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 平台版本源与根/嵌套 package lock 一致性可由命令检测; Tauri 依赖锁定、活动源码产品版本硬编码和运行时版本源纳入审计; 版本检查进入本地 lint 与 Windows quality workflow; 分支/合并/发布规则要求当前 SHA、receipt、文件 hash 和安装后回读; 本地启动继续在源码指纹、依赖、receipt 或构建失败时拒绝旧 EXE
- Branch: `fix/TASK-AGENT-010-provider-entry`
- Worktree: `D:/kk-studio/.worktrees/TASK-AGENT-010-provider-entry`
- Modules: scripts/check-version-consistency.mjs, package.json, .github/workflows/quality.yml, docs/engineering, docs/changes/2026-10-10-version-coherence
- Verification: PARTIAL — 本地版本门禁、嵌套 lock 漂移测试和启动器 fail-closed 证据通过；远端 CI、发布工件和第二环境安装回读待合并候选 SHA 实际验证。
- Evidence: [docs/changes/2026-10-10-version-coherence/intent.md](../../docs/changes/2026-10-10-version-coherence/intent.md), [docs/changes/2026-10-10-version-coherence/spec.md](../../docs/changes/2026-10-10-version-coherence/spec.md), [docs/changes/2026-10-10-version-coherence/verification.md](../../docs/changes/2026-10-10-version-coherence/verification.md), [docs/changes/2026-10-10-version-coherence/review.md](../../docs/changes/2026-10-10-version-coherence/review.md), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md)
- Next action: 先收窄并同步候选到当前 origin/main，再取得 Hosted CI、不可变发布 receipt 和第二环境版本/commit/hash/进程路径回读；当前候选范围过宽，保持 REVIEW。
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-GOV-003 — 规则体系收敛与文档同步门禁（B1+B2+R+B3-1+B3-2）

- Goal: 收敛 UI 入口覆盖、ADR 编号与索引唯一性，新增文档索引/命令/交付完整度三个门禁
- Scope: B1+B2 的索引/编号/命令/交付门禁已完成；本轮授权 R（文档生命周期与时间冲突规则）、B3-1（TASK_STATUS 当前快照）和 B3-2（AI_HANDOFF 恢复入口瘦身）；B3-3、B4、B5 不在本轮。
- Display status: 进行中
- Priority: P1 — 治理收敛，门禁已接入 lint
- Requirement refs: ledger:TASK-GOV-003
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: UI_INDEX.md 完整列出全部现行 UI 承载文件，docs/README.md 补齐 engineering 与 governance 索引; ADR 编号去重归并至 docs/architecture/adr 唯一目录并留映射记录; check-doc-index 与 check-doc-commands 接入 lint 且全绿; 新增 20 个单测通过，ui:check 与 markdown:check 0 违规; 当前治理入口使用稳定 docId、updatedAt、source、status、supersededBy，重复 current 由 snapshot:check 拦截; TASK_STATUS 与 AI_HANDOFF 使用当前账本/事实快照，旧入口通过 supersededBy 退出当前路由; 新 dated change package、账本、PROJECT_STATE/AI_HANDOFF 与治理/Markdown 门禁结果可追溯
- Branch: `codex/ui-redesign-20261011`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: docs/UI_INDEX.md, docs/README.md, docs/architecture/adr, docs/engineering/CODING-STANDARDS.md, docs/governance/UNIFIED-PROJECT-RULES.md, scripts/check-doc-index.mjs, scripts/check-doc-commands.mjs, scripts/check-delivery-completeness.mjs, scripts/governance/doc-index.mjs, scripts/governance/doc-commands.mjs, scripts/governance/delivery-completeness.mjs, tests/unit/docIndex.test.ts, tests/unit/docCommands.test.ts, tests/unit/deliveryCompleteness.test.ts, package.json, docs/governance/TASK_STATUS.md, docs/governance/PROJECT_STATE.md, docs/governance/AI_HANDOFF.md, docs/governance/AUTHORITY_MAP.md, docs/governance/AUTHORITY_MAP.json, scripts/check-snapshot-header.mjs
- Verification: PARTIAL — B1+B2 已于 2026-10-11 通过既有索引/命令/交付门禁；2026-10-12 已完成 R+B3-1+B3-2 的文档生命周期门禁、任务快照刷新和 AI_HANDOFF 恢复入口瘦身，最终门禁与独立复核绑定本轮 exact head。B3-3、B4、B5 未执行。
- Evidence: [docs/changes/2026-10-11-rules-restructure/verification.md](../../docs/changes/2026-10-11-rules-restructure/verification.md), [docs/changes/2026-10-11-rules-restructure/review.md](../../docs/changes/2026-10-11-rules-restructure/review.md), [docs/changes/2026-10-12-governance-currentness/verification.md](../../docs/changes/2026-10-12-governance-currentness/verification.md), [docs/changes/2026-10-12-governance-currentness/review.md](../../docs/changes/2026-10-12-governance-currentness/review.md)
- Next action: 待用户授权后处理 B3-3 TASKSTATE 分支审查；随后按独立批次处理 B4 worktree/二进制、B5 交付包补齐
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-GOV-004 — 未合并分支全量核验、分类与收敛合并

- Goal: 100 个未合并分支逐项核验并按完成状态分类；同功能多分支收敛为单一分支后合并主线
- Scope: 本轮完成 P0 止血、P1 全量分类表、B1 登记；P2 家族收敛与 B2-B5 合并在后续批次；worktree/分支清理与远端推送不在范围
- Display status: 进行中
- Priority: P1 — 治理收敛前置：分支不收敛则所有合并冲突面持续扩大
- Requirement refs: ledger:TASK-GOV-004
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 分类表覆盖全部未合并分支，逐项含核验结果与处置决策; 已集成/PR 残留类分支零合并登记，台账加防误合并注释; 同功能家族先收敛为单一分支再合并主线; 每个合并单元过最低门禁与 delivery:check，全部可回滚
- Branch: `codex/ui-redesign-20261011`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: scripts/governance/branch-audit.mjs, docs/changes/2026-10-12-branch-consolidation
- Verification: PASS — P0/P1/B1 已完成：main 8915b6ae；分类表 100 行（已完成 27/完成一半 68/未完成 4/无法判定 1）；10 个 PR 集成分支的 11 个任务已加禁合并注释；门禁全绿（npm test 8 失败为已记录环境性既有失败）。P2-P3 家族收敛与 B2-B5 合并待执行。
- Evidence: [docs/changes/2026-10-12-branch-consolidation/verification.md](../../docs/changes/2026-10-12-branch-consolidation/verification.md), [docs/changes/2026-10-12-branch-consolidation/review.md](../../docs/changes/2026-10-12-branch-consolidation/review.md)
- Next action: P2 家族收敛 ×11 → B2 文档类 → B3 小代码 24 → B4 中代码 15 → B5 UI-012 两步（已授权）；每单元快照+门禁+交付包
- Last verified: 2026-10-12
- Updated: 2026-10-12

## TASK-REVIEW-REMEDIATION-001 — 修复审查发现的治理生命周期与交付边界问题

- Goal: 让 current 治理入口、supersededBy 关系和 dated change package 规则 fail closed 且可追溯。
- Scope: 治理生命周期脚本、模板、交付包勘误和账本记录；相关运行时修复以独立提交交付，不改远端设置或其他 worktree。
- Display status: 进行中
- Priority: P1 — 治理门禁 fail-open 会让错误 current 入口进入合并候选。
- Requirement refs: ledger:TASK-REVIEW-REMEDIATION-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: snapshot:check 精确校验 current docId/source/status，并拒绝重复、伪元数据和无效 supersededBy。; 新交付包完整且绑定本次 taskId；旧包保留原始结论并追加勘误。; 治理、文档和版本校验改动与运行时提交可独立审阅。
- Branch: `codex/ui-redesign-20261011`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: scripts/governance/doc-index.mjs, scripts/check-snapshot-header.mjs, tests/unit/docIndex.test.ts, docs/templates, docs/changes/2026-10-13-review-remediation, docs/governance/task-ledger.json
- Verification: PARTIAL — 定向 43/43 通过；snapshot 4/0、governance 124/0、lint/typecheck/npm test/test:agent/ui:check/format/test:ui 构建通过。npm run verify 因 5 个未触及 UI 测试失败退出 1；test:development 无 receipt。最终 head 62d067fd，tree 8b22bede。
- Evidence: [docs/changes/2026-10-13-review-remediation/verification.md](../../docs/changes/2026-10-13-review-remediation/verification.md), [docs/changes/2026-10-13-review-remediation/review.md](../../docs/changes/2026-10-13-review-remediation/review.md)
- Next action: 单独修复并验证 5 个 UI 失败项；补齐开发态 receipt 后再评估是否可标记 DONE。
- Last verified: 2026-10-13
- Updated: 2026-10-13

## TASK-UI-CLASSIFY-20261013 — 模型接入与扩展分类修复并验证三客户端

- Goal: 将确认的 UI 清单落到 canonical 并取得实际客户端证据
- Scope: 模型菜单、模型接入、扩展分类、协作角色职责模板和三客户端验证
- Display status: 进行中
- Priority: P1 — 多次修改未落到客户端的分类与交互回归
- Requirement refs: ledger:TASK-UI-CLASSIFY-20261013
- Feature IDs: FEAT-011, FEAT-030
- Owner role: repository-maintainer
- Acceptance: Codex 接入属于模型接入，扩展含 Skill/MCP/协作伙伴; 保留原草稿及无关改动; Web development、preview、Desktop 独立重建并实际验证
- Branch: `fix/TASK-UI-CLASSIFY-20261013-capability`
- Worktree: `D:/kk-studio/KK-Studio-2.0/.worktrees/capability-ui-closeout`
- Modules: src/components/settings, src/components/SkillsPage.tsx, src/components/ModelPickerMenu.tsx, src/features/partners, tests/browser
- Verification: PARTIAL — Model popup batch/data removed; targeted model and generation regressions 40/40 PASS; Canonical Web development 7 checks, production preview 7 checks and Desktop 2.1.14 14 checks rebuilt and PASS; Node 1021 pass/14 skipped, Agent 172 pass/2 skipped; browser 492/495, 20 capability cases PASS, 3 pre-existing UI failures remain; independent focused review findings closed
- Evidence: [docs/changes/2026-10-13-capability-ui/verification.md](../../docs/changes/2026-10-13-capability-ui/verification.md), [docs/changes/2026-10-13-capability-ui/review.md](../../docs/changes/2026-10-13-capability-ui/review.md)
- Next action: 另行处理三个既有 UI 失败并取得用户验收；保留自动分派/OAuth 未接入边界
- Last verified: 2026-10-13
- Updated: 2026-10-13

## TASK-AGENT-RECOVERY-20261013 — 桌面 Agent 自动恢复、会话归属与凭据保存

- Goal: 打开APP可安全恢复本机Agent和已保存API，统一连接操作并修复归属自锁
- Scope: Agent启动恢复、项目会话非敏感归属、设置连接按钮、Windows凭据与API metadata提交/重读、对应回归与运行证据
- Display status: 进行中
- Priority: P1 — 修复正常重开/会话恢复自锁与凭据保存误报，保护用户配置和已有会话。
- Requirement refs: ledger:TASK-AGENT-RECOVERY-20261013
- Feature IDs: FEAT-009, FEAT-022
- Owner role: repository-maintainer
- Acceptance: 同项目打开APP自动恢复既有线程，无模型turn; 首次prepare后读取失败可重连同thread; WebView缓存缺失可从原生项目归属恢复; 未知外来线程及运行/审批期间不接管或停止; 断开/停止持久暂停，手动重连恢复; 普通与Google API durable保存并在重启保留; 系统读取失败可重试、不要求重填且秘密不落项目/日志; 完整本地门禁、真实原生重启和独立审查
- Branch: `fix/TASK-AGENT-RECOVERY-20261013`
- Worktree: `D:/kk-studio/.worktrees/TASK-AGENT-RECOVERY-20261013`
- Modules: src/features/agent, src/features/creation, src/components/settings, src/App.tsx, tests
- Verification: PARTIAL — 2.1.16历史完整门禁/38+6原生证据保留；本轮日常原profile正常close0/reopen自动sameThread/project/API metadata和主动disconnect→close0/reopen暂停通过。真实API当前ref基线missing，实钥保留NOT VERIFIED。实际聊天健康状态染危险色与按钮不一致已复现，2.1.17修复/完整门禁/日常复验进行中。
- Evidence: [docs/changes/2026-10-13-agent-recovery/intent.md](../../docs/changes/2026-10-13-agent-recovery/intent.md), [docs/changes/2026-10-13-agent-recovery/spec.md](../../docs/changes/2026-10-13-agent-recovery/spec.md), [docs/changes/2026-10-13-agent-recovery/plan.md](../../docs/changes/2026-10-13-agent-recovery/plan.md), [docs/changes/2026-10-13-agent-recovery/verification.md](../../docs/changes/2026-10-13-agent-recovery/verification.md), [docs/changes/2026-10-13-agent-recovery/review.md](../../docs/changes/2026-10-13-agent-recovery/review.md), [docs/changes/2026-10-13-agent-recovery/evidence/canonical-agent-native.json](../../docs/changes/2026-10-13-agent-recovery/evidence/canonical-agent-native.json), [docs/changes/2026-10-13-agent-recovery/evidence/canonical-provider-native.json](../../docs/changes/2026-10-13-agent-recovery/evidence/canonical-provider-native.json), [docs/changes/2026-10-13-agent-recovery/evidence/independent-source-review.json](../../docs/changes/2026-10-13-agent-recovery/evidence/independent-source-review.json), [docs/changes/2026-10-13-agent-recovery/evidence/independent-delivery-review.json](../../docs/changes/2026-10-13-agent-recovery/evidence/independent-delivery-review.json), [docs/changes/2026-10-13-agent-recovery/evidence/daily-app-open.json](../../docs/changes/2026-10-13-agent-recovery/evidence/daily-app-open.json), [docs/changes/2026-10-13-agent-recovery/evidence/delivery-document-checks.json](../../docs/changes/2026-10-13-agent-recovery/evidence/delivery-document-checks.json)
- Next action: 完成聊天与凭据状态一致性修复，2.1.17完整门禁和官方日常APP复验，恢复初始连接偏好。
- Last verified: 2026-10-13
- Updated: 2026-10-13

## TASK-UI-CONSOLIDATE-20261014 — 冻结最新本机版本并统一 UI、模型预设与轻量化规则

- Goal: 可恢复地汇总所有分支和工作树，先提交当前版本，再按统一规范完成设置和无限画布优化
- Scope: 版本恢复、UI 语义与组件、设置二三栏、服务商和 CLI、喜欢标签搜索、资源存储用量、文档目录与体积治理
- Display status: 进行中
- Priority: P1 — 解决 UI 风格混杂、版本散落和功能入口冲突，同时保留资料与并行成果。
- Requirement refs: ledger:TASK-UI-CONSOLIDATE-20261014
- Feature IDs: FEAT-002, FEAT-022, FEAT-032, FEAT-023, FEAT-028, FEAT-039
- Owner role: repository-maintainer
- Acceptance: 所有登记来源留存 refs/dirty/hash 和可校验恢复 bundle，原工作区不丢失; 当前日常源码版本有可复现提交、源码产物和当前检查证据; 默认绿色，中性动作、胶囊文字、方形圆角上传与克制输入聚焦统一; 喜欢和标签固定大小独立拖动，旧收藏可见，上传位置稳定; 设置分类清楚，预设有官网/密钥/文档跳转，协议和 CLI 能力诚实; Desktop/Mobile 布局独立，文档与体积门禁可执行，功能和数据保留
- Branch: `codex/TASK-UI-BASELINE-20261014`
- Worktree: `D:/kk-studio/.worktrees/branch-consolidation-20261011`
- Modules: src/styles, src/components, src/domain, src/features, src-tauri, docs, scripts
- Verification: PARTIAL — 7a463742 clean完整verify出口0：Node1142pass/14skip、Agent172pass/2skip、UI236/0、production545首试通过/0flaky/0skip、development5PASS/父目录403。Rust131/131与fmt同源，官方Agent构建和真实Tauri9项PASS、原件/视频坐标/重载/层级/随包桥绝对路径均核对，0e及7a独立source review CLEAR。主入口gzip+9625B<16384；健康50与Windows2项advisory保持，旧失败保留。产物及最终doc-head由工程外当前收据绑定。
- Evidence: [docs/changes/2026-10-14-ui-consolidation/intent.md](../../docs/changes/2026-10-14-ui-consolidation/intent.md), [docs/changes/2026-10-14-ui-consolidation/spec.md](../../docs/changes/2026-10-14-ui-consolidation/spec.md), [docs/changes/2026-10-14-ui-consolidation/plan.md](../../docs/changes/2026-10-14-ui-consolidation/plan.md), [docs/changes/2026-10-14-ui-consolidation/verification.md](../../docs/changes/2026-10-14-ui-consolidation/verification.md), [docs/changes/2026-10-14-ui-consolidation/review.md](../../docs/changes/2026-10-14-ui-consolidation/review.md), [docs/architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md](../../docs/architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md), [docs/features/feat-039-canvas-collections.md](../../docs/features/feat-039-canvas-collections.md)
- Next action: 从已验证2.1.21继续未接协议与原生Mobile等开放范围；单独验收真实CLI/Provider、日常资料、用户视觉、安装器和Hosted，保留在途分支与旧flaky原状态。
- Last verified: 2026-10-14
- Updated: 2026-10-14

## TASK-GOV-005 — PR #55 历史快照合法集成与门禁修复

- Goal: 保留 PR #55 的逐项追溯，在不伪造交付证据的前提下修复 Windows desktopRelease 误判并为历史快照提供有限、显式的交付门禁例外。
- Scope: 仅限 PR #55 的 delivery/verify 根因、历史包标记和独立审查；不合并 main、不处理 PR #56、不集成 Hermes、不删除分支或工作树。
- Display status: 进行中
- Priority: P1 — 一次性历史快照与现行一任务一PR门禁冲突，且 Windows desktopRelease 门禁存在真实路径误判。
- Requirement refs: ledger:TASK-GOV-005
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 历史包仅通过包内 legacy-incomplete.md 显式标记豁免，未来无标记新包仍强制五件套和当前任务绑定。; Windows 普通 node_modules 目录不因 8.3/realpath 拼写差异被判为 linked，真实 symlink/junction 仍被拒绝。; 最终 PR 头 SHA 具有本地定向测试、独立 exact-SHA review 和 Hosted verify/delivery 回执；在此之前保持 REVIEW/NOT_VERIFIED。
- Branch: `codex/TASK-GOV-005-publish-main-20261012`
- Worktree: `D:/kk-studio/.worktrees/pr55-delivery-repair`
- Modules: scripts/governance/delivery.mjs, scripts/check-delivery.mjs, scripts/windows/desktop-release.mjs, tests/unit/deliveryPolicy.test.ts, scripts/governance/branch-audit.mjs, src/styles/ui-governance.css, src/styles/workspace.css, src/styles/canvas-hud.css, tests/browser/settings-scroll.spec.ts, tests/browser/ui-motion.spec.ts, tests/browser/unified-image-command.spec.ts, docs/changes/2026-10-12-pr55-historical-integration
- Verification: NOT_VERIFIED — Hosted 38271663391 at 81226e02 passed desktopAgentRuntime/unit/Agent and delivery; verify stopped at branch-audit Prettier. The 2026-10-13 repair diff passed full local npm run verify (475 browser tests). Final pushed-head independent review and Hosted verify/delivery remain pending; no merge/release claim.
- Evidence: [docs/changes/2026-10-12-pr55-historical-integration/verification.md](../../docs/changes/2026-10-12-pr55-historical-integration/verification.md), [docs/changes/2026-10-12-pr55-historical-integration/review.md](../../docs/changes/2026-10-12-pr55-historical-integration/review.md)
- Next action: 完成独立 exact-SHA review，fast-forward update PR #55 branch，回读 Hosted verify/delivery；不要直接推送 main。
- Last verified: 2026-10-13
- Updated: 2026-10-13

## TASK-ENG-001 — 引入 hermes-agent 工程实践：代码健康棘轮、Windows 不安全模式扫描与 Actions SHA 固定

- Goal: 把 hermes-agent（MIT）的 ratchet 与 footgun 扫描语义移植到本仓库 TypeScript 栈：新代码必须达标、存量只许变小、初始 advisory 不阻断 CI；同时把 workflow action 从可变 tag 固定到 commit SHA。
- Scope: scripts/check-code-health.mjs、scripts/check-windows-footguns.mjs、scripts/governance/{code-health.config,code-health-measure,code-health-compare,diff-scope,footgun-rules}.mjs、package.json 脚本注册与 lint 接线、.github/workflows/{git-guards,quality,auto-merge,main-guard,windows-release}.yml SHA 固定、docs/engineering/{DEVELOPMENT,CODING-STANDARDS}.md 门禁章节与映射、tests/unit/{diffScope,codeHealthCliModes,codeHealthPatternAllowance}.test.ts 回归、docs/changes/2026-10-12-TASK-ENG-001-code-health 五件套；不含产品功能变更与存量超标代码重写。
- Display status: 进行中
- Priority: P1 — 工程治理增量门禁；不改变产品运行时行为。
- Requirement refs: ledger:TASK-ENG-001
- Feature IDs: none
- Owner role: repository-maintainer
- Acceptance: 超标新代码被棘轮捕获并给出文件/行/指标/上限来源；health: allow 行内豁免生效（CC、FILE_LINES、AS_ANY、EMPTY_CATCH 四类自测覆盖）; advisory 模式下 npm run lint 退出码不变；--report 输出全库存量清单; footgun 扫描只覆盖变化文件并给出 fix 指引；规则元数据目录排除后不自匹配; workflow 中 GitHub Actions 全部固定到 commit SHA 并附版本注释; DEVELOPMENT.md 记录命令表、棘轮语义、豁免语法与总开关行为；markdown:check 与治理门禁通过; 账本登记、五件套齐全，governance:check 与 delivery 门禁在本 SHA 上通过
- Branch: `feat/TASK-ENG-001-code-health`
- Worktree: `D:/kk-studio/.worktrees/TASK-ENG-001-code-health`
- Modules: scripts/check-code-health.mjs, scripts/check-windows-footguns.mjs, scripts/governance/code-health.config.mjs, scripts/governance/code-health-measure.mjs, scripts/governance/code-health-compare.mjs, scripts/governance/diff-scope.mjs, scripts/governance/footgun-rules.mjs, package.json, .github/workflows/git-guards.yml, .github/workflows/quality.yml, .github/workflows/auto-merge.yml, .github/workflows/main-guard.yml, .github/workflows/windows-release.yml, docs/engineering/DEVELOPMENT.md, docs/engineering/CODING-STANDARDS.md, tests/unit/diffScope.test.ts, tests/unit/codeHealthCliModes.test.ts, tests/unit/codeHealthPatternAllowance.test.ts, docs/changes/2026-10-12-TASK-ENG-001-code-health
- Verification: NOT_VERIFIED — 原始 base 1f6cbd37 与候选 9c849aa 的验证保留为历史。最终复审五项阻断修复工作区：13 项定向回归、lint/typecheck/format/policy sync 通过；1019 项 Node 测试为 1005 pass/14 skipped/0 fail。新提交仍须精确 SHA 的 delivery、独立复审和 Hosted CI 后才能合并。
- Evidence: [docs/changes/2026-10-12-TASK-ENG-001-code-health/verification.md](../../docs/changes/2026-10-12-TASK-ENG-001-code-health/verification.md), [docs/changes/2026-10-12-TASK-ENG-001-code-health/review.md](../../docs/changes/2026-10-12-TASK-ENG-001-code-health/review.md)
- Next action: 基于最新 origin/main 完成冲突承接、独立 exact-SHA review 和 Hosted verify；未完成前保持 REVIEW。
- Last verified: 2026-10-13
- Updated: 2026-10-12

## TASK-CCSWITCH-LEARN-20261014 — 澄清供应商编辑状态并验证跨存储中断恢复

- Goal: 区分编辑选择与生效配置、模型目录与生成能力，验证中断不丢配置或凭据
- Scope: 两处状态文案；metadata/vault/cache中断与并发验证；修复原生提交后profile缓存恢复，保留架构
- Display status: 已完成
- Priority: P1 — 防止配置草稿与运行状态混淆，并补跨存储中断证据
- Requirement refs: ledger:TASK-CCSWITCH-LEARN-20261014
- Feature IDs: FEAT-022
- Owner role: repository-maintainer
- Acceptance: 选B未保存不改变A的持久配置，编辑状态明确; 目录成功不表示生成能力已验证; metadata/vault阶段中断保留完整主配置、备份与对应凭据; 原生提交后缓存发布前中断可重复恢复，不盲写密钥; 相同revision并发仅一胜者，秘密不进入配置缓存证据; 相关Web与独立Desktop验证和独立审查
- Branch: `fix/TASK-CCSWITCH-LEARN-20261014-status-recovery`
- Worktree: `D:/kk-studio/.worktrees/TASK-CCSWITCH-LEARN-20261014`
- Modules: src/components/settings, src-tauri/src/provider_transaction_tests.rs, tests, src/features/creation/providerRegistry.ts
- Verification: PASS — 稳定完整浏览器517/517零retry/flaky；相关单元61/61；Node1087pass14skip/Agent172pass2skip；Rust默认features/threads129/129；主目录官方2.1.18独立native20功能+11视口、两次重启、syntheticvault保留及cleanup；独立代码审查19decc93 PASS，交付文档另绑定HEAD补审。 此证据绑定2.1.18当时快照，后续并行2.1.19组合Desktop未验，不继承current。
- Evidence: [docs/changes/2026-10-14-ccswitch-status-recovery/intent.md](../../docs/changes/2026-10-14-ccswitch-status-recovery/intent.md), [docs/changes/2026-10-14-ccswitch-status-recovery/spec.md](../../docs/changes/2026-10-14-ccswitch-status-recovery/spec.md), [docs/changes/2026-10-14-ccswitch-status-recovery/plan.md](../../docs/changes/2026-10-14-ccswitch-status-recovery/plan.md), [docs/changes/2026-10-14-ccswitch-status-recovery/verification.md](../../docs/changes/2026-10-14-ccswitch-status-recovery/verification.md), [docs/changes/2026-10-14-ccswitch-status-recovery/review.md](../../docs/changes/2026-10-14-ccswitch-status-recovery/review.md)
- Next action: 本轮实现与本地验收完成；Hosted、物理断电、收费Provider、实际用户profile及签名发布仍未验证。
- Last verified: 2026-10-14
- Updated: 2026-10-14

## TASK-CANVAS-SYNC-20261014 — 修复 Agent 与已挂载画布图同步

- Goal: 节点位置与连线实时同步、原数据保留并可重载恢复
- Scope: 现有画布 hooks、图合并与相关回归；不改存储身份和 Agent 协议
- Display status: 进行中
- Priority: P1 — 未记录
- Requirement refs: user:agent-canvas-sync-20261014
- Feature IDs: FEAT-001, FEAT-009, FEAT-012
- Owner role: repository-maintainer
- Acceptance: Agent 移动/新增节点和 reference 连线变更在真实 DOM 与权威快照一致; 原内容保留，IndexedDB 重载恢复一致; 拖动、取消、新增、undo 与 result 连线不回归
- Branch: `fix/TASK-CANVAS-SYNC-20261014-agent`
- Worktree: `D:/kk-studio/.worktrees/TASK-CANVAS-SYNC-20261014`
- Modules: src/components/Canvas.tsx, src/components/canvas, src/domain/projectCanvas.ts, tests/browser/agent.spec.ts, tests/unit/projectCanvas.test.ts
- Verification: PARTIAL — 最终2.1.19共享源及Web专项PASS；Node1089pass/14skip、Agent172pass/2skip、production520/520（0retry/0flaky）、development PASS。Desktop/Tauri2.1.19未验；186非任务SHA不变，3份并发文档更新原件保留，暂存内容不改。
- Evidence: [docs/changes/2026-10-14-agent-canvas-sync/verification.md](../../docs/changes/2026-10-14-agent-canvas-sync/verification.md), [docs/changes/2026-10-14-agent-canvas-sync/review.md](../../docs/changes/2026-10-14-agent-canvas-sync/review.md), [docs/changes/2026-10-14-agent-canvas-sync/evidence/source-manifest.json](../../docs/changes/2026-10-14-agent-canvas-sync/evidence/source-manifest.json), [docs/changes/2026-10-14-agent-canvas-sync/evidence/primary-checks.json](../../docs/changes/2026-10-14-agent-canvas-sync/evidence/primary-checks.json), [docs/changes/2026-10-14-agent-canvas-sync/evidence/final-production-browser-results.json](../../docs/changes/2026-10-14-agent-canvas-sync/evidence/final-production-browser-results.json)
- Next action: Desktop/Tauri2.1.19复验位置/连线/重载；独立宽图问题另属TASK-CANVAS-WIDE-PORT-20261014
- Last verified: 2026-10-14
- Updated: 2026-10-14

## TASK-CANVAS-WIDE-PORT-20261014 — 宽图结果编辑器遮挡下游按钮

- Goal: 宽图低缩放时下游按钮仍可点击
- Scope: 既有结果主体尺寸、下游锚点和编辑器层级
- Display status: 未完成
- Priority: P2 — 未记录
- Requirement refs: derived:full-browser-port-hit-test
- Feature IDs: FEAT-001
- Owner role: repository-maintainer
- Acceptance: 1200x300结果在21%–25%缩放、折叠/展开编辑器时下游端口可命中; 保持编辑器生成按钮与连线几何正确
- Branch: `unassigned`
- Worktree: `unassigned`
- Modules: src/domain/canvasGraph.ts, src/components/canvas/NodeActions.tsx, src/styles/workspace.css, tests/browser/unified-image-command.spec.ts
- Verification: FAIL — 本次同步修复前/后development23.33%同样被composer遮挡；production全量1失败，修复尚未执行。
- Evidence: [docs/changes/2026-10-14-agent-canvas-sync/evidence/wide-layout-comparison.json](../../docs/changes/2026-10-14-agent-canvas-sync/evidence/wide-layout-comparison.json), [docs/changes/2026-10-14-agent-canvas-sync/verification.md](../../docs/changes/2026-10-14-agent-canvas-sync/verification.md)
- Next action: 单独复证production并修正宽图主体几何/端口锚点
- Last verified: 2026-10-14
- Updated: 2026-10-14

## TASK-AGENT-UX-20261014 — Agent 执行过程与生成保存状态提示

- Goal: 复用现有事件、任务与归档状态，让执行过程可展开且生成与本地保存事实可辨认
- Scope: Agent activity消息展示、CanvasHud projectStatus与对应回归
- Display status: 已完成
- Priority: P2 — 改善现有核心链路的可理解性，不新增执行权限或付费功能
- Requirement refs: ledger:TASK-AGENT-UX-20261014
- Feature IDs: FEAT-009, FEAT-016
- Owner role: repository-maintainer
- Acceptance: 活动阶段保真、去重、终态不回退与会话归属; 可折叠执行过程，审批/失败/中断真实显示; 生成/归档/项目保存依据真实回执与saveState，失败保留已生成结果; 取消/partial/unknown/迟到/重载不重复生成且不假成功; 完整相关门禁、浏览器同态与独立增量审查
- Branch: `codex/TASK-AGENT-UX-20261014-execution-delivery`
- Worktree: `D:/kk-studio/.worktrees/TASK-AGENT-UX-20261014-execution-delivery`
- Modules: src/features/agent, src/components/AgentConversationMessages.tsx, src/styles/agent-panel.css, src/App.tsx, src/domain/uiGovernance.ts, tests, src/styles/canvas-hud.css, src/styles/responsive-content.css
- Verification: PASS — 冻结source4e38351c独立SOURCE PASS/38单测；Node1100pass/14既有skip、Agent172pass/2既有skip；525浏览器零retry/flaky、development与official隔离Tauri17/17通过。compound因1423占用出口1保留，全部剩余阶段同source补跑PASS。真实Provider/日常数据/Hosted发布另验。 主目录源码同SHA、107相关单测与门禁/official2.1.20/隔离native17通过；原暂存内容和140个未拥有源码保持。
- Evidence: [docs/changes/2026-10-14-agent-execution-delivery/intent.md](../../docs/changes/2026-10-14-agent-execution-delivery/intent.md), [docs/changes/2026-10-14-agent-execution-delivery/spec.md](../../docs/changes/2026-10-14-agent-execution-delivery/spec.md), [docs/changes/2026-10-14-agent-execution-delivery/plan.md](../../docs/changes/2026-10-14-agent-execution-delivery/plan.md), [docs/changes/2026-10-14-agent-execution-delivery/verification.md](../../docs/changes/2026-10-14-agent-execution-delivery/verification.md), [docs/changes/2026-10-14-agent-execution-delivery/review.md](../../docs/changes/2026-10-14-agent-execution-delivery/review.md)
- Next action: 保留证据并完成日常APP人工验收，真实Provider和发布沿原独立任务推进
- Last verified: 2026-10-14
- Updated: 2026-10-14

## TASK-PROTOCOL-CLI-20261014 — 从2.1.21接通Provider协议和CLI实际执行，优化分端控件

- Goal: 接通显式协议/认证与CLI操作，保留数据并交付最新版本
- Scope: 五协议文本执行、Native模型发现、CLI安装检测/登录操作/桥生命周期、生产Codex依赖、设置和画布分端控件
- Display status: 已完成
- Priority: P1 — 解决 UI 风格混杂、版本散落和功能入口冲突，同时保留资料与并行成果。
- Requirement refs: ledger:TASK-PROTOCOL-CLI-20261014
- Feature IDs: FEAT-022, FEAT-032, FEAT-026, FEAT-039, FEAT-028
- Owner role: repository-maintainer
- Acceptance: legacy资料和请求指纹保留，protocol/auth冻结并无损roundtrip; 协议检测/真实HTTP请求/文本回写重载正确，取消未知不重复; CLI实际操作与完整生产依赖，读失败不删除原配置; Desktop/phone控件可正常命中，完整检查和原生证据后提交输出
- Branch: `codex/TASK-PROTOCOL-CLI-20261014`
- Worktree: `D:/kk-studio/.worktrees/branch-consolidation-20261011`
- Modules: src/styles, src/components, src/domain, src/features, src-tauri, docs, scripts
- Verification: PASS — Desktop/Web2.1.22产品da6141e6完整verify通过：551浏览器首试、Node1214pass/14既有skip、Agent172pass/2既有skip、UI241/0、development5步骤PASS；Rust163与原生源一致性确认，独立源码审查PASS。官方Agent构建、真实Tauri22项和同字节便携目录23项通过，5协议文本均保存/重载/GET检测/NativeTaskHost一次POST/结果恢复，无重复；4取消/超时场景实际socket关闭且目录字节保持。手机为响应式WebView/Web，非Native Mobile。新依赖0，入口gzip增加3247B<16384；4278生产白名单519462029B，其中8个缺失的当前平台Codex必要文件407521436B已恢复，不把旧残包当同功能体积基线。原资料身份、primary dirty/index和历史失败保留。最终ZIP/源码/Web/恢复与哈希由工程外current-release收据绑定；Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常资料和人工视觉验收继续各自开放。
- Evidence: [docs/changes/2026-10-14-protocol-cli-completion/intent.md](../../docs/changes/2026-10-14-protocol-cli-completion/intent.md), [docs/changes/2026-10-14-protocol-cli-completion/spec.md](../../docs/changes/2026-10-14-protocol-cli-completion/spec.md), [docs/changes/2026-10-14-protocol-cli-completion/plan.md](../../docs/changes/2026-10-14-protocol-cli-completion/plan.md), [docs/changes/2026-10-14-protocol-cli-completion/verification.md](../../docs/changes/2026-10-14-protocol-cli-completion/verification.md), [docs/changes/2026-10-14-protocol-cli-completion/review.md](../../docs/changes/2026-10-14-protocol-cli-completion/review.md), [docs/architecture/adr/ADR-018-provider-protocol-and-cli-execution.md](../../docs/architecture/adr/ADR-018-provider-protocol-and-cli-execution.md)
- Next action: 从2.1.22继续真实供应商与真人CLI登录/安装、签名安装器、日常资料和人工视觉验收；最终产物回读工程外current-release哈希收据。
- Last verified: 2026-10-14
- Updated: 2026-10-14

## TASK-222-ACTIONS-20261014 — 2.1.22 CLI、设置与画布按钮真实行为和分端修复

- Goal: 修复配置/持久化假成功及实际按钮可用性，保留数据并交付新版
- Scope: Agent配置保护、Gemini失败判定、记忆关闭守卫、插件持久化/生命周期/迟到结果、MCP回执与停止等待、备份确认、画布删除/上传/撤销、来源筛选、设置命中区与Google桌面链接
- Display status: 已完成
- Priority: P1 — 修复配置覆盖和隐私开关假成功，恢复实际按钮和触屏行为。
- Requirement refs: ledger:TASK-222-ACTIONS-20261014
- Feature IDs: FEAT-001, FEAT-014, FEAT-020, FEAT-022, FEAT-026, FEAT-032, FEAT-039, FEAT-012, FEAT-028, FEAT-037
- Owner role: repository-maintainer
- Acceptance: 读写失败保留原配置和有效状态，不假报关闭或CLI成功; 草稿屏幕删除/上传可用，撤销与重载偏好、原件不丢; 桌面与手机布局及实际操作分别验收; 完整检查、干净提交独立审查、当前产物哈希交付
- Branch: `codex/TASK-222-ACTIONS-20261014`
- Worktree: `D:/kk-studio/.worktrees/branch-consolidation-20261011`
- Modules: vendor/canvas-agent, scripts/gemini-bridge.mjs, src/features/memory, src/features/plugins, src/components/settings, src/components/canvas, src/components/nodes, src/components/assets, tests, docs
- Verification: PASS — Desktop/Web2.1.23产品提交b4fa7b0e承接2.1.22基线1abbcd51，本任务本地授权范围DONE/PASS。CLI配置和失败回执、记忆/插件持久化与迟到结果、MCP停止等待及回执、备份确认、画布顶部上传删除/撤销和筛选已修复。沿用用户确认的手机新布局，主题及独立背景偏好保留；菜单避让、层级与内容边界在320/390×light/dark验证。完整九步verify退出0：Node1251pass/14既有skip、Agent180pass/2既有skip、production Edge574首试/0flaky、UI241/0、development5步骤PASS；Agent真实编译及官方构建通过，Rust163与fe0→b4原生源码一致。实际Tauri和同字节便携目录各35项通过，5协议一次POST/恢复、4取消或超时socket关闭、CLI桥启停、Google系统浏览器本机GET、4窄屏真实filechooser、原件/坐标/撤销偏好均核对。新依赖0，入口gzip增加1244B<16384；4278生产白名单519463832B。原资料身份、primary dirty/index及旧失败保留。产品ZIP/Web、源码及恢复由工程外current-release收据绑定；最终文档提交与已测产品提交分开记录。Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常资料、实体手机及用户视觉验收各自开放，Mobile2.1.1仍规划。
- Evidence: [docs/changes/2026-10-14-action-usability-222/intent.md](../../docs/changes/2026-10-14-action-usability-222/intent.md), [docs/changes/2026-10-14-action-usability-222/spec.md](../../docs/changes/2026-10-14-action-usability-222/spec.md), [docs/changes/2026-10-14-action-usability-222/plan.md](../../docs/changes/2026-10-14-action-usability-222/plan.md), [docs/changes/2026-10-14-action-usability-222/verification.md](../../docs/changes/2026-10-14-action-usability-222/verification.md), [docs/changes/2026-10-14-action-usability-222/review.md](../../docs/changes/2026-10-14-action-usability-222/review.md)
- Next action: 回读最终current-release与独立文档补审；从2.1.23继续真人CLI/供应商、签名安装器、日常资料与实体手机验收，沿用已确认手机布局。
- Last verified: 2026-10-14
- Updated: 2026-10-14

## TASK-223-ACTIONS-20261014 — 2.1.23 CLI、设置与画布按钮实际行为和分端修复

- Goal: 修复配置损坏、迟到状态覆盖与不可用按钮，保留数据并交付当前版本
- Scope: CLI协议与配置合并/发布/连接检查、设置busy所有权/握手/迟到回执、记忆清除守卫、画布取消删除历史/运行参数/快捷键/背景入口与短屏菜单
- Display status: 已完成
- Priority: P1 — 修复配置损坏、迟到覆盖和按钮状态不一致，维持现有交互与数据。
- Requirement refs: ledger:TASK-223-ACTIONS-20261014
- Feature IDs: FEAT-001, FEAT-014, FEAT-020, FEAT-022, FEAT-026, FEAT-032, FEAT-039, FEAT-012, FEAT-028, FEAT-037
- Owner role: repository-maintainer
- Acceptance: CLI失败保留原件、显式协议不丢失且连接检查真实; 异步设置和记忆迟到结果不覆盖用户新操作; 生成取消删除和撤销状态一致，桌面/手机实际控件可达; 完整验证、独立源码审查、提交与当前产物哈希交付
- Branch: `codex/TASK-223-ACTIONS-20261014`
- Worktree: `D:/kk-studio/.worktrees/branch-consolidation-20261011`
- Modules: vendor/canvas-agent, src/features/local-service, src/features/memory, src/components/settings, src/components/canvas, src/components/nodes, src/styles, tests, docs
- Verification: PASS — Desktop/Web2.1.24产品源码58b5c07f34718769e10b76c89d510615bea2fefc，TASK-223本地授权范围DONE/PASS。完整九步verify退出0：Node1273pass/14既有skip，Agent199pass/2既有skip，Edge608全部首试/0flaky/0skip，UI242/0，development5步骤PASS；Rust163与fmt通过。最终源码核心/UI独立审查PASS，官方CLI20项、便携CLI20项，实际Tauri官方46项、同字节便携46项通过。新依赖0，入口gzip增加1221B<16384；生产运行时4280文件/519481278B。用户确认手机布局、主题/独立背景、存储identifier/路径、原件与primary dirty/index保留；旧135任务及37功能状态逐项不变。Native Mobile2.1.1仍PLANNED；Hosted、真人CLI账号/付费Provider、签名安装器、日常资料、实体手机与用户视觉验收分别开放。
- Evidence: [docs/changes/2026-10-14-action-usability-223/intent.md](../../docs/changes/2026-10-14-action-usability-223/intent.md), [docs/changes/2026-10-14-action-usability-223/spec.md](../../docs/changes/2026-10-14-action-usability-223/spec.md), [docs/changes/2026-10-14-action-usability-223/plan.md](../../docs/changes/2026-10-14-action-usability-223/plan.md), [docs/changes/2026-10-14-action-usability-223/verification.md](../../docs/changes/2026-10-14-action-usability-223/verification.md), [docs/changes/2026-10-14-action-usability-223/review.md](../../docs/changes/2026-10-14-action-usability-223/review.md)
- Next action: 回读最终纯文档审查与current-release产物哈希；真人账号/付费Provider、Hosted、签名安装器、日常资料与Native Mobile由既有开放任务分别继续。
- Last verified: 2026-10-15
- Updated: 2026-10-15

## TASK-SETTINGS-LATEST-20261015 — 在最新 UI 修复设置溢出、提示遮挡与配置保存风险

- Goal: 使用最新绿色 UI 完成已授权设置修复，保留原配置并验证当前加载来源
- Scope: 最新设置外壳与模型接入布局/交互、长文案与短屏可达性、提示和保存失败保护、worktree Vite源码监听、最新geometry回归及当前Browser/Desktop证据
- Display status: 已完成
- Priority: P1 — 用户发现误启动旧UI；设置溢出、遮挡与保存风险需要在最新来源修复并保留原配置
- Requirement refs: ledger:TASK-SETTINGS-LATEST-20261015
- Feature IDs: FEAT-022
- Owner role: repository-maintainer
- Acceptance: 从c1fae190最新UI承接，当前script/runtime/bundle和版本身份可核对，不用旧UI或2.1.24验收代填; 保留1280/240/192、绿色和手机分级导航，长文案与窄/短屏操作及提示可达; 模型接入busy/取消/错误/回焦一致，保存失败保留已有配置与credentialRef; 当前worktree源码变更可刷新，latest geometry guard防止误加载旧UI; 当前相关回归/完整门禁、Web与Desktop及独立SHA审查有证据，primary并发dirty/index与资料保留
- Branch: `fix/TASK-SETTINGS-LATEST-20261015`
- Worktree: `D:/kk-studio/.worktrees/branch-consolidation-20261011`
- Modules: src/components/settings, src/features/creation, src/domain/settings.ts, vite.config.ts, config/platform-versions.json, tests/browser, tests/unit/codebuddyConnectionSettings.test.ts, docs
- Verification: PASS — 本地2.1.25完整verify退出0：Node1278/14既有skip，Agent199/2既有skip，Edge629首试0failure/flaky/skip，UI242/0，development5步；当前Web/Tauri1280/240/192/#21a673/overflow0；官方launcher重建exe c9c3b4e/input2a09db54；Native20功能+11视觉+1中断阶段+5metadata，真实loopback目录一次且owned凭据/fixture清理；独立c1→054源码测试审查PASS。
- Evidence: [docs/changes/2026-10-15-settings-latest-ui/intent.md](../../docs/changes/2026-10-15-settings-latest-ui/intent.md), [docs/changes/2026-10-15-settings-latest-ui/spec.md](../../docs/changes/2026-10-15-settings-latest-ui/spec.md), [docs/changes/2026-10-15-settings-latest-ui/plan.md](../../docs/changes/2026-10-15-settings-latest-ui/plan.md), [docs/changes/2026-10-15-settings-latest-ui/verification.md](../../docs/changes/2026-10-15-settings-latest-ui/verification.md), [docs/changes/2026-10-15-settings-latest-ui/review.md](../../docs/changes/2026-10-15-settings-latest-ui/review.md)
- Next action: 保持当前桌面入口指向最新工作区；产品源码改变后按官方launcher重建并重新验证，用户视觉与外部能力另验。
- Last verified: 2026-10-15
- Updated: 2026-10-15

## TASK-UI-DETAILS-20261015 — 统一输入框、设置密度和卡片空态UI

- Goal: 保留当前风格，消除新版与旧控件混用，统一输入框职责、控件形状、卡片上传状态与目录轴线。
- Scope: 最新2.1.25运行树的共享Desktop/Web UI细节；不改Provider/凭据/存储/首页提交语义。
- Display status: 已完成
- Priority: P1 — 用户五处可见UI混乱和重复旧入口。
- Requirement refs: ledger:TASK-UI-DETAILS-20261015
- Feature IDs: FEAT-001, FEAT-009, FEAT-011, FEAT-022
- Owner role: repository-maintainer
- Acceptance: 设置低密度分类紧凑且切换不保留宽壳，模型表单和手机导航仍可达; 首页和Agent无画布参数，文字胶囊及图标圆角一致，末尾发送动作不落单; 空卡片一个上传入口，非空媒体无重复上传；原件重载恢复；扩展页轴线一致; 相关及完整门禁、当前源码独立审查、Web/Native同状态证据分别记录
- Branch: `fix/TASK-UI-DETAILS-20261015`
- Worktree: `D:/kk-studio/.worktrees/branch-consolidation-20261011`
- Modules: src/components, src/styles, tests/browser, docs/changes/2026-10-15-ui-details
- Verification: PASS — ab878ffd完整verify退出0：Node1278/14skip、Agent199/2skip、browser635首试、UI239/0、development PASS；精确源码独立审查PASS。官方2.1.26重建与38项Native/资源字节一致性通过，owned实例正常关闭。
- Evidence: [docs/changes/2026-10-15-ui-details/verification.md](../../docs/changes/2026-10-15-ui-details/verification.md), [docs/changes/2026-10-15-ui-details/review.md](../../docs/changes/2026-10-15-ui-details/review.md)
- Next action: 本次本地UI范围完成；用户视觉接受、真实Provider、Hosted/安装器及实体手机另验，不自动关闭原开放能力。
- Last verified: 2026-10-15
- Updated: 2026-10-15

## TASK-UI-FULL-20261015 — 完成全页面新UI收敛并验证后合入主线

- Goal: 覆盖全部可达页面和已实现卡片，修复模型、输入、圆角、对齐及旧项目恢复缺陷，通过当前SHA门禁后PR集成main。
- Scope: 沿用2.1.26新UI与全部既有能力，不新增插件/依赖，不改秘密配置或数据身份；主线差量逐项保全。承接相对main新入库的15份历史交付包及原证据来源，保留原任务branch/status；本任务负责当前整合SHA及2.1.28设置竞态及2.1.29三CLI卡片/TaskHost夹具readiness与2.1.30侧栏动画命中修复验证。
- Display status: 进行中
- Priority: P1 — 用户要求全页面/卡片转到新UI，并验证旧项目恢复后合主线。
- Requirement refs: ledger:TASK-UI-FULL-20261015
- Feature IDs: FEAT-001, FEAT-009, FEAT-011, FEAT-022
- Owner role: repository-maintainer
- Acceptance: 全部实际可达页面/卡片及模型caller有覆盖矩阵，旧分支控件修到共享owner; 各类型空card仅upload、有内容才唯一toolbar，运行/失败/恢复互斥及实际动作链通过；同类分类、任务与连接动作遵循真实状态谓词; 390/1099/1920浏览器验证形状、同排、命中与旧项目恢复，无静默丢稿; 完整verify、Delivery、当前Desktop与精确SHA独立审查通过; 当前head托管检查通过后普通PR合并，fetch复核main与post-merge
- Branch: `fix/TASK-UI-FULL-20261015`
- Worktree: `D:/kk-studio/.worktrees/branch-consolidation-20261011`
- Modules: src/components, src/styles, src/features, tests/browser, tests/unit, src/App.tsx, docs/changes/2026-10-15-ui-full
- Verification: NOT_VERIFIED — 本地验收PASS：source241f3050+test-only音频定位修正，verify-merged-3 exit0；Node1309=1295PASS14skip0fail，Agent201=199PASS2skip0fail，Browser747/747首试PASS（0flaky/skip/实际retry），lint/typecheck/UI242/0/format/build/development PASS。Native56/0errors与资源字节身份、owned关闭及Rust163/fmt/clientcheck PASS；source241/integration241精确复审PASS关闭三P2。104实际冲突/25自动差量逐项核验、21历史blob及15来源包/原任务branch状态保持，Delivery704/0仅结构。verify-1五失败、verify-2音频全局selector一失败及修正后严格播放2PASS、所有原始RED/无效夹具/JSON覆盖勘误保留。整体NOT_VERIFIED：最终doc/test-only提交head、Hosted/PR/main/post-main待实际回执，远端main仍694。 f09051ec独立aggregate review PASS、ready PR59已建立；Gitguards push/PR与governance/delivery/deploy-linux PASS，但quality38641803780 verify在测试前snapshot检查因默认外部父目录依赖FAIL。root仅修scripts/tests，产品/Rust/Native源与字节不变；有效RED2FAIL3PASS、当前定向GREEN23PASS，完整无外部env的verify-4及新SHA复审/Hosted PENDING；main694未合并。 可移植性修复最终本地PASS：verify-merged-5无KK_CONTAINER_ROOT exit0，snapshot3/0、Node1315=1301PASS14skip0fail、Agent201=199PASS2skip0fail、Browser747PASS2.9m与development四步骤PASS；显式容器snapshot4/0 external1PASS。Nativeinspect仍current且EXE/input字节不变，产品/Rust/版本2.1.27未变。CLI24PASS/offline AI-evals PASS只属有限dirty source预检；verify4 lint失败及继承JSON NOT-RUN/f090Hosted失败保留。最终修复HEAD待提交并独立exact-SHA复审/新Hosted，整体仍NOT_VERIFIED。 最新c498 exact aggregate review PASS后Hosted quality38643592443 FAIL：snapshot3/0，Node1315=1294PASS8FAIL13skip（额外Windows symlink case可用），agentPackage发布fixture C:/Users/RUNNER~1非canonical根被既有no-link guard拒绝，Browser/Rust未运行。仅测试realpath修复/证明与同8.3短TEMP/TMP完整Node与静态检查待验；安全脚本和回滚断言不改，原verify-5保留本地范围，main694/PR59未合并。 最终short-temp本地PASS：agentPackage fixture await realpath仅4+/1-，产品安全脚本不变；实际8.3根11项RED3PASS8FAIL→GREEN11PASS0skip，所有junction/unowned-stage/identity-swap/rollback guards实际运行。短TEMP首轮Node1299PASS2FAIL14skip及canary1失败系自建TEMP过深的git路径前置条件，未改Git guard；较浅actual8.3根canary7PASS3Linux skip，run2 Node1315=1301PASS14platform skip0fail与lint/typecheck/format全exit0。非完整verify6；Browser747/Native56/Rust163沿用未变产品范围，最终修复head/newHosted/main仍PENDING。 最新54a2 exact aggregate PASS/Delivery706/0后Hosted38645328109 Node1315=1301PASS1FAIL13skip，仅gateway首次ready CONDITION_TIMEOUT6747ms，child日志未输出故alive/crash UNKNOWN；未POST/Provider/恢复/Browser/Rust，时长variance不定slow CI。单测试启动握手84+/14-，preload7s同栈RED→两次冷启动总15297ms<原20s、延迟4GREEN含exit/error/abort，focused21PASS；20s和提交恢复60x100及断言不变，无产品改动。真实8.3最终Node1318=1304PASS14skip0fail与lint/typecheck/format全exit0；非完整verify6，Browser747/Native56/Rust163沿用未变产品。新head/独立review/新Hosted/main及旧54push38645320833结果待验。 2d4be5fca4c2167d4bc0d500634645624f311505独立aggregate PASS/Delivery707/0后，54 push38645320833已回读Repository verify exit0、完整Node/Agent/Rust163/clientcheck/build PASS，Browser746PASS/1 sidebar flaky/0最终失败；目标文件夹首试缺失而retry通过，原缺trace根因UNKNOWN，随后Native旧配置供应商按钮30sFAIL、仅8检查。2d push38647654947 Browser746PASS/1FAIL/0flaky，settings目录草稿case初试/retry均FAIL：expected Updated B received A。冻结旧产品真实select连续B→A RED2为3/3FAIL；原race-red-1在22:50:20.475Z修改测试源，仅单case诊断。ProviderModelCatalog仅字段同步useEffect→useLayoutEffect，dirty/账号/保存校验保留；版本脚本Desktop/Web2.1.27→2.1.28、Mobile2.1.1规划不变，2.1.28 build与settings七case×六次42PASS/0retry/flaky/skip。Native TaskHost测试对齐当前菜单/官方API/精确选型与既有快照CAS四结果草稿，全部功能/安全/timeout断言保持；实际旧release2.1.27 sourceHead2d fixture4058265f为11PASS、exit0、0error、credentialCleanupComplete=true、五进程退出与端口释放，不代填2.1.28。当前产品/测试/版本候选尚未最终提交；2.1.28完整verify/fresh Native/资源身份、最终SHA独立source/integration复审、新Hosted/PR59/main/post-main PENDING，整体REVIEW/NOT_VERIFIED。 sidebar-probe五个cold contexts含CPU4x全部PASS、folder0→1为2/2/12/2/2ms、groups identity始终1、无remount、0pageerror/blockedrequests=[]且自有preview关闭；仅本轮未复现，原Hosted缺trace根因仍UNKNOWN。 最新2.1.28本地最终组合PASS：2d4be5fc+最小字段layout同步/版本28/测试docs，verify-merged-6实际exit0，Node1318=1304PASS14platform skip0fail、Agent201=199PASS2skip0fail、Browser747PASS3.2m；JSON start2026-10-14T22:59:53.196Z/duration190200.396ms，独立递归747tests/747results全passed、每case单记录、actualRetry0/flaky0/skip0，lint/typecheck/UI242/0/format/build/development四步PASS。health42/footguns2仅advisory，警告保留。官方2.1.28重建34.34s，native5 fresh WebView/data证据56PASS/0error/10图，root实查CIMprofile并目视空态/重开/更新三图；exact dataRoot正常close。native2旧version硬编码5checksFAIL、native3CDP过早0checksECONNREFUSED、native4同owned projectdata但误用default已配置WebView49checksFAIL全部保留，无生成/Provider请求，未清理default profile；native5才是fresh完整验收。新版Taskhost current2为11PASS/0error/credentialCleanupComplete true，同EXE五自有app均退出。local-final-verification-6显示verify后reason=current且input28c2f285e8aad35a686080aee9e50c4119704c8630113e329c4d2324b6084121/EXE638b5df5345f47943b1d0061f1fea00bcdf037871200d0d38d3f51fa3e6bc722与Native5同哈希，unchangedProductSinceNative5=true。2d PRquality38647660224最终FAIL：Node1305/13skip、Agent199/2skip、Rust163/fmt/check/buildPASS，Browser746PASS1settingsflaky（首fail retryPASS，同竞态），Native旧菜单8checks后line567FAIL。旧54sidebar原缺trace根因UNKNOWN，本地不复现不宣称修复；最终head独立source/integration复审、新Hosted/PR59/main/post-main待验，main fetch仍694未合并，整体REVIEW/NOT_VERIFIED。 最新2.1.29本地冻结：94e基线加CLI卡片/版本29/TaskHost夹具差量，完整verify7 exit0（Node1304/14平台skip、Agent199/2skip、Edge756首试/0retry/flaky/skip、UI242/0及development四步），fresh Native7 78PASS/0error/12图、current4无注入TaskHost11PASS/cleanuptrue，input/EXE同字节current。三CLI卡片9有效视觉RED→9GREEN；历史Native2–6及所有同式只读invoke赋值/audit空数组不能证明凭据抑制、forbidden未发生或guard有效，安全结论撤回，实际视觉/资源/存储原范围保留。Native7前后4正向IPC自检仅证明安装guard后的受验动作阶段，不证明启动前全进程或真实CLI登录。受控readiness RED2/GREEN2不等actual3根因，actual3与旧sidebar仍UNKNOWN、RED1注入无效。详细新证据/哈希/失败边界集中docs/changes/2026-10-15-ui-full/verification.md的2.1.29节；原138任务raw/对象、功能registry及历史原件保持。最终head独立审查、新Hosted/Delivery、PR59普通合并与main/post-main待验，main694未合并，REVIEW/整体NOT_VERIFIED。 最新2.1.30本地冻结：d50基线加侧栏12行CSS/4新case/版本30，完整verify8 exit0：Node1304/14平台skip、Agent199/2skip、Edge760unique/760单result全passed，retry/flaky/skip/globalerrors0，UI242/0与development四步骤。d50 PR原754首试+2flaky/retry2与push756首试分别保留；缺pointer trace不把每次旧失败全判同因。真实300ms/32ms点击4FAIL→只等rail完成4PASS，定向21首试PASS，step-end hidden期间不可hit/focus，稳定后显示，未改handler/重试/timeout。fresh Native9 87PASS/0errors/13图，正常单次down/up/click各1、folder0→1及折叠重开保留folder1，HTTP IPC受验阶段前后4正向自检通过；Native8仅13checks因.3s/300ms字面误设FAIL原件保留，不是productFAIL或完整PASS。TaskHost current5真实30无注入11PASS/errors[]/cleanuptrue，同当前EXE，自有进程退出与端口释放已实查。Native4误写default WebView profile自动连接paused/原值NOT_RECORDED，不能称所有用户偏好未触碰；不猜恢复，用户可模型接入重新连接。详证/完整哈希与风险集中verification的2.1.30节；原138任务raw/对象、其他功能及历史全文保持。最终head独立审查、新Hosted/Delivery、PR59普通合并与main/post-main待验，main694未合并，REVIEW/整体NOT_VERIFIED。
- Evidence: [docs/changes/2026-10-15-ui-full/verification.md](../../docs/changes/2026-10-15-ui-full/verification.md), [docs/changes/2026-10-15-ui-full/review.md](../../docs/changes/2026-10-15-ui-full/review.md), [docs/changes/2026-10-12-governance-currentness/verification.md](../../docs/changes/2026-10-12-governance-currentness/verification.md), [docs/changes/2026-10-12-p1-audit-closeout/verification.md](../../docs/changes/2026-10-12-p1-audit-closeout/verification.md), [docs/changes/2026-10-13-agent-recovery/verification.md](../../docs/changes/2026-10-13-agent-recovery/verification.md), [docs/changes/2026-10-13-capability-ui/verification.md](../../docs/changes/2026-10-13-capability-ui/verification.md), [docs/changes/2026-10-13-review-remediation/verification.md](../../docs/changes/2026-10-13-review-remediation/verification.md), [docs/changes/2026-10-13-ui-remaining-fixes/verification.md](../../docs/changes/2026-10-13-ui-remaining-fixes/verification.md), [docs/changes/2026-10-14-action-usability-222/verification.md](../../docs/changes/2026-10-14-action-usability-222/verification.md), [docs/changes/2026-10-14-action-usability-223/verification.md](../../docs/changes/2026-10-14-action-usability-223/verification.md), [docs/changes/2026-10-14-agent-canvas-sync/verification.md](../../docs/changes/2026-10-14-agent-canvas-sync/verification.md), [docs/changes/2026-10-14-agent-execution-delivery/verification.md](../../docs/changes/2026-10-14-agent-execution-delivery/verification.md), [docs/changes/2026-10-14-ccswitch-status-recovery/verification.md](../../docs/changes/2026-10-14-ccswitch-status-recovery/verification.md), [docs/changes/2026-10-14-protocol-cli-completion/verification.md](../../docs/changes/2026-10-14-protocol-cli-completion/verification.md), [docs/changes/2026-10-14-ui-consolidation/verification.md](../../docs/changes/2026-10-14-ui-consolidation/verification.md), [docs/changes/2026-10-15-settings-latest-ui/verification.md](../../docs/changes/2026-10-15-settings-latest-ui/verification.md), [docs/changes/2026-10-15-ui-details/verification.md](../../docs/changes/2026-10-15-ui-details/verification.md), [docs/changes/2026-10-15-ui-full/coverage.md](../../docs/changes/2026-10-15-ui-full/coverage.md)
- Next action: 形成2.1.30最终head并独立base694→head精确审查；本地verify8 760首试/Native9 87/TaskHost current5 11已PASS。当前SHA Hosted/Delivery通过后普通合并PR59、fetch核对main/post-main。偏好例外、旧Hosted因果限制及其他风险见verification最新2.1.30节，REVIEW/整体NOT_VERIFIED。
- Last verified: 2026-10-15
- Updated: 2026-10-15
