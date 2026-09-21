# Intent

## 用户目标

用户要求打开本机 MiniMax Design，逐项检查页面、菜单、弹窗、点击、取消、键盘和使用步骤，避开付费生成，尽量把可观察到的功能与交互复刻到 KK Studio，并把可合法模仿的 Skills 与 MCP 能力纳入项目。

## 本轮范围

本轮以真实安装包 `C:\Users\Administrator\AppData\Local\Programs\MiniMax Design\current` 和真实应用操作证据为行为来源，完成以下可交付范围：

- 审计 Project Library、开始创作、Skills、Connectors、ComfyUI、设置、文件/窗口/帮助菜单及其弹窗。
- 复刻本地 Skill 的浏览、筛选、JSON/`SKILL.md` 导入、创建、编辑、启用/禁用、卸载和应用到创作草稿；MiniMax zip 导入契约作为下一步明确边界记录。
- 增加连接器目录，提供详情弹窗、关闭、Escape、焦点恢复，以及跳转 MCP 设置的可用路径。
- 强化 MCP Streamable HTTP 配置的发现、分页、大小上限、连接失败清理、组件卸载清理和损坏持久化提示。
- 记录 Web 开发运行时的同状态 DOM/行为证据和未验证边界。

## 明确边界

不执行 MiniMax 会员生成、不提交任何付费或外部任务、不登录或上传日志、不安装 40GB ComfyUI 工作流、不安装本机第三方连接器、不复制闭源源码或私有凭据。云端账号、积分、真实 provider 生成和桌面连接器安装继续显示为 Prototype 或未接入。

## 完成标准

实现、测试和运行证据必须能从当前候选分支复现；结果按 DONE、PARTIAL、NOT VERIFIED 区分。完整 MiniMax 产品覆盖和 Tauri release 验收超出本轮证据，任务保持 PARTIAL。
