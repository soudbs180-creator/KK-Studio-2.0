# 当前任务状态报告（2026-10-09）

权威账本106项：{"DONE":62,"TODO":14,"PARTIAL":26,"BLOCKED":4}，44项开放。下表是本次文档head候选的状态快照；DONE描述已实现的本地scope，不代填最终Hosted、合并、外部服务/设备或用户产品验收。

本轮已正常合并并验证PR38静默启动和PR40单排标题栏；Mask保留上方操作栏与App灯箱、统一像素蒙版和恢复安全，当前445browser/102Rust/同EXE多组原生/生产Web及独立scope验收完成，测试状态定位冲突已修。只增加已审Mask的实现与真实验收两项账本，104主线对象全部保留。

仍需跟进：TASK-UI-012原执行者在途，TASK-PLUGIN-DEV-001开发插件错误未修；TASK-IMAGE-EDIT-VERIFY-002真实Provider/任意几何漂移/物理手机/用户视觉未验，签名安装/外部能力和其他开放任务按下表保持状态。源码合并不自动切换现有快捷方式或发布产物。

[完整本轮验证](verification.md) / [独立审查](review.md) / [机器账本](../../governance/task-ledger.json) / [生成任务视图](../../governance/TASK_LEDGER.md)。最终精确head/PR/主线CI须实际回读，当前不预填。

| Task                                | 任务                                                         | 状态    | 验证         |
| ----------------------------------- | ------------------------------------------------------------ | ------- | ------------ |
| TASK-IMAGE-EDIT-001                 | 统一图片编辑蒙版与连续重绘                                   | DONE    | PASS         |
| TASK-IMAGE-EDIT-VERIFY-002          | 图片编辑真实模型与移动设备效果验收                           | TODO    | NOT_VERIFIED |
| TASK-UI-013                         | 桌面标题栏与菜单合并为单排                                   | DONE    | PASS         |
| TASK-LAUNCH-001                     | 桌面与网页启动体验及图标修复                                 | DONE    | PASS         |
| TASK-MODEL-001                      | 账号级图片模型能力声明与提交校验                             | DONE    | PASS         |
| TASK-PLUGIN-DEV-001                 | 修复 Vite development 随包插件 public import 错误            | TODO    | FAIL         |
| T0                                  | 可复现候选源码与主线整合                                     | DONE    | PASS         |
| TASK-GOV-001                        | 治理源、ESLint、架构门禁和 CI                                | DONE    | PASS         |
| TASK-PROV-001                       | 冷却恢复与产品调度入口边界                                   | DONE    | PASS         |
| T1                                  | 读取保护、备份和 revision 冲突                               | DONE    | PASS         |
| T2                                  | 画布图持久化与稳定节点身份                                   | DONE    | PASS         |
| T3a                                 | 原生素材及引用最终验收                                       | DONE    | PASS         |
| T3b                                 | 完整项目包导出导入与恢复                                     | DONE    | PASS         |
| T4                                  | 统一实际图片生成入口及健康语义                               | DONE    | PASS         |
| T5                                  | 持久本地 TaskHost 与未知受理恢复                             | DONE    | PASS         |
| T6                                  | Desktop ComfyUI最小链实现                                    | PARTIAL | PARTIAL      |
| EXT-PROVIDER                        | 真实 Provider/GPU 生成验收                                   | BLOCKED | NOT_VERIFIED |
| EXT-COMFY                           | 真实 ComfyUI/模型验收                                        | BLOCKED | NOT_VERIFIED |
| T7                                  | Desktop可用版本及安装恢复验收                                | PARTIAL | PARTIAL      |
| T8                                  | 成熟Core职责和平台能力边界                                   | TODO    | NOT_VERIFIED |
| T9                                  | Web本地版及浏览器容量/离线能力                               | TODO    | NOT_VERIFIED |
| T10-PREP                            | VPS发布、备份回滚与部署配置准备                              | PARTIAL | PARTIAL      |
| T10                                 | VPS staging和生产实机验收                                    | BLOCKED | NOT_VERIFIED |
| T11                                 | 旧Web/Vercel切换与退役                                       | BLOCKED | NOT_VERIFIED |
| T12                                 | Mobile 独立形态与手机适配                                    | TODO    | NOT_VERIFIED |
| UI-001                              | UI tokens和共享组件契约                                      | PARTIAL | PARTIAL      |
| UI-002                              | 窄屏composer和动态文案溢出                                   | DONE    | PASS         |
| UI-003                              | 示例任务/账号与真实服务边界                                  | PARTIAL | PARTIAL      |
| UI-004                              | 逐页对齐、IA和最终视觉运行态                                 | PARTIAL | PARTIAL      |
| PERF-001                            | 原生素材缩略图/分页及内存IO                                  | PARTIAL | PARTIAL      |
| EXT-GIT                             | 远端PR与main保护规则                                         | DONE    | PASS         |
| TEST-PROV-001                       | Provider真实入口浏览器回归                                   | DONE    | PASS         |
| TASK-ASTRA-001                      | Astra 迁移计划与 Git 分支规则同步                            | DONE    | PASS         |
| TASK-KK2-MAIN-SYNC                  | KK Studio 2.0 本地与云端 main 树同步                         | DONE    | PASS         |
| TASK-UI-UNMERGED-001                | dirty checkout 未合并 UI 回归候选                            | DONE    | PASS         |
| TASK-UI-MAIN-001                    | 现行Figma页面校正与交互修复主线整合                          | DONE    | PASS         |
| TASK-UI-DISMISS-002                 | 窄屏侧栏关闭与大图重绘稳定性                                 | DONE    | PASS         |
| TASK-MAIN-CLOSE-002                 | 未完成子任务汇总验收与主线同步                               | DONE    | PASS         |
| TASK-UI-CLOSE-003                   | 现行Figma页面缺口复核与交互收口                              | DONE    | PASS         |
| TASK-PERF-ASSETS-001                | 素材列表元数据和原件按需读取                                 | DONE    | PASS         |
| TASK-GOV-002                        | 跨AI自主开发与分支质量门禁                                   | DONE    | PASS         |
| TASK-AUDIT-SEC-001                  | 安全边界与异常任务状态审计                                   | DONE    | PASS         |
| TASK-CAP-001                        | 本地 Skill/MCP/ComfyUI 能力补齐                              | PARTIAL | PARTIAL      |
| TASK-MINIMAX-001                    | MiniMax Design 交互审计与本地技能/MCP复刻                    | PARTIAL | PARTIAL      |
| TASK-MCP-PROTO-001                  | MCP 2026 协议协商与旧版兼容                                  | PARTIAL | PARTIAL      |
| TASK-MCP-REGISTRY-001               | MCP 多标签页配置写入不丢失                                   | DONE    | PASS         |
| TASK-MCP-REGISTRY-002               | 旧版超限 MCP 配置无损恢复                                    | DONE    | PASS         |
| FEATURE-SYSTEM                      | 功能卡片体系、状态看板与后端化路线                           | DONE    | PASS         |
| BACKEND-IMAGE-PARAMS                | 图片比例与清晰度真实透传供应商                               | PARTIAL | PARTIAL      |
| BACKEND-TEXT-NODE                   | 文本节点接入统一任务宿主                                     | PARTIAL | PARTIAL      |
| BACKEND-MEDIA-001                   | 视频与音频节点真实生成链                                     | TODO    | NOT_VERIFIED |
| BACKEND-MCP-AUTO                    | MCP 工具自动调用编排                                         | TODO    | NOT_VERIFIED |
| BACKEND-PLATFORM                    | 平台账号/积分/云同步/记忆/代理后端                           | TODO    | NOT_VERIFIED |
| BACKEND-ASTRA-001                   | Astra 研究助手实现                                           | TODO    | NOT_VERIFIED |
| UI-SKILL-POPOVER-001                | 窄屏首页弹层遮挡修复与 Skill 空态断言更新                    | DONE    | PASS         |
| TASK-RULES-003                      | 修复功能状态与运行证据门禁                                   | DONE    | PASS         |
| BACKEND-CONVERSATION                | 对话面板文本多轮能力与实际状态收敛                           | PARTIAL | PARTIAL      |
| TASK-DS-001                         | Design System校正与公共UI对齐                                | PARTIAL | PARTIAL      |
| TASK-DS-002                         | Design System逐页迁移与桌面验收                              | DONE    | PASS         |
| TASK-UI-005                         | 新增功能 UI 入口与能力展示对齐                               | DONE    | PASS         |
| TASK-UI-006                         | 折叠与弹层交互、画布重叠和缩放背景修复                       | DONE    | PASS         |
| TASK-AGENT-001                      | 默认 Codex 主 Agent 与 KK 生成任务接入                       | PARTIAL | PARTIAL      |
| TASK-AGENT-002                      | 桌面本地 Agent 托管与其他登录软件适配                        | PARTIAL | PARTIAL      |
| TASK-UI-007                         | 手机平板电脑三档尺寸与图标对齐                               | DONE    | PASS         |
| TASK-UI-008                         | 重新制定创作输入框规范并统一三档实现                         | DONE    | PASS         |
| TASK-AGENT-003                      | Agent 图片附件、画布引用与视口选择操作                       | DONE    | PASS         |
| PLUGIN-DESKTOP-001                  | 修复桌面画布插件的 CSP 加载路径                              | DONE    | PASS         |
| REL-2.1.0                           | 2.1.0 本地集成与源码上传                                     | DONE    | PASS         |
| TASK-RULES-004                      | 现行规则与 Markdown 一致性审计                               | DONE    | PASS         |
| TASK-DOCS-HISTORY-001               | 历史 Markdown 链接与缺失日志勘误                             | TODO    | NOT_VERIFIED |
| TASK-ORCH-001                       | Agent 编排领域状态机与编排器工具面                           | DONE    | PASS         |
| TASK-ORCH-002                       | TaskWorkbench 阶段计划视图与审批交互                         | DONE    | PASS         |
| TASK-ORCH-003                       | 编排器驱动生成执行与计划门禁                                 | TODO    | NOT_VERIFIED |
| TASK-CANVAS-001                     | 画布交付契约与当轮产物收集                                   | PARTIAL | PARTIAL      |
| TASK-TASKSTATE-001                  | 统一任务态契约定稿                                           | PARTIAL | PARTIAL      |
| TASK-TASKSTATE-002                  | 供应商成本报价回执接入                                       | TODO    | NOT_VERIFIED |
| TASK-PROV-002                       | 多供应商接入与多目标配置（Provider Connectivity）            | DONE    | PASS         |
| TASK-COMPARE-001                    | 画布图片对比操作                                             | DONE    | PASS         |
| TASK-COMPARE-002                    | 对比控件窄屏命中区主线回归                                   | DONE    | PASS         |
| TASK-VERSION-001                    | 桌面/Web/Mobile 独立版本源与自动递增                         | DONE    | PASS         |
| TASK-LOCAL-SERVICE-001              | Web 本机伴随服务与既有浏览器数据迁移                         | PARTIAL | PARTIAL      |
| TASK-CLOSEOUT-2026-09-28            | 合并后版本与 VPS 状态收口                                    | DONE    | PASS         |
| TASK-POSTMERGE-MIGRATION-2026-09-28 | 主线合并后迁移操作单收口                                     | DONE    | PASS         |
| TASK-UI-CANVAS-001                  | 画布会话分栏与固定侧栏交互修复                               | DONE    | PASS         |
| TASK-UI-HOME-002                    | 首页与对话输入区剩余设计反馈收口                             | DONE    | PASS         |
| TASK-UI-GOV-003                     | 新版 Figma 四页治理基线与 UI 模板收口                        | DONE    | PASS         |
| TASK-CANVAS-KAWORKAI-001            | Kaworkai 无限画布交互研究与本地画布增强                      | DONE    | PASS         |
| TASK-PROJECT-001                    | 项目落地与分支收敛                                           | DONE    | PASS         |
| TASK-UI-010                         | 现行 UI 规则与真实操作回归                                   | DONE    | PASS         |
| TASK-PROJECT-SIDEBAR-001            | 侧栏项目列表与真实项目数据统一                               | PARTIAL | PARTIAL      |
| TASK-PROV-003                       | Codex Provider 配置注入与 model catalog 落盘（agent 侧接线） | PARTIAL | PARTIAL      |
| TASK-PROV-004                       | Claude Code settings.json 落盘（agent 侧接线）               | PARTIAL | PARTIAL      |
| TASK-AGENT-004                      | Google Interactions 对话和生图                               | PARTIAL | PARTIAL      |
| TASK-AGENT-005                      | Gemini CLI 账号登录通道（免 API Key 对话）                   | PARTIAL | PARTIAL      |
| TASK-MEMORY-001                     | 本地长期记忆服务接入对话                                     | PARTIAL | PARTIAL      |
| TASK-MEMORY-002                     | 跨产品共享本地记忆（本机共享）                               | PARTIAL | PARTIAL      |
| TASK-AGENT-007                      | Codex 通过本机 CodeBuddy CLI 受限委派短文本                  | DONE    | PASS         |
| TASK-DESKTOP-INSTALLER-001          | Windows NSIS 安装器及隔离恢复验收                            | DONE    | PASS         |
| TASK-AGENT-008                      | Codex 原生生图事件传输与短提示词审计                         | DONE    | PASS         |
| TASK-ORCH-REPLAN-001                | 编排计划失败项重排与依赖闭包                                 | DONE    | PASS         |
| TASK-AUDIT-20261003                 | 全项目任务盘点与可本地闭环项收口                             | DONE    | PASS         |
| TASK-GOV-GOALS-001                  | 项目建设目标与验收基线                                       | DONE    | PASS         |
| TASK-UI-COMPONENT-BOUNDARY-001      | MCP 设置组件职责拆分                                         | DONE    | PASS         |
| TASK-UI-011                         | 图片选择工具栏与新增页面 UI 规则回归                         | DONE    | PASS         |
| TASK-PROV-005                       | Desktop 供应商非秘密配置 durable 保存与恢复                  | TODO    | NOT_VERIFIED |
| TASK-PROV-006                       | Desktop image 提交连接门禁与 health 统一                     | TODO    | NOT_VERIFIED |
