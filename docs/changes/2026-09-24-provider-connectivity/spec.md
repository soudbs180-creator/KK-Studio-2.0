# Spec：多供应商接入与多目标配置（Provider Connectivity）

- Task ID：TASK-PROV-002
- 状态：READY
- 日期：2026-09-24
- Intent / 账本：docs/changes/2026-09-24-provider-connectivity/intent.md；task-ledger.json TASK-PROV-002
- 当前规范与实现基线：`src/domain/providerConnections.ts`（ConnectionKind/ProviderConnection）、`src/features/models/modelCatalog.ts`、`src/features/mcp/mcpClient.ts`、`src/runtime/storage-contract.ts`；main 基线 76339c9
- Source of truth：本 spec + 上述实现文件；参考（不复制代码）：CodexPlusPlus model-catalog 设计（AGPL-3.0，仅借鉴格式思路）、cc-switch model catalog 字段形态（MIT）

## 用户行为与入口

- 主流程和相邻流程：本批为纯逻辑能力模块，无 UI/API 入口；入口由后续接线任务提供（agent 配置生成、设置页导入导出、模型选择、MCP 管理）。
- 页面/route/组件或 API/命令入口：无（本批）。
- loading、success、error、cancel、offline、timeout：单测覆盖输入非法、无后缀、round-trip 失败等分支；不涉及异步。
- 重试、幂等、stale async、unknown 受理与重启恢复（按需）：不适用（纯同步函数）。
- 键盘/焦点/Escape/IME、长文案、响应式（UI 适用）：不适用。

## 架构、数据与权限

- 模块职责和依赖方向：
  - `src/features/providers/providerTargetRenderers.ts`：ProviderConnection → Codex/Claude/OpenAI 目标配置；依赖 `src/domain/providerConnections.ts`、`src/domain/providerUrl.ts`；不依赖 UI/原生宿主。
  - `src/features/providers/providerConfigIO.ts`：便携格式 v1 序列化/反序列化/合并/seed 导入；依赖 zod 与 providerConnections。
  - `src/features/models/modelCatalogWindow.ts`：后缀解析 + catalog JSON 生成；依赖 zod，不依赖 modelCatalog.ts 现有存储（保持独立、可复用）。
  - `src/features/mcp/mcpConfig.ts`：stdio server 持久化契约 + 命令白名单；浏览器 transport 不变。
- schema/API/事件/文件格式与兼容策略：
  - 便携格式 `kk-provider-config-v1`：顶层 `version:1`、`connections:[ProviderConnection]`（其中 credentialRef 保留占位；若源含 credentialRef 则原样携带引用 id，密钥绝不进入文件）、`exportedAt`、`source`。
  - catalog 字段：`slug`、`display_name`、`context_window`、`max_context_window`、`auto_compact_token_limit:null`，与 cc-switch/CodexPlusPlus 兼容；解析输入 `model[1M]`（K/k=1000、M/m=1_000_000、纯数字原值）。
  - MCP stdio：`{ transport:"stdio", command, args?, env? }`，command 必须命中白名单（绝对路径或白名单裸名），args 数量/长度受限，禁止 shell 元字符与空参数拼接；`streamable_http` 契约不变。
- 数据归属、原件保留、校验和、并发/原子性：纯函数无状态；导入合并按 id 幂等；无文件写入。
- 凭据与日志边界、最小权限、外部传输与费用：任何输出不得含密钥明文；渲染器/导出器把 credentialRef 作为不透明引用透传；不发起网络请求。
- 相关 ADR（无需时说明原因）：纯逻辑模块不改变存储/部署/权限，不新增 ADR；后续接线涉及凭据注入时按需补 ADR。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| ---- | ------- | --- | ------ | ------------- |
| 渲染/导出/解析纯函数 | 可用（service） | 可用 | 不适用（无移动入口） | 本批无 UI，仅逻辑层 |
| MCP stdio 执行 | 后续任务 | 禁用 | 禁用 | 浏览器无法 spawn 进程，契约先行、执行接线后置 |

说明：本批能力为真实实现的纯逻辑（带单测），但无 UI/运行时入口，因此功能状态登记为 PARTIAL；渲染结果与 Codex/Claude 实际消费需接线后对拍验证。

## 生命周期与恢复

- 初始化/安装：无。
- 正常使用、取消/离线：无。
- 升级和旧 schema：便携格式 v1 固定；后续升级递增 version 并保留解析 v1。
- 损坏/写失败/进程重启：不适用（无持久化写入）。
- 备份、还原、回滚：导出文件本身即备份载体；不自动写入磁盘。
- 导出/卸载/退役及用户数据保留：不适用。
- 各项不适用的原因：本批无 I/O 与状态。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --------- | ------------- | ------------- | -------- |
| AC-1 | 三份目标配置合法、无密钥 | node --test tests/unit/providerTargetRenderers.test.ts | 单测断言 |
| AC-2 | round-trip 一致、拒绝非法输入 | tests/unit/providerConfigIO.test.ts | 单测断言 |
| AC-3 | 后缀解析与 catalog 字段正确 | tests/unit/modelCatalogWindow.test.ts | 单测断言 |
| AC-4 | stdio 白名单生效、注入被拒 | tests/unit/mcpConfig.test.ts | 单测断言 |
| AC-5 | 全部门禁通过 | typecheck/test/lint/ui:check/format/governance/features/markdown | 命令输出记录于 verification.md |

## 风险和决策

- 可自主解决的技术决定及依据：渲染器输出采用最小通用兼容形态（Codex `model_providers` 块、Claude env + model、OpenAI env），细节字段在接线任务中对拍；catalog 采用 cc-switch 字段（context_window + max_context_window + auto_compact null），被 CodexPlusPlus spec 与 cc-switch 双重印证。
- 待用户决定的产品语义（无则写无）：无。
- 规范冲突、外部依赖与阻断范围：不引入新依赖（复用 zod 与现有 domain）。
- 与 intent 的差异及授权依据：无差异。
- 明确未承诺的能力：聚合路由、协议转换、MCP 执行接线、catalog 指针落盘、UI 入口均未承诺，见 remaining.md。
