# TASK-PROV-004 spec — Claude Code settings.json 落盘（agent 侧）

- 日期：2026-09-24
- 基线：origin/feat/TASK-PROV-003-provider-wiring @ 2618344（本分支父提交）

## 1. 模块与文件

| 文件 | 内容 |
| --- | --- |
| `vendor/canvas-agent/src/agent/claude-provider-config.ts` | 纯函数：settings.json 保守合并、落盘编排 |
| `vendor/canvas-agent/src/agent/claude-provider-config.test.ts` | node:test 单测（并入 agent 测试清单） |
| `vendor/canvas-agent/src/agent/provider-cli.ts` | 增加 `apply-claude` 子命令（复用 parseProviderConfig/防线） |
| `vendor/canvas-agent/package.json` | test 脚本加入新测试文件 |
| `docs/changes/2026-09-24-claude-landing/` | intent/spec/plan/verification/remaining/review |

## 2. 输入契约

复用 TASK-PROV-003 的 `ProviderConfigEntry`（id/provider/displayName/baseUrl/model/credentialRef/wireApi）与 `parseProviderConfig`（含 assertNoSecrets 防线）。Claude 目标不使用 wireApi（Anthropic 协议）。

## 3. settings.json 合并（核心）

`mergeClaudeSettingsJson(existing: string, patch): string`

patch：

```ts
{
  baseUrl: string;          // 必填（有连接的 baseUrl）
  model?: string;           // active 模型的 slug（后缀已剥离）
  extraEnv?: Record<string, string>;  // 可选非密钥 env（v1 不开放，预留）
}
```

算法：

1. `existing === ""` → `{}`；否则 `JSON.parse`（非法 JSON 抛错，不覆盖用户文件）。
2. 深拷贝现有对象；只写入受管键：
   - `env`：若现有无 `env` 则建 `{}`；只设置 `env.ANTHROPIC_BASE_URL = baseUrl`，其余 env 字段保留。
   - `model`：patch.model 存在 → 设置顶层 `model`；不存在 → **删除**顶层 `model`（仅当它是受管键——即本模块写入过的；为保守起见 v1 只处理显式给出 model 的情况：给出则写，未给出则不动）。
3. 序列化：`JSON.stringify(obj, null, 2) + "\n"`（2 空格，与 Claude Code 默认风格一致）。
4. 幂等：同一 existing + patch 应用两次结果一致。
5. 输出 `assertNoSecrets`。

受管键定义：`env.ANTHROPIC_BASE_URL` 与顶层 `model`（当 patch.model 存在）。其余一切（其他 env、hooks、permissions、mcpServers 等）原样保留。

## 4. 落盘编排

`applyClaudeProviderConfig(connections, options)`：

- 目标目录 = `options.configDir || CLAUDE_CONFIG_DIR || ~/.claude`；文件 = `settings.json`。
- 原子写盘（临时文件 + rename；目录 0700、文件 0600）。
- active model = 第一个带 model 的连接（`parseModelWindow(model).slug`，镜像 003）。
- 返回 `{ configPath, model?, providers, warnings[], dryRun, settingsJson }`。
- 无连接带 model → 只写 baseUrl，warning 提示「认证走宿主 env 注入或交互登录」。
- 密钥纪律：`env` 只接受 baseUrl（v1 不允许 extraEnv 带密钥；assertNoSecrets 兜底）。

## 5. CLI

`node dist/index.js providers apply-claude <config.json> [--config-dir <dir>] [--dry-run]`

- 复用 parseApplyFlags 的 flag 解析（新增子命令分支，不改 `apply` 现有行为）。
- 输出：`已写入 Claude 配置 / config: <path> / model: <slug> / providers: <keys> / warnings`。

## 6. 认证通道（说明，不实现）

claude.ts `spawnAgent` 未传 env → 子进程继承 agent 进程 env：宿主（Tauri 凭据库）在启动 agent 时设置 `ANTHROPIC_AUTH_TOKEN`（或 `ANTHROPIC_API_KEY`）即自动生效。settings.json 因此只需 baseUrl + model，密钥永不落盘。该通道在「app→agent 端点 + 宿主 env 注入」任务（remaining）中闭环。

## 7. 测试

`claude-provider-config.test.ts`：

- 空文件 → 最小 settings.json（env.ANTHROPIC_BASE_URL）。
- 保留用户设置：现有 permissions/hooks/env 其他键 + 受管键更新。
- 无 model → 顶层 model 不出现。
- 幂等（两次一致）。
- 非法 JSON 输入抛错（不覆盖）。
- CRLF→规范化：JSON 输出统一 2 空格 + LF（JSON 无注释，整文件由本模块控制时可规范化；记录于文档）。
- apply dry-run：不写盘、报告正确、无密钥。

## 8. 边界与依赖

- 不触碰 claude.ts 执行逻辑、server/http.ts；聚合/协议转换/HTTP 端点沿用 003 remaining。
- Claude Code 版本对 `settings.json` `model` 字段的识别需实跑对拍（登记 remaining；与 Codex 对拍同批）。
