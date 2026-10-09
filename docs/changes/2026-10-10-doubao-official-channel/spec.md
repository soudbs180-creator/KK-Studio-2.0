# Spec：豆包（火山方舟）官方通道 P1

- Task ID：TASK-AI-GATEWAY-001（P1 官方通道；产品化接入仍由 TASK-PROV-BYOK-001 跟踪）
- 状态：IMPLEMENTED（代码与单测完成；真实上游联调 NOT VERIFIED）
- 日期：2026-10-10
- Intent / 账本：本目录 `intent.md`；上一交付包 `docs/changes/2026-10-09-doubao-integration/`
- 当前规范与实现基线：KK 现有 BYOK Provider 机制（`src/domain/modelProvider.ts`、`src/features/creation/providerRegistry.ts`、`src/integrations/generation/openAiImageAdapter.ts`、`src/features/creation/imageGeneration.ts`）；`modelSupportsKind` 在 `src/features/creation/model.ts`
- Source of truth：本文件描述目标与边界；当前能力以代码、任务账本和运行证据为准，不另写冲突副本

## 用户行为与入口

- 主流程：设置 → 模型供应商 → 「提供商」输入框上方选择预置「豆包（火山方舟）」→ 自动填入名称与 `https://ark.cn-beijing.volces.com/api/v3` → 填 API Key → 测试连接（刷新模型目录）→ 保存 → 画布图片节点选 `doubao-seedream-*` 生成。
- 页面/route/组件或 API/命令入口：`src/components/settings/ModelProviderSettings.tsx`（表单容器）→ `src/components/settings/ProviderProfileFields.tsx`（新增预置选择器）；无新路由、无新命令。
- loading、success、error、cancel、offline、timeout：沿用现有测试连接与保存状态机，不新增状态。
- 重试、幂等、stale async、unknown 受理与重启恢复：沿用现有 `providerCredentials` / `generateImages` 幂等键与超时机制，不新增。

## 架构、数据与权限

### 3.1 方案与决策

- **不新增第二套 provider 适配器**：方舟为 OpenAI 兼容端点，`generateImages` 现有 `images/generations` 请求与 `{data:[{url|b64_json}]}` 解析可直接复用；与 `src/features/ai-gateway/channels/doubao.ts`（服务端通道候选）职责分离——本包是浏览器 BYOK 直连，后者是未来本地网关通道，二者不冲突、不重复。
- **预置只填 name/baseUrl**：模型 ID（如 `doubao-seedream-4-5-250828`）随测试连接从 `/models` 刷新进入 `ProviderModelCatalog`，避免在代码中写死易过期的模型 ID；`ProviderProfileFields` 的模型输入框仍可手填。
- **`modelSupportsKind` 最小修正**（修复真实缺陷）：当前 text 正则不含 `doubao`，导致 `doubao-seed-1-6-250615` 等文本模型被判为 image。修正后：
  - text：`doubao` 加入正向关键词；排除含 `seedream`/`image`/`dall-e` 等图片语义的模型。
  - image：`doubao` 前缀模型除非含 `seedream`/`image`/`vision`/`dall-e`，否则判 false（避免文本模型混入图片能力）。
  - 其他模型分支（gpt/claude/gemini 等）行为保持不变。

### 3.2 数据与权限

- 预置常量为纯静态配置（`src/domain/modelProvider.ts`），无持久化结构变更，无 schema 迁移，无需 ADR。
- 凭据路径不变：Desktop 系统凭据库 / Web 会话内存，不进 localStorage、项目文件、导出包、URL 与日志（AGENTS.md 强制）。
- 不引入新依赖、新服务、新队列。

## 配置项与接口

- 新增导出 `PROVIDER_PRESETS`：`Array<{ id, label, name, baseUrl }>`，含「豆包（火山方舟）」条目（baseUrl 为 `https://ark.cn-beijing.volces.com/api/v3`）。放置于 `src/domain/modelProvider.ts`，供 UI 与单测引用。
- 预置选择器：`ProviderProfileFields` 内新增 `select`，选择后通过现有 `onUpdate` 一次性填入 `name`/`baseUrl`（model 保持原值或清空，由 UI 实现决定并保持与现有表单行为一致）。

## 平台能力

| 能力 | Desktop | Web | 降级/禁用理由 |
| ---- | --- | --- | --- |
| 豆包预置 | 规划（本轮实现） | 规划（本轮实现） | 共享 `src/` 层，两端同源 |
| 真实方舟连通 | NOT VERIFIED | NOT VERIFIED | 需用户方舟 Key（外部条件） |
| 本地网关/网页通道 | 不适用（P2/P3） | 不适用 | 另包跟踪 |

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 预置常量与 UI 就绪 | `npm run test` + typecheck | 单测 PASS + UI 代码审查 |
| AC-2 | doubao 判定修正 | `tests/unit/creation.test.ts` 新增用例 | 单测 PASS |
| AC-3 | 既有判定不回归 | 既有用例未删减 + 全量单测 | `npm run test` PASS |
| AC-4 | 真实联调 | 用户 Key 实测 | NOT VERIFIED（如实登记） |

## 风险和决策

- 可自主解决的技术决定及依据：见 3.1；预置不写死模型 ID、判定最小修正均以「复用现有链路、避免第二套实现」为据。
- 待用户决定的产品语义：无（P1 已规划）。
- 规范冲突、外部依赖与阻断范围：方舟 `/models` 与 `n>1` 兼容性为外部依赖，未实测；阻断项仅为真实联调（Key）。
- 与 intent 的差异及授权依据：无。
- 明确未承诺的能力：不做网页会话通道；不写死模型 ID；不宣称真实生成已验证。
