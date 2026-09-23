# 未完成事项与边界（2026-09-22）

本表依据当前 `docs/governance/task-ledger.json`、功能登记册及本次可取得的运行证据。任务是工程进度，功能 REAL/PARTIAL/PROTOTYPE 是产品能力，两者不能互相替代。之前的完成记录不证明新 Design System 已经覆盖同一页面。

| 范围 / 任务 | 本轮已推进 | 仍需完成 |
| --- | --- | --- |
| Design System / TASK-DS-001 | PDF审计与v1.1校正；双主题8色；基础控件与设置接线；旧UI规范改为统一入口；TASK-DS-002补新版Tauri实际资源包与重启验证 | 在线Ardot变量/组件/实例写入后回读；用户最终视觉验收 |
| 共享组件 / UI-001 | 语义颜色、前景配对、公共按钮/字段/选择/开关规范与自动检查；目录/Skill字段、图标按钮、筛选胶囊与设置遗留覆盖已迁移 | 后续页面继续使用唯一tokens和共享控件；专项几何例外保留来源，不能把本批当所有历史界面的逐像素验收 |
| 逐页视觉 / UI-004 | 已覆盖项目库、Skills、ComfyUI目录及设置分区；补窄屏/长文本/保存取消回焦与浅色SVG图标；实际Tauri双主题8色及重启后偏好/Skill保留 | 在线页面Frame缺口与用户同状态视觉验收仍待补；新Design System不补足缺失的页面Frame |
| 新功能 UI / TASK-UI-005 | 已补 Agent/图片双通道、真实协议与受保护首次准备、插件管理入口、提示词库、文本方式和平台说明 | DONE/PASS：独立预检、原工程327/241及新Tauri验收通过；真实服务边界保留；用户追加的交互专项继续 |
| 交互专项 / TASK-UI-006 | 12处折叠/弹层/HUD/背景/窄屏入口问题已修复；原工程327/261、独立预检及新Tauri PASS | DONE；外部服务与视觉源边界不变，见[验证](../2026-09-22-ui-interactions/verification.md) |
| 三档响应式 / TASK-UI-007 | DS1.2规则先行；手机/平板/电脑及短屏、图标、输入、菜单焦点已适配，原工程356/286与带Agent新Tauri UI审计通过 | DONE/PASS；真实手机/平板软键盘、缺失移动Frame与用户视觉确认保留，见[验证](../2026-09-22-responsive-ui/verification.md) |
| 输入框规范 / TASK-UI-008 | DS1.3先补契约；首页/API/Agent共用输入行为与几何，修复焦点、多行、附件、型号参数、菜单避让/滚动及短屏发送 | DONE/PASS；356/295、独立补审及32组新Tauri输入检查通过，真实软键盘与用户视觉确认保留，见[验证](../2026-09-23-input-contract/verification.md) |
| TaskHost / T5、BACKEND-TEXT-NODE | 沿用当前已实现的任务提交、文本链与保护 | 完整进程退出/重启恢复、原生health回写和真实Provider验收；本轮未改业务实现 |
| ComfyUI / T6、EXT-COMFY | 当前适配器、工作流文件管理已有局部能力 | 前端到原生生成命令接线、真实模型/GPU执行，不能把工作流导入当出图成功 |
| 对话与MCP / BACKEND-CONVERSATION、BACKEND-MCP-AUTO | 已落实双通道、独立草稿/权限、连接/断线/审批/停止反馈；真实协议与首次初始化有受控验证；功能卡仍PARTIAL | 本地服务、所需CLI、端到端工具调用与双端运行证据；源码/fixture不证明真实服务就绪 |
| 音视频 / BACKEND-MEDIA-001 | 音频请求服务层已有实现 | 生成入口和真实供应商接线；当前视频/音频演示结果不等于真实生成 |
| 平台 / BACKEND-PLATFORM | WebDAV/代理等服务层已有局部实现 | 账号、积分、云同步UI、记忆及代理完整产品链；逐项依据实际能力显示Prototype或禁用原因 |
| 发布与外部验收 / T7、EXT-GIT、EXT-PROVIDER等 | 当前本地测试不替代外部证据 | 当前版本安装/恢复包、hosted CI/正式PR、远端保护与真实Provider验收分别收口 |

本批工程迁移 `TASK-DS-002` 已完成（DONE/PASS，309单测/229浏览器及原工程新Tauri验证通过），详见 [逐页迁移验证](../2026-09-22-design-system-pages/verification.md)。`TASK-DS-001`、`UI-001`、`UI-004` 保留 PARTIAL；完整清单以任务账本为准。初版“新版Tauri尚未验证”已由本批新构建运行证据替代，TaskHost任务恢复没有因此完成。

TASK-UI-005 的 UI 入口与功能状态对齐已收口。用户追加的项目/画布折叠、弹窗与功能开关、左上角进度重叠及点阵缩放已由TASK-UI-006完成，详见 [交互验收](../2026-09-22-ui-interactions/verification.md)。之后仍需 T5 进程重启/恢复与 health 回写、T6 前端到原生命令，以及真实 Provider/GPU/MCP 服务和在线 Ardot 各自的验收。代码或 fixture 不能替代实际外部能力。

2026-09-23续：原工程已保留TASK-AGENT-002的Windows托管进展。其余Agent/网页平台及真实服务按[最新Agent清单](../2026-09-22-agent-desktop/remaining.md)核对；上表历史边界不覆盖该任务的新证据。UI最新规范为DESIGN-SYSTEM 1.3。
