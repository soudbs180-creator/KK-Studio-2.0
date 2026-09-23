# TASK-UI-005 验收契约

## 范围

- ConversationPanel/AgentConnectionSettings：图片与 Agent 独立通道、草稿和权限。连接中/未连接/执行中/失败可见；断线不能静默把 Agent 指令转为图片任务；发送、停止、审批错误有反馈；UI 不显示未传递的图片附件/模型。
- 首页与对话插件菜单读取实际插件 store，进入 settings/plugins；MCP 与画布插件各自命名。已安装/停用状态如实显示。
- 提示词库复用 promptLibrary 服务与 Modal；首页和图片对话可进入，用户主动加载来源，搜索/分页/查看文本/应用到草稿。使用只追加文本，不发送任务、不导入远程图片/模型参数；空态、错误、缓存、取消和关闭后迟到响应有处理。
- 设置/顶栏按实际 Web/Desktop 运行平台显示；版本来自应用配置。网络代理注明需要独立启动、未全局接线。Agent Token 用密码字段、仅内存，清除旧 localStorage 副本。
- DS1.1 共享按钮/字段/颜色；新面板两主题/8色、390/768/1920、不横向溢出；Escape 回焦。

## 边界

本次不把音频/视频服务层、WebDAV manifest、ComfyUI adapter 宣称为已完成的生成/同步产品；它们缺任务/资产或冲突契约。逐项记录缺口与已有入口。外部 Provider、真实远端提示词源、GPU、Ardot 在线写入、发布分别验收。新增 UI 为工程补充，未声称来自缺失的页面 Frame。

## 验证

先写有意义的行为回归并观察失败；连接/审批/断线 fixture 明确标记为受控服务。完整 npm verify、独立 dirty-diff 预检，Web production preview 与重新构建 Tauri release 各自留截图/DOM/资源指纹。快照并恢复测试对既有 docs/evidence 的输出，不覆盖历史证据。

补充核对：文本创作方式必须修改可见输入且切换时保留用户正文；音频不展示文案模式。模板字符上限不截断用户内容，旧音频前端草稿断言改为实际本地演示标识。

连接凭据补充：核对当前 vendor/canvas-agent/src/server/http.ts，服务已支持 x-canvas-agent-token 请求头与 CORS。HTTP/SSE 一并改用现有请求头鉴权，移除 URL Token；不更改服务协议或权限。SSE 中断继续交给现有状态机，取消关闭读取。

协议复核补充：按 vendor/canvas-agent 的 protocol 6 命名 SSE 消费 hello；先确认事件注册再激活和推送快照。服务连接与会话准备分开；空 idle 会话由用户点击准备，既有会话不自动重建；warning 显示可选工具异常并允许画布指令。恢复 hello 中的运行状态与审批队列，旧连接停止/审批回执不能覆盖新连接。
