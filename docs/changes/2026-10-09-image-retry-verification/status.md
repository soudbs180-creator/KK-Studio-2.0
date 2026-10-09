# 失败任务续修状态报告（2026-10-09）

当前候选114项{"DONE":68,"TODO":16,"PARTIAL":26,"BLOCKED":4}；46项开放。本地完成与分支推广独立：PR43最新source105的本机默认1423 447零重试通过，旧Hosted和先前9flaky/误用1431十失败全部保留；最终docs、当前Hosted、普通合并与新main仍待完成。UI012原owner已收尾36eb8f6，正在独立精确复核；UI014原owner继续失败测试，root备份不重复实现。Provider草稿PR44还在当前CI。原main109对象和所有功能保留，不把其他branch的后续排期混成main现状。

| ID | 状态 | 验证 | 优先级 | 任务 |
| --- | --- | --- | --- | --- |
| TASK-WINDOWS-ENTRY-DIAG-002 | DONE | PASS | P2 | 补齐Windows入口子进程失败诊断 |
| TASK-WINDOWS-ENTRY-RECOVERY-003 | TODO | NOT_VERIFIED | P2 | 继续定位Hosted Windows入口未正常退出的原始原因 |
| TASK-IMAGE-RETRY-004 | DONE | PASS | P1 | 修复主线区域重试验收读取旧成功任务 |
| TASK-DESKTOP-FLUSH-001 | DONE | PASS | P1 | 桌面关闭前耐久保存与失败留窗 |
| TASK-PLUGIN-MARKDOWN-001 | DONE | PASS | P1 | 随包Markdown去除CDN代码依赖与离线渲染 |
| TASK-PLUGIN-RECOVERY-001 | DONE | PASS | P1 | 插件节点快照完整恢复与坏数据保护 |
| TASK-IMAGE-EDIT-001 | DONE | PASS | undefined | 统一图片编辑蒙版与连续重绘 |
| TASK-IMAGE-EDIT-VERIFY-002 | TODO | NOT_VERIFIED | undefined | 图片编辑真实模型与移动设备效果验收 |
| TASK-UI-013 | DONE | PASS | undefined | 桌面标题栏与菜单合并为单排 |
| TASK-LAUNCH-001 | DONE | PASS | undefined | 桌面与网页启动体验及图标修复 |
| TASK-MODEL-001 | DONE | PASS | undefined | 账号级图片模型能力声明与提交校验 |
| TASK-PLUGIN-DEV-001 | DONE | PASS | undefined | 修复 Vite development 随包插件 public import 错误 |
| T0 | DONE | PASS | undefined | 可复现候选源码与主线整合 |
| TASK-GOV-001 | DONE | PASS | undefined | 治理源、ESLint、架构门禁和 CI |
| TASK-PROV-001 | DONE | PASS | undefined | 冷却恢复与产品调度入口边界 |
| T1 | DONE | PASS | undefined | 读取保护、备份和 revision 冲突 |
| T2 | DONE | PASS | undefined | 画布图持久化与稳定节点身份 |
| T3a | DONE | PASS | undefined | 原生素材及引用最终验收 |
| T3b | DONE | PASS | undefined | 完整项目包导出导入与恢复 |
| T4 | DONE | PASS | undefined | 统一实际图片生成入口及健康语义 |
| T5 | DONE | PASS | undefined | 持久本地 TaskHost 与未知受理恢复 |
| T6 | PARTIAL | PARTIAL | undefined | Desktop ComfyUI最小链实现 |
| EXT-PROVIDER | BLOCKED | NOT_VERIFIED | undefined | 真实 Provider/GPU 生成验收 |
| EXT-COMFY | BLOCKED | NOT_VERIFIED | undefined | 真实 ComfyUI/模型验收 |
| T7 | PARTIAL | PARTIAL | undefined | Desktop可用版本及安装恢复验收 |
| T8 | TODO | NOT_VERIFIED | undefined | 成熟Core职责和平台能力边界 |
| T9 | TODO | NOT_VERIFIED | undefined | Web本地版及浏览器容量/离线能力 |
| T10-PREP | PARTIAL | PARTIAL | undefined | VPS发布、备份回滚与部署配置准备 |
| T10 | BLOCKED | NOT_VERIFIED | undefined | VPS staging和生产实机验收 |
| T11 | BLOCKED | NOT_VERIFIED | undefined | 旧Web/Vercel切换与退役 |
| T12 | TODO | NOT_VERIFIED | undefined | Mobile 独立形态与手机适配 |
| UI-001 | PARTIAL | PARTIAL | undefined | UI tokens和共享组件契约 |
| UI-002 | DONE | PASS | undefined | 窄屏composer和动态文案溢出 |
| UI-003 | PARTIAL | PARTIAL | undefined | 示例任务/账号与真实服务边界 |
| UI-004 | PARTIAL | PARTIAL | undefined | 逐页对齐、IA和最终视觉运行态 |
| PERF-001 | PARTIAL | PARTIAL | undefined | 原生素材缩略图/分页及内存IO |
| EXT-GIT | DONE | PASS | undefined | 远端PR与main保护规则 |
| TEST-PROV-001 | DONE | PASS | undefined | Provider真实入口浏览器回归 |
| TASK-ASTRA-001 | DONE | PASS | undefined | Astra 迁移计划与 Git 分支规则同步 |
| TASK-KK2-MAIN-SYNC | DONE | PASS | undefined | KK Studio 2.0 本地与云端 main 树同步 |
| TASK-UI-UNMERGED-001 | DONE | PASS | undefined | dirty checkout 未合并 UI 回归候选 |
| TASK-UI-MAIN-001 | DONE | PASS | undefined | 现行Figma页面校正与交互修复主线整合 |
| TASK-UI-DISMISS-002 | DONE | PASS | undefined | 窄屏侧栏关闭与大图重绘稳定性 |
| TASK-MAIN-CLOSE-002 | DONE | PASS | undefined | 未完成子任务汇总验收与主线同步 |
| TASK-UI-CLOSE-003 | DONE | PASS | undefined | 现行Figma页面缺口复核与交互收口 |
| TASK-PERF-ASSETS-001 | DONE | PASS | undefined | 素材列表元数据和原件按需读取 |
| TASK-GOV-002 | DONE | PASS | undefined | 跨AI自主开发与分支质量门禁 |
| TASK-AUDIT-SEC-001 | DONE | PASS | undefined | 安全边界与异常任务状态审计 |
| TASK-CAP-001 | PARTIAL | PARTIAL | undefined | 本地 Skill/MCP/ComfyUI 能力补齐 |
| TASK-MINIMAX-001 | PARTIAL | PARTIAL | undefined | MiniMax Design 交互审计与本地技能/MCP复刻 |
| TASK-MCP-PROTO-001 | PARTIAL | PARTIAL | undefined | MCP 2026 协议协商与旧版兼容 |
| TASK-MCP-REGISTRY-001 | DONE | PASS | undefined | MCP 多标签页配置写入不丢失 |
| TASK-MCP-REGISTRY-002 | DONE | PASS | undefined | 旧版超限 MCP 配置无损恢复 |
| FEATURE-SYSTEM | DONE | PASS | undefined | 功能卡片体系、状态看板与后端化路线 |
| BACKEND-IMAGE-PARAMS | PARTIAL | PARTIAL | undefined | 图片比例与清晰度真实透传供应商 |
| BACKEND-TEXT-NODE | PARTIAL | PARTIAL | undefined | 文本节点接入统一任务宿主 |
| BACKEND-MEDIA-001 | TODO | NOT_VERIFIED | undefined | 视频与音频节点真实生成链 |
| BACKEND-MCP-AUTO | TODO | NOT_VERIFIED | undefined | MCP 工具自动调用编排 |
| BACKEND-PLATFORM | TODO | NOT_VERIFIED | undefined | 平台账号/积分/云同步/记忆/代理后端 |
| BACKEND-ASTRA-001 | TODO | NOT_VERIFIED | undefined | Astra 研究助手实现 |
| UI-SKILL-POPOVER-001 | DONE | PASS | undefined | 窄屏首页弹层遮挡修复与 Skill 空态断言更新 |
| TASK-RULES-003 | DONE | PASS | undefined | 修复功能状态与运行证据门禁 |
| BACKEND-CONVERSATION | PARTIAL | PARTIAL | undefined | 对话面板文本多轮能力与实际状态收敛 |
| TASK-DS-001 | PARTIAL | PARTIAL | undefined | Design System校正与公共UI对齐 |
| TASK-DS-002 | DONE | PASS | undefined | Design System逐页迁移与桌面验收 |
| TASK-UI-005 | DONE | PASS | undefined | 新增功能 UI 入口与能力展示对齐 |
| TASK-UI-006 | DONE | PASS | undefined | 折叠与弹层交互、画布重叠和缩放背景修复 |
| TASK-AGENT-001 | PARTIAL | PARTIAL | undefined | 默认 Codex 主 Agent 与 KK 生成任务接入 |
| TASK-AGENT-002 | PARTIAL | PARTIAL | undefined | 桌面本地 Agent 托管与其他登录软件适配 |
| TASK-UI-007 | DONE | PASS | undefined | 手机平板电脑三档尺寸与图标对齐 |
| TASK-UI-008 | DONE | PASS | undefined | 重新制定创作输入框规范并统一三档实现 |
| TASK-AGENT-003 | DONE | PASS | undefined | Agent 图片附件、画布引用与视口选择操作 |
| PLUGIN-DESKTOP-001 | DONE | PASS | undefined | 修复桌面画布插件的 CSP 加载路径 |
| REL-2.1.0 | DONE | PASS | undefined | 2.1.0 本地集成与源码上传 |
| TASK-RULES-004 | DONE | PASS | undefined | 现行规则与 Markdown 一致性审计 |
| TASK-DOCS-HISTORY-001 | TODO | NOT_VERIFIED | undefined | 历史 Markdown 链接与缺失日志勘误 |
| TASK-ORCH-001 | DONE | PASS | undefined | Agent 编排领域状态机与编排器工具面 |
| TASK-ORCH-002 | DONE | PASS | undefined | TaskWorkbench 阶段计划视图与审批交互 |
| TASK-ORCH-003 | TODO | NOT_VERIFIED | undefined | 编排器驱动生成执行与计划门禁 |
| TASK-CANVAS-001 | PARTIAL | PARTIAL | undefined | 画布交付契约与当轮产物收集 |
| TASK-TASKSTATE-001 | PARTIAL | PARTIAL | undefined | 统一任务态契约定稿 |
| TASK-TASKSTATE-002 | TODO | NOT_VERIFIED | undefined | 供应商成本报价回执接入 |
| TASK-PROV-002 | DONE | PASS | undefined | 多供应商接入与多目标配置（Provider Connectivity） |
| TASK-COMPARE-001 | DONE | PASS | undefined | 画布图片对比操作 |
| TASK-COMPARE-002 | DONE | PASS | undefined | 对比控件窄屏命中区主线回归 |
| TASK-VERSION-001 | DONE | PASS | undefined | 桌面/Web/Mobile 独立版本源与自动递增 |
| TASK-LOCAL-SERVICE-001 | PARTIAL | PARTIAL | undefined | Web 本机伴随服务与既有浏览器数据迁移 |
| TASK-CLOSEOUT-2026-09-28 | DONE | PASS | undefined | 合并后版本与 VPS 状态收口 |
| TASK-POSTMERGE-MIGRATION-2026-09-28 | DONE | PASS | undefined | 主线合并后迁移操作单收口 |
| TASK-UI-CANVAS-001 | DONE | PASS | undefined | 画布会话分栏与固定侧栏交互修复 |
| TASK-UI-HOME-002 | DONE | PASS | undefined | 首页与对话输入区剩余设计反馈收口 |
| TASK-UI-GOV-003 | DONE | PASS | undefined | 新版 Figma 四页治理基线与 UI 模板收口 |
| TASK-CANVAS-KAWORKAI-001 | DONE | PASS | undefined | Kaworkai 无限画布交互研究与本地画布增强 |
| TASK-PROJECT-001 | DONE | PASS | undefined | 项目落地与分支收敛 |
| TASK-UI-010 | DONE | PASS | undefined | 现行 UI 规则与真实操作回归 |
| TASK-PROJECT-SIDEBAR-001 | PARTIAL | PARTIAL | undefined | 侧栏项目列表与真实项目数据统一 |
| TASK-PROV-003 | PARTIAL | PARTIAL | undefined | Codex Provider 配置注入与 model catalog 落盘（agent 侧接线） |
| TASK-PROV-004 | PARTIAL | PARTIAL | undefined | Claude Code settings.json 落盘（agent 侧接线） |
| TASK-AGENT-004 | PARTIAL | PARTIAL | undefined | Google Interactions 对话和生图 |
| TASK-AGENT-005 | PARTIAL | PARTIAL | undefined | Gemini CLI 账号登录通道（免 API Key 对话） |
| TASK-MEMORY-001 | PARTIAL | PARTIAL | undefined | 本地长期记忆服务接入对话 |
| TASK-MEMORY-002 | PARTIAL | PARTIAL | undefined | 跨产品共享本地记忆（本机共享） |
| TASK-AGENT-007 | DONE | PASS | undefined | Codex 通过本机 CodeBuddy CLI 受限委派短文本 |
| TASK-DESKTOP-INSTALLER-001 | DONE | PASS | undefined | Windows NSIS 安装器及隔离恢复验收 |
| TASK-AGENT-008 | DONE | PASS | undefined | Codex 原生生图事件传输与短提示词审计 |
| TASK-ORCH-REPLAN-001 | DONE | PASS | undefined | 编排计划失败项重排与依赖闭包 |
| TASK-AUDIT-20261003 | DONE | PASS | undefined | 全项目任务盘点与可本地闭环项收口 |
| TASK-GOV-GOALS-001 | DONE | PASS | undefined | 项目建设目标与验收基线 |
| TASK-UI-COMPONENT-BOUNDARY-001 | DONE | PASS | undefined | MCP 设置组件职责拆分 |
| TASK-UI-011 | DONE | PASS | P1 | 图片选择工具栏与新增页面 UI 规则回归 |
| TASK-PROV-005 | TODO | NOT_VERIFIED | P1 | Desktop 供应商非秘密配置 durable 保存与恢复 |
| TASK-PROV-006 | TODO | NOT_VERIFIED | P1 | Desktop image 提交连接门禁与 health 统一 |
| TASK-VERIFY-CONCURRENCY-002 | TODO | NOT_VERIFIED | P2 | 浏览器并发失败原因与隔离复核 |
| TASK-VERIFY-ORIGIN-003 | TODO | NOT_VERIFIED | P2 | 浏览器验收端口与服务来源契约一致性 |
