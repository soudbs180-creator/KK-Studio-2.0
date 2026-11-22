# ADR-027：统一模型网关执行核与本地模型商店边界

- 状态：ACCEPTED（设计已采纳；商店/路由/FastVideo 适配实现按 TASK-MODEL-GW-20261122 推进，大文件与实机视频未终验）
- 日期 / Task ID / Owner：2026-11-22 / TASK-MODEL-GW-20261122 / root
- Intent / Spec / Plan：[`docs/changes/2026-11-22-model-gateway-store/`](../../changes/2026-11-22-model-gateway-store/)
- 决策依据与授权范围：用户确认 Codex++/FastVideo 覆盖评估落地路线
- 替代/被替代的 ADR：无；补充 [ADR-023](ADR-023-local-model-installation-and-owned-runtime.md)、[ADR-019](ADR-019-unified-local-repository-and-optional-account.md)、[ADR-026](ADR-026-desktop-provider-network.md)

## 背景和约束

- 用户需要：首次安装不强制下模型；设置内精选与硬件匹配；社区/魔改可纳管；更新默认替换省空间；文本/图/视频/音频统一路由；云端与本地、多 API 轮换或自选。
- 外部参考：[CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus)（供应商池/路由 UX，**AGPL-3.0**）、[FastVideo](https://github.com/hao-ai-lab/FastVideo)（加速视频推理，**Apache-2.0**）。
- FACT：仓库已有四渠道、TaskHost、FEAT-038 调度原型、ADR-023 本地安装契约。
- CONFLICT：若另起 Node Gateway 当 Desktop 默认执行核，与 TaskHost 双核打架（账本 T8）。

## 方案比较

| 方案 | 优点 | 代价/风险 | 与现有架构的匹配 | 不选原因 |
| --- | --- | --- | --- | --- |
| 嵌入 Codex++ 作网关 | 功能现成 | AGPL 传染；非创作任务语义 | 差 | 许可与产品边界 |
| 仅 FastVideo 覆盖全模态 | 视频强 | 无 LLM/图/网关 | 差 | 覆盖不足 |
| TaskHost 执行核 + 自研池/路由 + FastVideo 适配 | 复用底座；许可清晰 | 需自建商店与路由 | 高 | **采用** |

## 决定

1. **执行核**：Desktop 创作任务权威路径为 **Rust TaskHost**。`ai-gateway` / generation-server 负责连接池、路由策略、协议归一与可选 OpenAI 兼容面，**不**替代 TaskHost 任务状态机。
2. **Codex++**：仅作产品与路由策略参考（供应商池、裸名/`provider/model`/`group/*`、多 Key 冷却熔断、会话粘性）。**禁止**拷贝源码、二进制或 AGPL 依赖。
3. **FastVideo**：Desktop **可选**视频运行时适配器；权重留在用户目录；能力声明必须如实；未配置时控件显示禁用原因。
4. **本地商店**：混合策略——发现/连接外部运行时（Ollama/LM Studio/Comfy/FastVideo）+ 一键安装精选包（ADR-023）。首次安装零强制下载。更新默认替换旧 revision，删除旧文件需确认（默认建议删除以省空间）。
5. **来源分层**：`official` 精选（已 pin SHA）、`community`（显式标记，未 pin 不可安装）、`external-runtime`（只连接）。
6. **模态优先级**：文本/VLM + 图片 → 视频（FastVideo/Comfy/云）→ 音频后置。
7. **平台**：本地安装与 FastVideo 仅 Desktop；Web 明确降级。

## 迁移、恢复与退出

- 兼容既有 `local-model-packages.json` v1 与安装 receipt。
- 半包不发布；替换失败保留旧包。
- 退出 FastVideo：卸适配器注册即可，不影响 TaskHost。

## 验证和接受条件

- 领域单测覆盖 fitTier、替换计划、路由解析、FastVideo 未配置失败路径。
- 真实大文件下载与 GPU 出片另附 verification，未完成前不得标 REAL。
- 遗留：TASK-AI-GATEWAY-001 真实上游/DPAPI；Comfy 前端 invoke；音频 REAL。
