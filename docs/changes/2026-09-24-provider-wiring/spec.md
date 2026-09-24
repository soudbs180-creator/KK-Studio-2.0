# TASK-PROV-003 spec — Codex Provider 配置注入与 model catalog 落盘（agent 侧）

- 日期：2026-09-24
- 基线：origin/feat/TASK-PROV-002-provider-connectivity @ 42c3f26（本分支父提交）

## 1. 模块与文件

| 文件 | 内容 |
| --- | --- |
| `vendor/canvas-agent/src/agent/codex-provider-config.ts` | 纯函数：provider 表渲染、TOML 保守合并、catalog JSON 构建、落盘编排 |
| `vendor/canvas-agent/src/agent/codex-provider-config.test.ts` | node:test 单测（并入 agent 测试清单） |
| `vendor/canvas-agent/src/agent/provider-cli.ts` | `providers apply/check` 子命令实现（读便携配置 JSON、调用注入、输出报告） |
| `vendor/canvas-agent/src/index.ts` | 增加 `providers` 子命令分派 |
| `vendor/canvas-agent/package.json` | test 脚本加入新测试文件 |
| `docs/changes/2026-09-24-provider-wiring/` | intent/spec/plan/verification/remaining/review |

## 2. 输入契约（便携配置 JSON，镜像 app 侧 providerConfigIO v1 的必填最小形态）

CLI 读取 JSON 数组或 `{ connections: [...] }`，每项：

```ts
{
  id: string;                 // 连接 id（生成 providerKey 的原料）
  provider: string;           // 供应商名
  displayName?: string;       // 展示名（缺省用 provider）
  baseUrl: string;            // 必填，http(s) URL
  model?: string;             // 可选，含 [1M] 后缀则参与 catalog
  credentialRef?: string;     // 可选；存在 → env_key = KK_STUDIO_<ID>_API_KEY
  wireApi?: "chat" | "responses"; // 可选，缺省 "chat"
}
```

zod（agent 侧 `^3.25`）校验；非法输入报错并列出错误。密钥形态文本一律拒绝（`assertNoSecrets` 防线，模式与 app 侧一致：api_key/access_token/client_secret/sk-*/私钥/Bearer 等）。

## 3. providerKey 与 envKey

与 app 侧 `providerTargetRenderers.ts` 完全一致（agent 侧为镜像实现，源文件为权威）：

- `providerKey(id)` = `kk_` + id 小写化、非 `[a-z0-9]` 转 `_`、去首尾 `_`、截 48 字符；空则报错。
- `envKeyFor(id, "API_KEY")` = `KK_STUDIO_<ID>_API_KEY`（id 大写化、非 `[A-Z0-9]` 转 `_`、去首尾、截 32）。

## 4. TOML 渲染

`serializeCodexProviderTable(block)` 生成：

```toml
[model_providers.kk_xxx]
name = "<displayName>"
base_url = "<baseUrl>"
env_key = "KK_STUDIO_XXX_API_KEY"   # 仅 credentialRef 存在时
wire_api = "chat"                    # 或 "responses"
model_catalog_json = "model-catalogs/<id>.json"  # 仅指定 catalog 时，相对路径
```

- 值一律双引号包裹，`\` 与 `"` 转义（`tomlQuote`，与 app 侧一致）。
- 顶层 `model_provider`/`model` 不进入表体；由合并层依据 `active` 显式写入（v1 规则：存在带 `model` 的连接时，第一个作为 active）。

## 5. TOML 保守合并（核心）

`mergeCodexConfigToml(existing: string, patch): string`，patch：

```ts
{
  providers: CodexProviderBlock[];          // 期望的 kk_* 集合（含期望顺序）
  active?: { providerKey: string; model: string };  // 写顶层 model_provider/model
  modelCatalogJson?: string;                // 写顶层 model_catalog_json（相对路径）
}
```

算法（行级，保留原 EOL 风格 \n 或 \r\n）：

1. 按“当前表头（`[` 开头、`]` 结尾的行）”把文件分成：顶层区（首个表头之前）+ 若干 section（表头 + 正文）。
2. 仅把表头匹配 `^\[model_providers\.kk_[a-z0-9_]+\]$` 的 section 视为自有表；其余内容（注释、其他表、顶层其他键）原样保留。
3. 应用：
   - 自有表：patch 中存在同 providerKey → 整表替换为渲染结果（保留原表头行位置）；不存在 → 删除整表。
   - patch 中的 provider 不在文件里 → 插入新表。插入点：最后一个自有表之后；无自有表则文件末尾（前面补空行）。
   - 顶层键：`model_provider`/`model`/`model_catalog_json` 仅当 patch 给出时处理——已有同键行 → 原位替换；没有 → 追加到顶层区末尾（顶层区为空时插到文件首行，保持 TOML 合法：顶层键必须先于任何表）。
4. 幂等：对同一 existing+patch 应用两次结果一致（自有表替换为同文本）。
5. 空输入 → 生成全新最小文件（顶层区 + 空行 + 各表）。
6. 非法 patch（如 providerKey 不匹配 `^kk_`）直接抛错，不写盘。

## 6. model catalog 落盘

- `buildModelCatalogJson(connections)`：镜像 app 侧 `modelCatalogWindow` 契约——`slug[1M]/[200K]/[512k]/[1000000]` 后缀解析（K/k=1000，M/m=1_000_000，向下取整），无后缀不生成窗口字段，`auto_compact_token_limit: null`，`display_name` 缺省用 slug；输出 `model-catalogs/<profileId>.json` 相对指针与 JSON 文本。
- `applyCodexProviderConfig(connections, options)` 编排：
  - 目标目录 = `CODEX_HOME` 环境变量或 `~/.codex`。
  - 读现有 `config.toml`（不存在视为空）。
  - 合并 → 原子写回（临时文件 + rename），目录 0700、文件 0600。
  - 写 `model-catalogs/<profileId>.json`（目录 0700、文件 0600）。
  - 返回报告 `{ configPath, catalogPath?, providers, warnings[] }`；任何输出不含密钥。

## 7. CLI

`node dist/index.js providers <subcommand> <config.json>`

- `apply`：校验 → 注入 Codex 配置 → 打印报告（路径、providerKey 清单、警告）；`--catalog <profileId>` 可选启用 catalog 落盘；`--dry-run` 只渲染不写盘。
- `check`：校验配置 → 报告每连接 env_key 是否在环境中存在（`KK_STUDIO_<ID>_API_KEY`）→ 存在时对 `GET {baseUrl}/models`（chat wire）做 5s 超时尽力探测，输出 HTTP 状态或错误摘要（失败不中断、标注“尽力而为”）。网络探测不进入单测。

## 8. 测试

`codex-provider-config.test.ts`（node:test + tsx）覆盖：

- providerKey/envKey 与 app 侧一致（引用 app 单测期望值）。
- tomlQuote 转义；表渲染缺省字段（无 env_key / 无 catalog 时不出现该行）。
- 合并：空文件；保留注释与用户自定义 provider 表；替换与删除 kk_* 表；顶层键原位替换与新增；顶层区为空时的插入位置；CRLF 保留；幂等；非法 providerKey 抛错。
- catalog：后缀解析（1M/200K/512k/无后缀）、display_name 缺省、JSON 文本形态。
- assertNoSecrets：含密钥文本的输入被拒。

## 9. 边界与依赖

- 不触碰 `server/http.ts`（TASK-AGENT-006 在途）；HTTP 端点、per-thread provider 注入、Claude/OpenAI 落盘、聚合供应商、导入导出 UI 全部登记 remaining。
- 合并器是保守行级实现，非完整 TOML 解析器：目标工具（Codex）实际消费时的字段兼容对拍在接线验证任务执行（与 TASK-PROV-002 的 remaining 相同主张）。
