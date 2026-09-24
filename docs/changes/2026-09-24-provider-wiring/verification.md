# TASK-PROV-003 verification — Codex Provider 配置注入与 model catalog 落盘

- 日期：2026-09-24
- 分支：feat/TASK-PROV-003-provider-wiring（堆叠于 42c3f26）
- 结论：本地全绿；浏览器 test:ui 与独立上下文 review 待推送后 CI/后续完成（与 TASK-PROV-002 相同边界）

## 单测（agent 套件 `npm run test:agent`）

- 结果：**142 pass / 0 fail / 2 skipped（既有 skip）**，含新增 `codex-provider-config.test.ts` 全部用例。
- 覆盖：providerKey/envKey 与 app 侧一致；tomlQuote 转义；表渲染缺省字段；合并四类输入（空文件、注释+自定义 provider、原位替换+删除历史 kk_*、顶层键替换/追加）；CRLF 保留；**幂等**；非法 providerKey 抛错；仅顶层区文件；catalog 后缀解析（1M/200K/512k/1000000/无后缀/非法后缀）；display_name 缺省；assertNoSecrets 拒绝密钥形态。
- 开发过程中测试抓出 3 个真实缺陷并已修复：①顶层键原位替换丢失 `=` 前空格；②该缺陷同时破坏幂等（替换路径 `key= value` vs 追加路径 `key = value`）；③自有表替换/追加两条路径对「表间空行」处理不一致导致二次应用输出不同 → 统一为「自有表前上一行非空则补空行」。修复后 142/142。

## 真实环境验证（本机 Windows，Node v22.23.2）

临时 CODEX_HOME：`D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring/.tmp-codex-test`（验证后已删除）。

`node vendor/canvas-agent/dist/index.js providers apply providers.sample.json --catalog kk-test --config-dir <dir>`：

- dry-run 只报告不写盘；真实 apply 写入 `config.toml` 与 `model-catalogs/kk-test.json`。
- config.toml 布局：顶层键（model_provider/model/model_catalog_json）先于所有表；`[model_providers.kk_deepseek_test]` 含 `env_key = "KK_STUDIO_DEEPSEEK_TEST_API_KEY"`（无明文密钥）；`kk_local_gateway` 无 credentialRef 故无 env_key。
- catalog：`deepseek-v4-pro[1M]` → slug `deepseek-v4-pro` + context_window/max_context_window 1_000_000 + auto_compact_token_limit null；`gpt-4o-mini` 无后缀 → 不生成窗口字段。
- **真实文件幂等**：apply 两次后 `config.toml` 哈希一致（True）。
- 权限：Windows 显示 `-a----`（POSIX 0600 在 Windows 为近似语义，目录 0700/文件 0600 已尽力设置）。

`providers check`（设 `KK_STUDIO_DEEPSEEK_TEST_API_KEY=fake-key-for-verification-only`）：

- 连接 1 env 已就绪 → 对 `https://api.deepseek.com/v1/models` 实测返回 **HTTP 401**（假密钥被真实端点正确拒绝，探测链路端到端可用）。
- 连接 2 无凭据引用 → 标注「将走 Codex 交互登录」。
- 非 2xx 计入 degraded → 退出码 1（符合设计）。

## 根门禁

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | ✅ tsc --noEmit 0 错误 |
| `npm run lint` | ✅ eslint 0 警告；governance 63 任务 0 违规；features 30 功能 0 违规；markdown 82 文件 0 违规 |
| `npm test` | ✅ 394/394（回归无破坏） |
| `npm run test:agent` | ✅ 142/142（+2 既有 skip） |
| `npm run ui:check` | ✅ 159 文件 0 违规 |
| `npm run format:check` | ✅ Prettier 全绿 |

## 契约变更

- 根 `verify` 脚本纳入 `npm run test:agent`：TASK-PROV-003 新增的 agent 侧代码必须进 PR CI 门槛（此前 agent 测试不在 verify 内）。
- 未触碰 `server/http.ts`（TASK-AGENT-006 在途分支同文件冲突，接线登记 remaining）。

## 未执行/待后续

- 浏览器 `npm run test:ui`（Playwright）本地未跑（与 TASK-PROV-002 相同环境边界，推送后 CI verify 覆盖）。
- 独立上下文 review：review.md 状态 NOT VERIFIED（同一 GitHub 身份不能批准自己的 PR、不伪造第二审阅人）。
- Codex 对 `model_catalog_json`/`env_key` 字段的真实消费对拍（需在装有 Codex 的机器跑真实会话；本机未装 Codex）——登记 remaining。
