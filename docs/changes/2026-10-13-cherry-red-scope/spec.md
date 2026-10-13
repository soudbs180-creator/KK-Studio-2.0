# 功能与融合规格

任务：TASK-CHERRY-RED-001。日期：2026-10-13。

## 采用与保留

- 保留 React 18/Tauri 2、Figma tokens、Provider identity/catalog、Codex 默认 Agent、Google 独立会话、TaskHost/journal、9 态任务和 unknown 防重复提交。
- 消息显示采用共享安全 Markdown renderer；普通、Codex 与 Google 消息共用。原字符串和存储格式不变；HTML 不执行，危险 URL 不变成可点击链接。
- 内容分享采用用户主动复制与本地 Markdown 导出；不新增公网分享服务，不导出凭据或内部权限对象。
- 多供应商沿现有连接 registry 增量增加协议与认证字段，旧配置默认现有 OpenAI 兼容/密钥模式。无密钥仅允许显式配置的 loopback 本地服务。Ollama/LM Studio 是可选本地接口，不捆绑其软件或模型。
- 精选助手覆盖编程、图片提示/编辑指导、视频脚本/分镜，支持自定义。助手指令是用户任务偏好，不授予工具/系统权限；图片/视频实际生成仍受已有模型能力门禁。
- 多模型文本对话冻结同一请求及每路精确 connection/model 身份；每路状态与结果独立，取消/失败不清空其他结果；迟到响应不能写入另一项目。
- MCP 复用 outbound client 与 inbound canvas server，保持方向隔离；校准旧文档，不另造 MCP 系统。通用自动工具只在已绑定/授权的真实能力范围接入。
- 明暗/系统主题保留；透明窗口单列原生能力与支持条件，关闭后能恢复，Web 不假称原生透底。
- 三 OS 的凭据、随包 runtime、锁/进程归属、资源 platform/arch 与打包矩阵统一。Unix 不仅替换可执行文件名，还须覆盖独占 owner、子树退出与恢复；缺少安全生命周期时不得假启用。

## 对参考实现的选择

Cherry 固定源码 2e2e2e1b32a1eb2c796a843cae67148c5eb53269，仅学习协议、交互和故障测试设计；不整体复制 Electron/React19 主源码。provider-registry 独立 MIT 包保留候选，只有收益明确才引入；AI Core 发布包许可矛盾暂不采用。Markdown 首先利用已有统一解析依赖，避免新增重复底层。

## 失败与兼容

认证失败不自动换账号/协议重发；流式草稿不算最终成功；会话、模型和项目身份变化须围栏；损坏读取不覆盖原件。外部网站入口准确标为网站，不能显示已接入 API 或复用订阅。安装包就绪、账号就绪、模型服务就绪各自说明。

## 必须形成的证据

定向单测、类型/静态检查、构建、受影响浏览器流程；原生修改另跑 Rust 与 Windows lifecycle。macOS/Linux 无实际设备或 runner 时标 NOT VERIFIED，配置文件不能证明安装成功。真实付费 Provider 不在本轮验证范围。
