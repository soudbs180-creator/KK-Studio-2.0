# KK Studio · 模型接入 UI 重构修稿插件使用指南

本插件专用于在 Figma 中一键生成针对「模型接入」界面的重构设计稿。

## 生成包含内容：
1. **画板 1：`模型接入 · CLI 直连（极简重构稿）`**
   - 彻底剥离了错误混入的「浏览器后端（WebView2）」；
   - 建立了明确的按钮层级：`[ 重新连接 ]`（品牌绿高亮 Primary）+ `[ 测试连接 / 新建 ]`（Secondary 轮廓）+ `[ 断开连接 ]`（Ghost 危险灰）；
   - 清除每个输入框下方堆砌的长篇碎碎念与免责提示；
   - 优雅折叠高级连接参数，保持默认视线聚焦。
2. **画板 2：`模型接入 · 官方 API 直连（1-Click 向导稿）`**
   - 顶部提供主流厂商 1-Click 选择网格（OpenAI、Claude、Gemini、DeepSeek、SiliconFlow）；
   - 解决 Google Gemini 被孤立在页面最底部的错位设计；
   - 密码框内置「粘贴」与「显示」功能，右上角小徽标代替大段安全免责；
   - 可用模型胶囊流，点击即设为主用。
3. **画板 3：`四大病灶与 Token 对照白皮书`**
   - 详细列出修改前后的直觉对比与三层 Token 映射关系。

---

## 运行方式（10 秒极速导入）：
1. 在 Figma 桌面端打开设计文件：`https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3`。
2. 点击顶部菜单栏的 **Plugins（插件） › Development（开发） › Import plugin from manifest...（从 manifest 导入插件...）**。
3. 选择本目录下的 `manifest.json`（路径：`D:/kk-studio/KK-Studio-2.0/design/figma-plugin/manifest.json`）。
4. 导入后在插件列表中点击运行 **「KK Studio · 模型接入 UI 深度重构修稿」**。
5. 插件将在几秒内自动在专属独立页面 `04 · 模型接入 UI 重构 (2026-11-09)` 建立原生、完全可编辑的全新高保真画板！
