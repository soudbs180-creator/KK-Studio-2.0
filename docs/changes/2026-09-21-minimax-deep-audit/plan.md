# Plan

1. 读取仓库规则、治理账本、UI/架构文档，确认 `D:\kk-studio-next` 为唯一工程。
2. 使用 CUI 只读操作 MiniMax Design，逐页记录菜单、弹窗、取消、Escape、模型/技能选择和付费边界。
3. 静态检查安装包的 manifest、gateway、mcp-tools 和 bundled plugin contract，只提取可观察接口，不搬运闭源代码。
4. 在候选分支 `codex/feat/minimax-deep-replica-root` 实现 Skill registry/UI、Connector catalog、MCP 生命周期和错误边界。
5. 运行 typecheck、lint、unit、UI standards、format、build；用固定端口 1421 的 Vite 开发运行时验证同状态点击、Escape、焦点恢复和 MCP 校验。
6. 将真实操作证据、代码变更、验证结果和剩余边界写入本变更包、`docs/PROGRESS.md` 和 task ledger。

当前变更只在候选分支，未合并或推送主线。没有执行生成、付费、账号登录、外部上传或第三方连接器安装。
