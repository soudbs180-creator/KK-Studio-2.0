# UI feature parity implementation plan

> 使用 executing-plans 在本任务顺序实施；最后按 REVIEW.md 进行一次独立只读预检。

Goal: 修复新增功能的用户入口、状态和操作对应关系。
Architecture: 复用 Agent/plugin 外部 store、promptLibrary、现有 Modal/DS tokens；不新增后端或替代状态系统。
Spec: [spec.md](spec.md)。分支 fix/TASK-UI-005-feature-parity，HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4，加当前工程未提交候选快照。

- [x] 审计入口矩阵；隔离快照；typecheck/lint/build 基线；登记任务/提示词功能卡。
- [x] 写浏览器失败回归：插件入口、提示词浏览应用、Agent 双通道与错误状态；连接 store 用例覆盖忙碌/断线/取消连接与凭据。
- [x] 修复 Agent 展示/控件、独立草稿、停止/审批反馈、设置连接状态；必要生命周期修复仅支持 UI 契约。
- [x] 修复插件入口；实现提示词库面板/入口，保留已有草稿/模型/附件。
- [x] 更正 Web/Desktop、版本、代理等能力说明；核对其他新功能缺口。
- [x] npm verify、窄屏/主题、Web 与新 Tauri 验证；独立预检并修复；仅回传任务增量，更新账本/功能卡/剩余事项。

Review focus: 断线后误发图片；两通道草稿互相覆盖；重复提交和停止失败；提示词恶意链接/迟到响应/超长文本；Token/测试产物污染。相关测试分别绑定对应交互。

Ruling: 应用级代理与 WebDAV 产品链缺持久化/冲突/素材契约，保持清晰能力说明并登记后续，不仅凭函数存在增加“同步成功”。音频服务尚未统一任务/资产链，现有节点继续明确本地演示。

Ruling: 旧 catalog-pages 测试把画布插件管理定位到 MCP，按本次修复改为插件分类；旧文本测试只要求状态文案“优化”，改为验证实际输入含剧本指令。保留原布局、语音、空态、四个动作与 Escape 断言。颜色用最终 token 值等待 CSS transition 完成后核对，不采集中间帧作为静态配色结论。

协议复核补充：按 vendor/canvas-agent 的 protocol 6 命名 SSE 消费 hello；先确认事件注册再激活和推送快照。服务连接与会话准备分开；空 idle 会话由用户点击受保护专用接口准备，既有会话不自动重建；warning 显示可选工具异常并允许画布指令。恢复 hello 中的运行状态与审批队列，旧连接停止/审批回执不能覆盖新连接。

补充裁定：不直接修改共享且被忽略的 vendor 作为唯一实现。受版本控制的 scripts/agent/ 提供安全初始化 handler 和幂等安装器，agent:build 调用后再编译。仅增加专用条件准备路由，不改变原 threads/new/reset/resume。旧服务不支持时明确报错，无自动降级。
