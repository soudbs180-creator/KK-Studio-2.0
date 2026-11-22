# Spec：统一模型网关与本地模型商店

- Task ID：TASK-MODEL-GW-20261122
- 状态：READY
- 日期：2026-11-22
- Intent / 账本：本目录 `intent.md`；`TASK-MODEL-GW-20261122`
- 当前规范与实现基线：ADR-019/023/026、FEAT-038、`config/local-model-packages.json`
- Source of truth：本 spec + [ADR-027](../../architecture/adr/ADR-027-model-gateway-and-local-store.md)

## 用户行为与入口

- 主流程：设置 → 电脑配置与本地模型 → 检测硬件 → 查看精选/社区/外部运行时 →（可选）安装/更新/替换 → 创作时在四渠道选择本地或云端。
- 相邻流程：模型供应商（BYOK/中转）、登录账号渠道、Comfy/FastVideo 视频路径。
- 页面：`LocalHardwareSettings`、后续本地商店列表；路由对用户多为「选模型/选组」，细节在网关内部。
- 状态：检测 loading；推荐 success；检测失败保留既有配置；安装/更新 cancel；离线时禁止下载但可读本地 receipt；超时/失败保留半包证据且不标已安装。
- 首次安装：**零强制下载**。

## 架构、数据与权限

- 执行核：Desktop 创作任务权威路径仍是 **Rust TaskHost**；`ai-gateway` 负责供应商池、路由策略、协议归一，不另起第二任务引擎。
- 本地商店：版本化目录（现有 packages JSON）+ 安装 receipt + 替换计划；社区包显式 `sourceKind`；外部运行时只发现/连接，不认领 Ollama/LM Studio 进程为自有引擎（ADR-023）。
- 路由：解析 `model` | `provider/model` | `group/<id>`；组策略 sequential / round-robin / weighted / quota-first / speed-first / manual；多 Key 冷却/熔断；会话粘性默认同会话同 Key。
- 凭据：仅系统凭据库 / `credentialRef`；禁止明文进 localStorage/日志。
- 相关 ADR：019、023、026、027。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| ---- | ------- | --- | ------ | ------------- |
| 硬件探测与推荐 | 真实（既有） | 明确不可用 | 未交付 | ADR-023 |
| 本地包下载安装 | 契约+Native 进行中 | 禁用 | 未交付 | 大文件/原生权限 |
| 供应商池路由 | 领域+调度扩展 | 可共享协议层 | 后置 | Desktop 先 |
| FastVideo 视频 | 可选适配器 | 禁用 | 未交付 | 仅 Desktop GPU |
| Codex++ 嵌入 | 禁止 | 禁止 | 禁止 | AGPL |

## 生命周期与恢复

- 初始化：空商店；目录可读。
- 更新：检出 catalog revision 更新 → 下载新包 → 校验 → 默认替换 → 确认删除旧文件。
- 取消/失败：半包不发布；旧包保留直至新包原子发布成功。
- Web：本地商店 UI 只展示「请用桌面版」。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --------- | ------------- | ------------- | -------- |
| AC-1 | 无自动下载 | 单测+UI 文案 | 本 verification |
| AC-2 | fitTier 推荐量化档 | RTX 5080 fixture | unit |
| AC-3 | replace+deleteOld 默认 | unit + confirmAction | unit/UI |
| AC-4 | 路由解析与轮换 | unit | unit |
| AC-5 | FastVideo adapter | unit；实机 NOT VERIFIED | unit |

## 风险和决策

- Codex++ 仅作 UX/策略参考，零代码拷贝。
- FastVideo Apache-2.0 可适配，不打进安装包。
- Inkling 等社区包未 pin SHA 前不可标 installable。
- 与 intent 无差异。
