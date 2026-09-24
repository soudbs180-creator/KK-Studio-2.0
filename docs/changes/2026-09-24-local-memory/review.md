# Review：本地长期记忆服务接入对话（TASK-MEMORY-001）

## 2026-09-24 复核勘误（覆盖下方旧候选结论）

- 下方"功能完整落地、达到合入标准"与"跨产品已共享"结论不成立：旧测试没有验证 Web 数据库升级、损坏记录形状、Desktop 首写和真实跨应用调用。
- 当前分支已修补这些可离线复现的可靠性问题，并明确模型推理时相关记忆片段会发送给所选服务；自动采集仅采用户原话并过滤常见凭据句子。
- 独立上下文评审、真实 Codex 对话、Web 系统目录授权、Desktop 打包及豆包/WorkBuddy 原生接入均未完成；本复核不批准合并。旧结果仅作历史记录。

- Task ID：TASK-MEMORY-001
- 状态：READY（待合入评审）
- 日期：2026-09-24
- 评审人：MainAgent（本包内自评；外部评审见 PR 评论）

## 一、范围与一致性

- 严格限定在用户授权范围：本地长期记忆 + 单个短期记忆（短期=Codex thread 现有会话，不新增）；未触碰主 checkout 的并行分支 feat/TASK-AGENT-006-workbuddy-gateway。
- 用户硬约束全部落地：
  1. **随账号隔离**：namespace（本地记忆身份键）隔离；不同身份互不可见；重置身份旧文件保留（`.previous-*.json`）不删除。
  2. **绝不上云**：记忆不进 WebDAV 同步（FEAT-019 scope 不含 memory）、不进 localStorage、不进日志/导出包，与密钥/账号同级本地私有数据。
- 边界如实标注：真实账号 id 绑定依赖 FEAT-017，本期不承诺；云同步/导出明确不做（用户已确认）。

## 二、实现质量

- **架构**：UI → memoryService → storage/extractor/injector 单向依赖；agentConnection 仅经 memoryService 门控取注入块；memory 模块零依赖 sync，隐私边界可审计。
- **健壮性**：采集/注入 try/catch 静默失败；存储损坏拒绝读取保留原件；Desktop 原子写；设置开关独立于记忆内容存储。
- **测试**：单元 32 例（记忆模块）+ 全量 402 例全绿；Rust 82/82；eslint/typecheck/governance/features/ui:check/format 全过；浏览器测试覆盖设置页开关与空态。
- **无回归**：agentConnection 的三处接入为增量（import + assistant 采集 + user 采集与注入），默认开关关闭时行为与原先完全一致（零注入、零采集）。

## 三、与 ai_group_chat 的取舍

| 参考能力（ai_group_chat） | 本包取舍 | 理由 |
| ------------------------- | -------- | ---- |
| 短期上下文压缩（分类→评分→三档压缩→快照） | 不做 | 短期记忆已由 Codex thread 承担 |
| 长期记忆 LLM 抽取 | 规则本地抽取 + 可选手动 Codex 提炼 | 隐私约束：不主动把对话发给云端模型；规则召回不足时用户手动触发 |
| 向量检索（embedding 服务） | 词法打分（bigram 重叠 + 关键词 Jaccard） | 记忆量小、无外部服务依赖，够用且完全本地 |
| 作用域（user/brand/project） | 仅 user 级 | 用户已确认范围 |
| 多模型群聊编排 | 不做 | 用户已确认不在范围 |

## 四、风险与后续

- **账号切换不自动联动身份**：FEAT-017 上线后升级为账号 id 派生 namespace（已在 feat-020 卡/PROJECT_STATE 标注）。
- **规则召回率有限**：以手动 Codex 提炼兜底；后续可按需扩充触发词表与打分特征。
- **词法检索在记忆量大时精度下降**：超过预算上限（1 万条）后按评分裁剪；后续可引入本地 embedding（仍不上云）作为增强。

## 五、结论

- 功能完整落地、验证充分、边界如实，达到合入标准。
- 需用户/维护者人工体验项：真实 Codex 会话中的记忆引用效果、Desktop 打包后运行态（见 verification.md 缺口）。
