# Intent：Desktop 整盘 V1 跑通、UI 过关与可持续迭代

- Task ID：TASK-WHOLE-V1-20261121
- 状态：READY
- 日期与提出者：2026-11-21 / 用户 + AI
- 请求来源：用户要求整体审视项目；模块各自迭代但缺少整包终验；最终要整项目跑通、UI 细节不过错、之后还能持续加新；已验证的不重做；旧缝/双轨转向现行方案；重大问题与冲突优先。
- 用户授权范围与依据：本会话确认「对，大致是这样」及后续整盘终验理解；授权 AI 主导盘点、冻结 V1 范围、搁置旁路、准备终验与迭代规矩；不含付费 Provider 全矩阵、生产破坏性操作或未授权发布。
- 关联账本、spec、plan：`docs/governance/task-ledger.json` → TASK-WHOLE-V1-20261121；[spec.md](spec.md)；[plan.md](plan.md)；[scope-map.md](scope-map.md)
- 交付包角色：`current`
- 若为延续任务：否；新建整包收口任务

## 领取与开工确认

- Owner / branch / worktree：root（implementer）/ 当前 checkout `main` / `D:/KK Design`
- Base SHA / 当前 HEAD：开工时 `e4383a1e323c895286d9f08fe901a27e341a10da`（以实际 git 回读为准）
- 依赖任务、共享文件和并行写入者：不接管 Mobile/发布资产名等旁路实现；只更新整包文档、账本搁置说明、PROJECT_STATE/HANDOFF/PROGRESS 短链
- 基线检查与预存失败：功能账 37 项仅 2 REAL / 29 PARTIAL；开放任务约 69；历史「本地 PASS / 整包 NOT_VERIFIED」反复出现
- 需求和验收标准确认时间/依据：2026-11-21 用户确认整盘跑通 + UI 过关 + 可持续迭代
- 当前状态：IN_PROGRESS（文档与范围冻结）；用户整盘终验前 verificationResult=NOT_VERIFIED

## 用户原意

项目每个模块都在迭代，但没有最后验收成「一个能用的整体」。需要先弄清哪些已验证、哪些半吊子、哪些是演示；不要把已完成的再做一遍。整项目要跑通，UI 细节不要出错；旧的双轨/过时方案不要拖着，跟现行方案走。跑通并钉住之后，还要能不断加新东西，但不能再回到处处半成品。

## AI 工程转译

- 目标：冻结 Desktop **整包 V1** 完成定义；产出能力地图；旁路任务搁置；只保留挡整盘的修复队列；准备用户走查单；写明钉基线后的迭代规矩。
- 使用者：产品负责人（用户）做整盘终验；AI 做盘点、范围、搁置与后续挡项修复。
- 入口：日常 Desktop 包 / 当前工程桌面启动路径（终验时钉死版本身份）。
- 非目标：本包不重做 FEAT-001/014；不把 Web/Mobile/账号/积分/视频升为 V1 完成条件；不换框架。

## 目标与非目标

- 预期结果：有一张「已计入 / 补缺口 / 迁旧缝 / 演示以后」地图；V1 范围与终验清单冻结；旁路开放项标明 V1 搁置；用户可按走查单做整盘验收；基线钉住后有固定迭代规矩。
- 包含范围：Desktop 主路径（项目 → 连接/Key → 文本 → 图片 → 回写 → 重开）、主路径 UI 过关标准、现行方案闸门、账本整包任务。
- 明确不包含：PROTOTYPE/PLANNED 当真；Mobile/VPS 终验；全供应商付费矩阵；为「最新」推倒重写。
- 受影响平台/模块：治理文档、功能地图、task-ledger；产品代码仅在后续「挡整盘」修复步骤进入（本包先完成范围与门禁）。
- 已有实现和规范来源：[PROJECT_GOALS.md](../../governance/PROJECT_GOALS.md)、[BACKEND-ROADMAP.md](../../features/BACKEND-ROADMAP.md) Wave 0、[features.registry.json](../../features/features.registry.json)

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| ---- | -------------- | ------------- | -------- |
| AC-1 | 能指出 V1 算进/不算进什么 | scope-map + spec 范围表 | 文档 |
| AC-2 | 日常 Desktop 上主路径跑通（文本+图片+重开） | 走查单勾选 + verification | Desktop |
| AC-3 | 主路径相关 UI 无死按钮/错态空白，状态说得清 | 用户整盘走查 | Desktop |
| AC-4 | 演示能力不冒充已跑通 | 界面 Prototype/禁用原因；地图「演示/以后」 | Desktop |
| AC-5 | 基线版本身份可回指；之后迭代有规矩 | verification 钉 SHA/包；[iteration-rules.md](iteration-rules.md) | 全项目 |

## 假设、风险和决策

- FACT：registry 显示 2 REAL / 29 PARTIAL / 5 PROTOTYPE / 1 PLANNED；画布与素材已 REAL。
- INFERENCE：Codex/BYOK 文本与图片在部分 SHA 上曾跑通，但缺「日常包 + 用户整盘终验」钉死，故 V1 仍须补缺口后计入。
- UNKNOWN：当前日常安装包与 `main` HEAD 是否字节一致（终验时记录）。
- AI 自主决定：V1 以 Desktop 为整包平台；Web/Mobile 后置；旁路用 nextAction 搁置而非批量 OBSOLETE。
- 必须由用户决定：整盘走查是否通过（AC-2/AC-3）。
- 外部条件：至少一条可用的文本+图片真实通道（用户 Key 或已登录 Agent）；全供应商矩阵不阻塞 V1。
- 不在本次范围：TASK-CANVAS-RELEASE-20261018 资产名、TASK-MOBILE-* 等旁路实现继续搁置至 V1 钉基线或你明确解冻。
