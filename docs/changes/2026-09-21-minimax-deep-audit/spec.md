# Spec

## MiniMax 行为基线

真实 MiniMax Design 当前可观察到：左侧开始创作/项目库/技能·连接器/ComfyUI 工作流入口；Skills 页有 Skill 与我的 Skill、分类筛选、搜索、导入 Skill、创建 Skill；连接器页列出 Blender、Photoshop、After Effects、Houdini、TouchDesigner、Unity、Unreal Engine、FastMoss、Apify、LibTV；连接器未安装时提供准备说明，安装按钮必须保持未接入状态。MCP 设置支持本地/远程配置、工具发现与状态反馈。ComfyUI 入口提供工作流库、导入/新建、资源许可与大体积下载提示。

## KK Studio 交互规格

- `/` 的 Skill 页面由 `SkillsPage` 负责，顶部在技能与连接器之间切换。
- Skill 列表支持搜索和分类筛选；内置模板通过 effect 初始化，避免渲染副作用。
- 导入仅接受 JSON、`SKILL.md` 或包含 `SKILL.md` 的 zip，读取上限 2 MiB；本地持久化只保存非敏感元数据与指令。
- 编辑弹窗支持创建/编辑、取消、Escape、关闭后的焦点恢复；编辑现有 Skill 时 ID 不可变。
- 应用 Skill 只拼接到当前创作草稿，指令合计超过 4,000 字符时拒绝并保留原草稿；超过安全阈值的卡片显示原因。
- 未安装连接器详情显示 `Prototype`，关闭和 Escape 均恢复触发按钮焦点；安装按钮为真实 disabled，并说明未接入原因；跳转到 MCP 设置是可用路径。
- MCP 配置对远程地址要求 HTTPS，本机地址允许 HTTP；响应体上限 2 MiB，连接失败和组件卸载都必须释放会话、AbortController 与客户端；损坏的持久化配置不能被静默覆盖。

## 数据边界

Web 项目和设置继续使用现有本地 IndexedDB/localStorage 契约。MCP API key、OAuth、代理凭据和第三方账号不进入 localStorage、URL、项目文件或日志。连接器目录是行为原型，不声称已经安装或连接了外部应用。

## 验收状态

Skill、Connector 和 MCP 的 Web 开发运行时为本轮实现范围；MiniMax 的付费生成、真实外部连接器、真实云端 provider、Tauri release 和 Figma 专属节点证据不在本轮完成标准内。
