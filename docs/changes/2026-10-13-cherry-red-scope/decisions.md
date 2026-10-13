# 融合取舍与近期路线

## 保留与采纳

|能力|决策|原因与实现|
|---|---|---|
|现有React18/Tauri2、Figma规范、Codex默认Agent|保留|KK的画布、资产与可恢复TaskHost已成熟，迁移Electron/React19成本高且无本期收益|
|多供应商、本地模型|选择性融合后自研适配|现有账号registry保留身份；增加OpenAI/Anthropic/Gemini文本协议与显式loopback免密，复用现有vault与journal|
|助手|复用现有SkillRegistry并自研角色交互|五个原创代码/图片/视频角色+自定义，同一存储，无新助手库；不凭提示词宣称图片视频服务已接通|
|多模型对话|借鉴后自研|每路冻结连接/模型/历史，复用CreationTask，最多三路，部分失败/停止不清空成功结果|
|Markdown|直接复用既有MIT解析依赖|unified/remark-parse/remark-gfm生成受限React节点，不复制Cherry UI或执行模型HTML|
|分享|自研本地能力|复制原文与Markdown下载，Unicode文件名、内存URL释放，默认排除内部tool/system/error|
|MCP|保留并校准文档|已有modern discovery/legacy兼容与KK画布server；两方向不混，第三方自动工具仍独立验收|
|三桌面平台|局部重构|同一系统vault模块、按platform/arch/hash的随包runtime；Windows保留JobObject，Unix新增flock/guardian生命周期|
|透明窗口|独立实现|实际原生背景alpha读回、失败回滚；不将CSS浮岛或blur当native透底；Web明确不可用|
|Claude/Perplexity/Poe网站|入口整合|在系统浏览器打开官网，不复用cookies/账号订阅，不显示API就绪，不自动发送或购买|

## 来源与许可证

参考源码固定Cherry commit `2e2e2e1b32a1eb2c796a843cae67148c5eb53269`、文档commit `7431ed4896711fe6e910ba20a0968accccf7cd5d`。本任务学习源码调用与交互设计，没有复制其AGPL主仓库实现。

- Cherry主项目为AGPLv3，不直接混入KK现有MIT代码。不是付费许可采购。
- `@cherrystudio/provider-registry@0.1.0` 的实际包LICENSE为MIT，但KK已有registry，无需新增重复底层，保留候选。
- `@cherrystudio/ai-core@2.2.0`与`ai-sdk-provider@0.1.7`发布metadata虽标MIT，实际tarball LICENSE为AGPLv3；本期不依赖、不购买另外授权，不把它们记为MIT。
- Markdown沿用已锁定MIT依赖；Node继续保留随包LICENSE，guardian与助手指令为本任务原创。
- keyring仍3.6.3，仅启用系统平台后端；Tauri shell已在项目中，网站入口使用现有IPC/权限，无新增npm依赖。

## 路线排序

1. 本期先闭环五助手/自定义、三文本协议、本机模型、独立多模型对话、安全消息分享、三平台工程链与实际窗口状态。
2. 通过真实平台/连接验收后再扩充助手；图片/视频沿既有执行和资产归档增加真实服务，不重复造队列。
3. OCR、知识库、WebDAV、语音、市场与mini-app保持可选；现有相同能力先比较后补差距。
4. Cherry README旧路线图只作线索。Deep Research/ASR/TTS/Plugin条目历史关闭或not_planned，不以“路线图列出”当当前已实现；旧memory功能不直接引入。

所有平台安装、签名、第三方实时工具、真实Provider与用户验收继续以[实际证据](verification.md)判定。

精选角色为代码实现助手、代码审查助手、图片创意助手、图片编辑助手、视频分镜助手；支持新增自定义角色。它们是原创任务指令，图片/视频实际产出仍由已接通的模型能力执行，数量不作为验收目标。完整实施前比较和Cherry历史路线图证据保存在本仓可移植的[研究快照](research.md)。
