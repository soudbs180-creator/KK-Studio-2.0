# 功能与融合规格

当前产品源码已冻结 `cc184e59`，本机正式 Native6、真实 Ollama13 和隔离 NSIS 生命周期已有 PASS；最新完整验证、不同产物身份、Hosted 及最终验收的状态以 [最终记录](mainline-final-status.md) 为准。以下旧阶段保留执行时边界，不提前标 DONE。

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

## 实际验收触发的 2.1.18 关联修复

默认 MCP auto 首次及重启后均被官方 SDK1.30 stateful server HTTP400拒绝，而官方 SDK control 与 KK explicit legacy 路径成功。修正握手 transport rejection 分类；标准现代请求补同源 metadata/headers、supportedVersions、x-mcp-header 映射与无效 schema 工具过滤，版本拒绝仅在明确可用 legacy 时转一次 initialize。认证、限流、服务故障、坏成功响应、错误ID、取消和重定向继续失败关闭；不引入SDK2产品依赖，也不扩展OAuth/MRTR/通用自动工具。SDK1.30控制是MIT，临时SDK2控制包为Apache-2.0，许可按各自准确版本记录。协议源码按固定官方规范独立实现，未复制SDK函数体。

Linux AppImage producer 利用官方 linuxdeploy 的 PATCHELF override，仅保护本次manifest列明且source/target size/hash/mode完全等同的opaque运行资源，应用与GTK ELF仍委托真实工具。before/after sourceHEAD/input、private session ownership/sealed config、实际最终包hash绑定；无法验证即失败。保持严格package checker及原manifest，不改hash掩盖打包突变；按当前产品名/版本/架构选精确包，producer不额外删除；上游CLI构建目录生命周期照旧，旧证据另存。Windows路径使用双侧realpath，Mac允许两等价根URL，均不扩大数据/协议边界。Desktop/Web按现行规则共同递增2.1.18，Mobile2.1.1；重跑完整verify、Native与三平台安装/包门禁。
