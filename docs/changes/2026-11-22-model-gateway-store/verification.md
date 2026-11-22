# Verification：统一模型网关与本地模型商店

- Task ID：TASK-MODEL-GW-20261122
- 日期：2026-11-22
- 结果：PARTIAL
- Branch：`feat/TASK-MODEL-GW-20261122-gateway-store`

## 已验证

| 检查 | 命令/方式 | 结果 |
| --- | --- | --- |
| 本地商店 / fitTier / 替换计划 | `node --test tests/unit/localModelStore.test.ts` | PASS |
| 推荐回归 | `node --test tests/unit/localModelRecommendations.test.ts` | PASS |
| 供应商池路由 | `node --test tests/unit/providerPoolRouting.test.ts` | PASS |
| Scheduler group/provider | `node --test tests/unit/aiGatewayScheduler.test.ts` | PASS（含新增用例） |
| FastVideo adapter（mock） | `node --test tests/unit/fastVideoAdapter.test.ts` | PASS |

合并定向：

```text
node --test tests/unit/localModelStore.test.ts tests/unit/providerPoolRouting.test.ts tests/unit/fastVideoAdapter.test.ts tests/unit/localModelRecommendations.test.ts tests/unit/aiGatewayScheduler.test.ts
```

## 续验（同日）

| 检查 | 结果 |
| --- | --- |
| Rust `local_models` 命令注册进 `main.rs` | `cargo check` PASS |
| 设置商店 UI → choose/prepare/install/cancel/list | 已接线；真实大文件下载仍需 Desktop 实机 |
| `providerKeyPool` 会话粘性 / 失败换 Key | unit PASS |
| FastVideo probe（未配置 / 16GB CUDA） | unit PASS |
| Key pool localStorage 持久化 | unit PASS |
| `runLocalModelInstallFlow` 编排冒烟 | unit PASS |
| FastVideo 运行时设置面板 / settings round-trip | unit PASS |

## 未验证 / 边界

- Native 真实大文件下载与 SHA 原子发布：命令已注册，**本机实装未跑**
- FastVideo 实机 GPU 文生视频双门：NOT VERIFIED（probe/mock 仅）
- Codex++：仅文档参考，仓库无 AGPL 依赖
- Inkling GGUF：社区预设，installable=false，待 pin SHA
- Web/Mobile 本地商店：按设计禁用/未交付
- CUDA 启动：共享 GPU 租约未接通时 CUDA backend 失败关闭（符合 ADR-023）

## 文档

- Intent/Spec/Plan：本目录
- ADR-027：已 ACCEPTED（设计）
- FEAT-040：PARTIAL
