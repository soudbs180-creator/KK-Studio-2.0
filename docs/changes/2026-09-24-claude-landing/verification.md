# TASK-PROV-004 verification — Claude Code settings.json 落盘

- 日期：2026-09-24
- 分支：feat/TASK-PROV-004-claude-landing（堆叠于 2618344）；head 提交后回填
- 结论：本地全绿；浏览器 test:ui 与独立上下文 review 待推送后 CI/后续完成（与 002/003 相同边界）

## 单测（agent 套件 `npm run test:agent`）

- 结果：**150 pass / 0 fail / 2 skipped（既有 skip）**，含新增 `claude-provider-config.test.ts` 全部用例。
- 覆盖：空文件最小 settings.json；保留用户设置（permissions/hooks/env 其他键）并更新受管键；无 model 不写顶层 model；幂等；非法 JSON 抛错不覆盖；**UTF-8 BOM 容忍**；baseUrl 内嵌 userinfo 拒绝；dry-run 编排（多连接 baseUrl 警告、无 model 警告、后缀剥离 slug）。
- 开发中测试抓出 2 个真实缺口并修复：①CLI 读配置文件遇 BOM 报错（Windows 编辑器常见）→ `readProviderConfig` 剥 BOM；②既有 settings.json 带 BOM 时 JSON.parse 失败 → `mergeClaudeSettingsJson` 入口剥 BOM。另发现单测目录与真实验证目录冲突导致读取既有文件（保守保留 model 属正确行为），已隔离单测目录。

## 真实环境验证（本机 Windows，Node v22.23.2）

临时 CLAUDE_CONFIG_DIR：`D:/kk-studio/.worktrees/TASK-PROV-004-claude-landing/.tmp-claude-test`（验证后已删除）。

`node vendor/canvas-agent/dist/index.js providers apply-claude providers.sample.json --config-dir <dir>`：

- dry-run 只报告不写盘；真实 apply 写入 `settings.json`：
  ```json
  { "env": { "ANTHROPIC_BASE_URL": "https://api.deepseek.com/v1" }, "model": "deepseek-v4-pro" }
  ```
  （`deepseek-v4-pro[1M]` → slug `deepseek-v4-pro`，无密钥。）
- 用户设置保留：既有 `permissions/env.FOO/model` 逐字段保留，仅更新受管键（env.ANTHROPIC_BASE_URL、model）。
- **真实文件幂等**：apply 两次后 settings.json 哈希一致（True）。
- 权限：Windows 显示 `-a----`（0600 近似语义）。

## 根门禁

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | ✅ tsc --noEmit 0 错误 |
| `npm run lint` | ✅ eslint 0 警告；governance 64 任务 0 违规；features 30 功能 0 违规；markdown 82 文件 0 违规 |
| `npm test` | ✅ 394/394（回归无破坏） |
| `npm run test:agent` | ✅ 150/150（+2 既有 skip） |
| `npm run ui:check` | ✅ 159 文件 0 违规 |
| `npm run format:check` | ✅ Prettier 全绿 |

## 契约变更

- `providers` CLI 新增 `apply-claude` 子命令（`apply`/`check` 行为不变）。
- 复用 003 的 providerKey / parseModelWindow / assertNoSecrets / writeFileAtomic（无复制）。

## 未执行/待后续

- 浏览器 `npm run test:ui` 待 CI；独立上下文 review 未执行（review.md NOT VERIFIED）。
- Claude Code 真实消费对拍（`settings.json` 的 `model` 字段与 `env.ANTHROPIC_BASE_URL` 被 CLI 识别）需装有 Claude Code 的机器。
- 认证通道（宿主注入 ANTHROPIC_AUTH_TOKEN → agent 进程 env → claude.ts 子进程继承）在「app→agent 端点 + 宿主 env 注入」任务闭环。
