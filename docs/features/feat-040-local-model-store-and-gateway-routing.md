# 本地模型商店与统一网关路由（FEAT-040）

- 状态：PARTIAL
- 领域：backend
- 最近更新：2026-11-22
- 关联任务：TASK-MODEL-GW-20261122

## 用户可见入口

- 设置 → 电脑配置与本地模型：硬件检测、fitTier 推荐、**本地模型商店**（精选 / 社区 / 外部运行时）。
- 首次安装**不会**自动下载大模型。
- 更新替换：默认建议删除旧文件，经确认后执行（Native 下载仍未接通时仅更新策略与文案）。
- 创作路由：调度层支持 `model` / `provider/model` / `group/<id>` 与多 Key 冷却轮换（对用户多为选模型/组）。

## 代码位置

- `src/domain/localModelStore.ts`：商店预设、替换计划、fitTier
- `src/domain/localModelRecommendations.ts`：推荐结果附带 fitTier；实验项含 Inkling / FastVideo
- `src/components/settings/LocalModelStorePanel.tsx`、`LocalHardwareSettings.tsx`
- `src/features/ai-gateway/providerPoolRouting.ts`、`scheduler.ts`（resolveCandidates）
- `src/integrations/generation/fastVideoAdapter.ts`、`providerAdapterFactory.ts`
- 规格：[ADR-027](../architecture/adr/ADR-027-model-gateway-and-local-store.md)、[changes/2026-11-22-model-gateway-store/](../changes/2026-11-22-model-gateway-store/intent.md)

## 测试与证据

- `tests/unit/localModelStore.test.ts`
- `tests/unit/providerPoolRouting.test.ts`
- `tests/unit/fastVideoAdapter.test.ts`
- `tests/unit/aiGatewayScheduler.test.ts`（group/provider 选择器）
- `tests/unit/localModelRecommendations.test.ts` 回归

## 当前能力

- 商店目录分层与不可安装社区包（Inkling 待 pin SHA）
- 硬件 fitTier：适合 / 较挤 / 不建议
- 替换计划默认 in-place + 删旧确认
- 设置商店 UI 已接 ADR-023 Tauri 命令：选目录 / prepare / install / cancel / list
- `runLocalModelInstallFlow` 统一安装编排（UI/单测共用）
- 供应商池路由与 `providerKeyPool` + localStorage 持久化（仅 credentialRef）
- FastVideo 适配器 / probe / 设置面板（标记运行时、输出目录、模型 ID）

## 差距与后端化

- Native 大文件实机下载与 SHA 发布仍待 Desktop 实跑（命令已注册）
- FastVideo 实机 GPU 出片与进程桥 NOT VERIFIED；CUDA 共享租约未接通
- 真实上游 DPAPI / 登录 CLI 终验仍属 TASK-AI-GATEWAY-001
- Key pool 尚未写入 `%APPDATA%` 原生文件（当前为 webview localStorage）
- 音频 REAL 未做

## 变更记录

- 2026-11-22：按 Codex++/FastVideo 覆盖评估落地 Phase 0–3 契约与最小实现
