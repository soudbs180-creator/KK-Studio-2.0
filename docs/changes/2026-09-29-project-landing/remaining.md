# 未完成项与交付边界

本轮检查任务账本全部 90 项、功能注册表全部 34 项和 22 个已登记 worktree；结果索引见 [audit](audit.md)。检查包含读取实现、规范、Git 与现有证据，以及当前集成树的完整自动化和受影响桌面路径实测。没有逐项执行所有外部验收。

## 后续落地顺序

| 顺序 | 任务 | 当前可用部分 | 完成还需要什么 |
| --- | --- | --- | --- |
| 1 | T7 | 当前源码、production Web 与无安装器桌面程序 | 安装/卸载、干净 Windows、离线、损坏包和回滚实测；签名与正式发布验收 |
| 2 | TASK-ORCH-002/003 | 阶段状态机、审批/CAS 和 Agent 工具契约 | TaskWorkbench 真实阶段计划/审批 UI；审批后依赖执行、失败单项重试及产物联动 |
| 3 | TASK-PROJECT-SIDEBAR-001 | 同一快照的真实项目创建/打开/改名/确认删除 | 文件夹、置顶、成员顺序的 Web/原生快照与项目包迁移；当前 UI 明示会话态 |
| 4 | T5、TASK-TASKSTATE-001 | 原生任务 journal 和 unknown/重复提交保护 | 真实受理后断线/重启/迟到结果与恢复闭环；统一任务态定稿 |
| 5 | T6、EXT-COMFY | ComfyUI HTTP 基础适配、工作流目录 | App 创作入口接线、真实本机工作流/模型/GPU 验收；当前 local_only 不能冒充已生成 |
| 6 | TASK-PROV-003/004、TASK-AGENT-004/005 | 无密钥 Codex/Claude 配置落盘、Google/CLI fixture 流程 | 设置 UI 和目标 CLI 消费对拍；真实 Google 凭据/登录及图片归档验收 |
| 7 | TASK-MEMORY-001/002 | 记忆开关、KK 私有/共享文件契约、隔离与并发保护 | 真实 Codex 提炼/引用、Web 目录授权、豆包/WorkBuddy 支持的适配器与联调 |
| 8 | TASK-MCP-REGISTRY-001/002、TASK-MCP-PROTO-001 | MCP 目录、手动确认 HTTP 调用、随包插件 | 多标签页写入不丢失、旧超限配置无损恢复、2026 协议协商；stdio/自动调用接线 |
| 9 | TASK-LOCAL-SERVICE-001、T9、BACKEND-PLATFORM | 本机 loopback 配对/快照/素材/迁移/备份 | 伴随服务安装/更新、真实登录、浏览器容量与离线验收、平台账号/积分链路 |
| 10 | BACKEND-MEDIA-001、T8、T12、PERF-001 | 节点与 responsive Web、本地素材分页 | 视频/音频真实生成、平台职责拆分、原生 Mobile、原生大素材 IO/缩略图闭环 |

## UI 与竞品范围

- MiniMax 已有技能/MCP 目录和本地操作，Kaworkai 的撤销/重做、网格吸附和图层搜索定位接入实际项目画布。竞品远程 AI、云端 board、协作、积分和付费插件没有接入。
- 四页 Figma 是当前规则来源，旧 44px composer、304px 侧栏和旧 12px 卡片半径证据保留历史含义；当前数值及同状态证据见 [verification](verification.md)。
- UI-001、UI-004、TASK-DS-001 保持 PARTIAL：其余历史页面仍需逐页迁移，用户最终视觉验收与真实移动硬件结果尚未记录。
- 可用版本仍含明确的 Prototype 页面，例如账号、积分和部分本地服务；不会因本轮合并变成真实后端。

## 外部条件

- EXT-PROVIDER/EXT-COMFY：真实模型凭据、工作流/模型/GPU 未提供当前验收环境。
- T10/T11：VPS、正式域名、当前权限、备份恢复与旧 Vercel 切换没有完成实机验收；既有 HTTP 301 不能证明服务器已运行最新版本。
- Mobile 2.1.1 是规划版本；本轮 responsive Web 检查不代表生成了 Mobile 包。

## 保留的工作

原工作区和分支保留。承接映射及未收敛原因见 audit；其它 dirty worktree 没有被重置或删除。旧 PR 只在新的集成 PR 实际合并后关闭并关联承接记录。
