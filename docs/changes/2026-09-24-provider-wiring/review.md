# TASK-PROV-003 review — 独立上下文评审记录

- 日期：2026-09-24
- 评审对象：feat/TASK-PROV-003-provider-wiring（head 9b630d1a8706fb39dbbd0269091caf2b80a6b8ba）
- 状态：**NOT VERIFIED（待独立上下文评审）**

## 已完成的自查清单（实现上下文内）

- [x] 镜像契约一致性：providerKey/envKeyFor/tomlQuote/parseModelWindow 与 app 侧源文件（providerTargetRenderers.ts / modelCatalogWindow.ts）逐项对齐；agent 侧注释明确指向源文件为权威。
- [x] 密钥纪律：apply 全程 assertNoSecrets（输入与合并结果）；check 不输出密钥；CLI 报告只含 env 变量名。
- [x] 保守合并边界：只管理 `kk_*` 自有表与显式顶层键；单测覆盖注释、用户自定义 provider、历史 kk_* 表、CRLF、幂等。
- [x] 权限与原子写：目录 0700 / 文件 0600（Windows 近似）、临时文件 + rename。
- [x] 冲突规避：未触碰 server/http.ts、config.ts、workbuddy.ts；HTTP 端点登记 remaining。
- [x] 门禁：根 verify 已含 test:agent；全部本地门禁绿（见 verification.md）。

## 待独立评审重点

1. TOML 行级合并的边界风险：多行字符串/内联表与 kk_* 共存时的行为（当前按行处理，未做完整 TOML 解析）。
2. active 模型选择规则（取第一个带 model 的连接）是否足够明确、是否需要 UI 显式选择。
3. `model_catalog_json` 顶层指针 vs 按 provider 表内指针的取舍（CodexPlusPlus 用表内指针；本批用顶层 + 单 profile 文件，对拍后如需调整）。
4. 根 verify 纳入 test:agent 的契约变更是否应作为独立治理项。
5. env_key 注入链路：Codex 实际从环境读取 `KK_STUDIO_*` 的宿主职责（Tauri 凭据库 → 进程 env）尚未接线，需在 app→agent 端点任务中闭环。

## 审阅规则声明

同一 GitHub 身份不能批准自己的 PR；不伪造第二审阅人。独立上下文评审应在 PR 创建后由另一个会话/审阅者执行，结论回填本文件。
