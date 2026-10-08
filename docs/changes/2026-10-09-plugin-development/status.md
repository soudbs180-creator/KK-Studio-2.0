# 任务状态与分支收尾报告（2026-10-09）

本表以当前任务账本为准；本地产品完成与分支集成分别记录。已完成检查的分支才进入普通 PR 合并，原 FAIL 和旧 SHA 的证据保留。

本轮关闭：开发 public-import、SDK 静态 JSX、插件快照恢复、Markdown 随包离线解析、桌面立即关闭丢失和失败留窗。TASK-PLUGIN-DEV-001 及三个新 P1 子任务本地 DONE。当前产品 Desktop/Web2.1.12；Mobile规划2.1.1。

已实际合并：PR38启动、PR39图片上方动作、PR40单排标题栏、PR41统一Mask。PR41落地主线8c921a5，实际post-main37826264108 verify/deploy-linux成功；不以合并前CI替代。当前插件PR和落地/main复验待普通交付，不能从本地DONE推断已合入。

## 验证与保留的失败

804/812 root、172/174 Agent（原skip8/2）、447/447浏览器447次尝试零实际重试/flaky/skip；严格开发四插件PASS；Rust102、fmt、clientcheck、fresh带Agent release成功。原生8步、TaskHost11、上方动作13及CSP启停同EXE12009ce4…通过。标题栏第一轮拖动FAIL仍保留，第二轮仅增加真实位移JSON诊断且未改动作/阈值，完整回归PASS；首次原因UNKNOWN，环境维护风险仍存在。四插件同位置叠放为该fixture状态，正文逐项DOM断言不等于四正文同时可视，也不宣称整个UI已对齐。

## 未完成分支与下一步优先级

- P1：UI012/UI014仍在原执行者复验，未有当前最终review/Hosted/组合验收，继续保留，不能强合。UI012须承接当前Mask与插件主线并复验冲突组合；UI014在补页面规范、格式与窄屏交互。
- P1：独立branch-health审计的当前伴随服务CORS/快照原件保护、Codex TOML注释表头/失效active指针，需要在最新main复现并单独修复。审计原报告绑定main1d、Maskdf、UI012992；其他推断必须先重证，不能当当前已修或当前事实。
- P1：Web不完整成功响应和Gateway受理/计费边界先隔离复现；历史WorkBuddy凭据/SSE及Kaworkai版本恢复不得整支合入，需新承接任务及完整验收。
- P2：Mask参考上传迟到覆盖、历史文档/分支归属、原生拖动/浏览器并发稳定性继续核对；有其他执行者在途的模块串行整合，保留所有dirty工作树。
- 外部必要条件：真实Provider/GPU/ComfyUI、VPS/旧站切换、安装/物理手机/用户视觉验收和报价回执仍由账本开放项承接；本轮fixture不冒称live。

健康审计19条原始分类见工程外 `D:/kk-studio/output/branch-health-20261009/finding-table.md`；下一轮会按当前main重新分解入账并执行，不能用旧分支报告直接宣布可合并。

## 全部任务

| ID | 状态 | 验证 | 优先级 | 任务 |
| --- | --- | --- | --- | --- |
| TASK-DESKTOP-FLUSH-001 | DONE | PASS | P1 | 桌面关闭前耐久保存与失败留窗 |
| TASK-PLUGIN-MARKDOWN-001 | DONE | PASS | P1 | 随包Markdown去除CDN代码依赖与离线渲染 |
| TASK-PLUGIN-RECOVERY-001 | DONE | PASS | P1 | 插件节点快照完整恢复与坏数据保护 |
| TASK-IMAGE-EDIT-001 | DONE | PASS | 沿既有计划 | 统一图片编辑蒙版与连续重绘 |
| TASK-IMAGE-EDIT-VERIFY-002 | TODO | NOT_VERIFIED | 沿既有计划 | 图片编辑真实模型与移动设备效果验收 |
| TASK-UI-013 | DONE | PASS | 沿既有计划 | 桌面标题栏与菜单合并为单排 |
| TASK-LAUNCH-001 | DONE | PASS | 沿既有计划 | 桌面与网页启动体验及图标修复 |
| TASK-MODEL-001 | DONE | PASS | 沿既有计划 | 账号级图片模型能力声明与提交校验 |
| TASK-PLUGIN-DEV-001 | DONE | PASS | 沿既有计划 | 修复 Vite development 随包插件 public import 错误 |
| T0 | DONE | PASS | 沿既有计划 | 可复现候选源码与主线整合 |
| TASK-GOV-001 | DONE | PASS | 沿既有计划 | 治理源、ESLint、架构门禁和 CI |
| TASK-PROV-001 | DONE | PASS | 沿既有计划 | 冷却恢复与产品调度入口边界 |
| T1 | DONE | PASS | 沿既有计划 | 读取保护、备份和 revision 冲突 |
| T2 | DONE | PASS | 沿既有计划 | 画布图持久化与稳定节点身份 |
| T3a | DONE | PASS | 沿既有计划 | 原生素材及引用最终验收 |
| T3b | DONE | PASS | 沿既有计划 | 完整项目包导出导入与恢复 |
| T4 | DONE | PASS | 沿既有计划 | 统一实际图片生成入口及健康语义 |
| T5 | DONE | PASS | 沿既有计划 | 持久本地 TaskHost 与未知受理恢复 |
| T6 | PARTIAL | PARTIAL | 沿既有计划 | Desktop ComfyUI最小链实现 |
| EXT-PROVIDER | BLOCKED | NOT_VERIFIED | 沿既有计划 | 真实 Provider/GPU 生成验收 |
| EXT-COMFY | BLOCKED | NOT_VERIFIED | 沿既有计划 | 真实 ComfyUI/模型验收 |
| T7 | PARTIAL | PARTIAL | 沿既有计划 | Desktop可用版本及安装恢复验收 |
| T8 | TODO | NOT_VERIFIED | 沿既有计划 | 成熟Core职责和平台能力边界 |
| T9 | TODO | NOT_VERIFIED | 沿既有计划 | Web本地版及浏览器容量/离线能力 |
| T10-PREP | PARTIAL | PARTIAL | 沿既有计划 | VPS发布、备份回滚与部署配置准备 |
| T10 | BLOCKED | NOT_VERIFIED | 沿既有计划 | VPS staging和生产实机验收 |
| T11 | BLOCKED | NOT_VERIFIED | 沿既有计划 | 旧Web/Vercel切换与退役 |
| T12 | TODO | NOT_VERIFIED | 沿既有计划 | Mobile 独立形态与手机适配 |
| UI-001 | PARTIAL | PARTIAL | 沿既有计划 | UI tokens和共享组件契约 |
| UI-002 | DONE | PASS | 沿既有计划 | 窄屏composer和动态文案溢出 |
| UI-003 | PARTIAL | PARTIAL | 沿既有计划 | 示例任务/账号与真实服务边界 |
| UI-004 | PARTIAL | PARTIAL | 沿既有计划 | 逐页对齐、IA和最终视觉运行态 |
| PERF-001 | PARTIAL | PARTIAL | 沿既有计划 | 原生素材缩略图/分页及内存IO |
| EXT-GIT | DONE | PASS | 沿既有计划 | 远端PR与main保护规则 |
| TEST-PROV-001 | DONE | PASS | 沿既有计划 | Provider真实入口浏览器回归 |
| TASK-ASTRA-001 | DONE | PASS | 沿既有计划 | Astra 迁移计划与 Git 分支规则同步 |
| TASK-KK2-MAIN-SYNC | DONE | PASS | 沿既有计划 | KK Studio 2.0 本地与云端 main 树同步 |
| TASK-UI-UNMERGED-001 | DONE | PASS | 沿既有计划 | dirty checkout 未合并 UI 回归候选 |
| TASK-UI-MAIN-001 | DONE | PASS | 沿既有计划 | 现行Figma页面校正与交互修复主线整合 |
| TASK-UI-DISMISS-002 | DONE | PASS | 沿既有计划 | 窄屏侧栏关闭与大图重绘稳定性 |
| TASK-MAIN-CLOSE-002 | DONE | PASS | 沿既有计划 | 未完成子任务汇总验收与主线同步 |
| TASK-UI-CLOSE-003 | DONE | PASS | 沿既有计划 | 现行Figma页面缺口复核与交互收口 |
| TASK-PERF-ASSETS-001 | DONE | PASS | 沿既有计划 | 素材列表元数据和原件按需读取 |
| TASK-GOV-002 | DONE | PASS | 沿既有计划 | 跨AI自主开发与分支质量门禁 |
| TASK-AUDIT-SEC-001 | DONE | PASS | 沿既有计划 | 安全边界与异常任务状态审计 |
| TASK-CAP-001 | PARTIAL | PARTIAL | 沿既有计划 | 本地 Skill/MCP/ComfyUI 能力补齐 |
| TASK-MINIMAX-001 | PARTIAL | PARTIAL | 沿既有计划 | MiniMax Design 交互审计与本地技能/MCP复刻 |
| TASK-MCP-PROTO-001 | PARTIAL | PARTIAL | 沿既有计划 | MCP 2026 协议协商与旧版兼容 |
| TASK-MCP-REGISTRY-001 | DONE | PASS | 沿既有计划 | MCP 多标签页配置写入不丢失 |
| TASK-MCP-REGISTRY-002 | DONE | PASS | 沿既有计划 | 旧版超限 MCP 配置无损恢复 |
| FEATURE-SYSTEM | DONE | PASS | 沿既有计划 | 功能卡片体系、状态看板与后端化路线 |
| BACKEND-IMAGE-PARAMS | PARTIAL | PARTIAL | 沿既有计划 | 图片比例与清晰度真实透传供应商 |
| BACKEND-TEXT-NODE | PARTIAL | PARTIAL | 沿既有计划 | 文本节点接入统一任务宿主 |
| BACKEND-MEDIA-001 | TODO | NOT_VERIFIED | 沿既有计划 | 视频与音频节点真实生成链 |
| BACKEND-MCP-AUTO | TODO | NOT_VERIFIED | 沿既有计划 | MCP 工具自动调用编排 |
| BACKEND-PLATFORM | TODO | NOT_VERIFIED | 沿既有计划 | 平台账号/积分/云同步/记忆/代理后端 |
| BACKEND-ASTRA-001 | TODO | NOT_VERIFIED | 沿既有计划 | Astra 研究助手实现 |
| UI-SKILL-POPOVER-001 | DONE | PASS | 沿既有计划 | 窄屏首页弹层遮挡修复与 Skill 空态断言更新 |
| TASK-RULES-003 | DONE | PASS | 沿既有计划 | 修复功能状态与运行证据门禁 |
| BACKEND-CONVERSATION | PARTIAL | PARTIAL | 沿既有计划 | 对话面板文本多轮能力与实际状态收敛 |
| TASK-DS-001 | PARTIAL | PARTIAL | 沿既有计划 | Design System校正与公共UI对齐 |
| TASK-DS-002 | DONE | PASS | 沿既有计划 | Design System逐页迁移与桌面验收 |
| TASK-UI-005 | DONE | PASS | 沿既有计划 | 新增功能 UI 入口与能力展示对齐 |
| TASK-UI-006 | DONE | PASS | 沿既有计划 | 折叠与弹层交互、画布重叠和缩放背景修复 |
| TASK-AGENT-001 | PARTIAL | PARTIAL | 沿既有计划 | 默认 Codex 主 Agent 与 KK 生成任务接入 |
| TASK-AGENT-002 | PARTIAL | PARTIAL | 沿既有计划 | 桌面本地 Agent 托管与其他登录软件适配 |
| TASK-UI-007 | DONE | PASS | 沿既有计划 | 手机平板电脑三档尺寸与图标对齐 |
| TASK-UI-008 | DONE | PASS | 沿既有计划 | 重新制定创作输入框规范并统一三档实现 |
| TASK-AGENT-003 | DONE | PASS | 沿既有计划 | Agent 图片附件、画布引用与视口选择操作 |
| PLUGIN-DESKTOP-001 | DONE | PASS | 沿既有计划 | 修复桌面画布插件的 CSP 加载路径 |
| REL-2.1.0 | DONE | PASS | 沿既有计划 | 2.1.0 本地集成与源码上传 |
| TASK-RULES-004 | DONE | PASS | 沿既有计划 | 现行规则与 Markdown 一致性审计 |
| TASK-DOCS-HISTORY-001 | TODO | NOT_VERIFIED | 沿既有计划 | 历史 Markdown 链接与缺失日志勘误 |
| TASK-ORCH-001 | DONE | PASS | 沿既有计划 | Agent 编排领域状态机与编排器工具面 |
| TASK-ORCH-002 | DONE | PASS | 沿既有计划 | TaskWorkbench 阶段计划视图与审批交互 |
| TASK-ORCH-003 | TODO | NOT_VERIFIED | 沿既有计划 | 编排器驱动生成执行与计划门禁 |
| TASK-CANVAS-001 | PARTIAL | PARTIAL | 沿既有计划 | 画布交付契约与当轮产物收集 |
| TASK-TASKSTATE-001 | PARTIAL | PARTIAL | 沿既有计划 | 统一任务态契约定稿 |
| TASK-TASKSTATE-002 | TODO | NOT_VERIFIED | 沿既有计划 | 供应商成本报价回执接入 |
| TASK-PROV-002 | DONE | PASS | 沿既有计划 | 多供应商接入与多目标配置（Provider Connectivity） |
| TASK-COMPARE-001 | DONE | PASS | 沿既有计划 | 画布图片对比操作 |
| TASK-COMPARE-002 | DONE | PASS | 沿既有计划 | 对比控件窄屏命中区主线回归 |
| TASK-VERSION-001 | DONE | PASS | 沿既有计划 | 桌面/Web/Mobile 独立版本源与自动递增 |
| TASK-LOCAL-SERVICE-001 | PARTIAL | PARTIAL | 沿既有计划 | Web 本机伴随服务与既有浏览器数据迁移 |
| TASK-CLOSEOUT-2026-09-28 | DONE | PASS | 沿既有计划 | 合并后版本与 VPS 状态收口 |
| TASK-POSTMERGE-MIGRATION-2026-09-28 | DONE | PASS | 沿既有计划 | 主线合并后迁移操作单收口 |
| TASK-UI-CANVAS-001 | DONE | PASS | 沿既有计划 | 画布会话分栏与固定侧栏交互修复 |
| TASK-UI-HOME-002 | DONE | PASS | 沿既有计划 | 首页与对话输入区剩余设计反馈收口 |
| TASK-UI-GOV-003 | DONE | PASS | 沿既有计划 | 新版 Figma 四页治理基线与 UI 模板收口 |
| TASK-CANVAS-KAWORKAI-001 | DONE | PASS | 沿既有计划 | Kaworkai 无限画布交互研究与本地画布增强 |
| TASK-PROJECT-001 | DONE | PASS | 沿既有计划 | 项目落地与分支收敛 |
| TASK-UI-010 | DONE | PASS | 沿既有计划 | 现行 UI 规则与真实操作回归 |
| TASK-PROJECT-SIDEBAR-001 | PARTIAL | PARTIAL | 沿既有计划 | 侧栏项目列表与真实项目数据统一 |
| TASK-PROV-003 | PARTIAL | PARTIAL | 沿既有计划 | Codex Provider 配置注入与 model catalog 落盘（agent 侧接线） |
| TASK-PROV-004 | PARTIAL | PARTIAL | 沿既有计划 | Claude Code settings.json 落盘（agent 侧接线） |
| TASK-AGENT-004 | PARTIAL | PARTIAL | 沿既有计划 | Google Interactions 对话和生图 |
| TASK-AGENT-005 | PARTIAL | PARTIAL | 沿既有计划 | Gemini CLI 账号登录通道（免 API Key 对话） |
| TASK-MEMORY-001 | PARTIAL | PARTIAL | 沿既有计划 | 本地长期记忆服务接入对话 |
| TASK-MEMORY-002 | PARTIAL | PARTIAL | 沿既有计划 | 跨产品共享本地记忆（本机共享） |
| TASK-AGENT-007 | DONE | PASS | 沿既有计划 | Codex 通过本机 CodeBuddy CLI 受限委派短文本 |
| TASK-DESKTOP-INSTALLER-001 | DONE | PASS | 沿既有计划 | Windows NSIS 安装器及隔离恢复验收 |
| TASK-AGENT-008 | DONE | PASS | 沿既有计划 | Codex 原生生图事件传输与短提示词审计 |
| TASK-ORCH-REPLAN-001 | DONE | PASS | 沿既有计划 | 编排计划失败项重排与依赖闭包 |
| TASK-AUDIT-20261003 | DONE | PASS | 沿既有计划 | 全项目任务盘点与可本地闭环项收口 |
| TASK-GOV-GOALS-001 | DONE | PASS | 沿既有计划 | 项目建设目标与验收基线 |
| TASK-UI-COMPONENT-BOUNDARY-001 | DONE | PASS | 沿既有计划 | MCP 设置组件职责拆分 |
| TASK-UI-011 | DONE | PASS | P1 | 图片选择工具栏与新增页面 UI 规则回归 |
| TASK-PROV-005 | TODO | NOT_VERIFIED | P1 | Desktop 供应商非秘密配置 durable 保存与恢复 |
| TASK-PROV-006 | TODO | NOT_VERIFIED | P1 | Desktop image 提交连接门禁与 health 统一 |

详情及依赖、验收、责任人以 [机器账本](../../governance/task-ledger.json) 为唯一来源。本轮 [verification](verification.md) / [review](review.md) / [原始证据索引](evidence/current-fadfabf/manifest.json) 分别保留已发生的来源、独立审查和历史FAIL。
