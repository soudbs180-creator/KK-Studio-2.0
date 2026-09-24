# TASK-PROV-004 intent — Claude Code settings.json 落盘（agent 侧）

- 日期：2026-09-24
- 任务：TASK-PROV-004（依赖 TASK-PROV-003，堆叠分支 feat/TASK-PROV-004-claude-landing）
- 归属功能：FEAT-030 多供应商接入与多目标配置（PARTIAL）

## 为什么做

TASK-PROV-003 已把渲染产物落到 Codex（config.toml 合并 + catalog 指针 + CLI）。用户核心诉求是「接入足够多的供应商/工具」——Claude Code 是第二重要的目标工具（agent 已内置 `claude.ts` 执行器）。Claude Code 的配置载体是 `~/.claude/settings.json`（JSON，合并比 TOML 更安全）：设置 `env.ANTHROPIC_BASE_URL` 与 `model` 即可把连接路由到自定义供应商。

## 目标

1. Agent 新增 Claude Code settings.json 落盘：一个 ProviderConnection 集合 → 保守合并进 `CLAUDE_CONFIG_DIR || ~/.claude/settings.json`。
2. 保守合并：只管理我们写入的键（`env.ANTHROPIC_BASE_URL`、顶层 `model`），用户既有设置（其他 env、权限、钩子等）逐字段保留；幂等。
3. 密钥纪律：settings.json 只写**非密钥** env（baseUrl）；认证密钥由宿主在 spawn 时注入子进程环境（claude.ts 现有通道），绝不落盘。
4. CLI 入口：`providers apply-claude <json> [--config-dir <dir>] [--dry-run]`，与 `providers apply`（Codex）并列。

## 边界（不做）

- 不写密钥到 settings.json；不做 OpenAI env 的实际进程注入（renderer 已有输出；进程接线视后续目标工具而定）。
- 不做 Claude 协议转换、聚合供应商、HTTP 端点（沿用 002/003 remaining）。
- 不触碰 server/http.ts 与 claude.ts 的执行逻辑本身（仅读其 env 通道确认注入语义）。

## 成功标准

- 空文件/含用户设置/含历史 kk 写入三类输入的 JSON 合并可预期且幂等（单测）。
- 输出不含密钥形态文本；写盘权限 0600/0700。
- CLI 在本机真实目录可跑通（dry-run + 真写验证记录）。
- 根门禁与 agent 套件全绿。
