# 竞品学习与品类跟进方针

- 制定：2026-10-26。依据： [`docs/changes/2026-10-26-ai-drama-canvas-research/`](../changes/2026-10-26-ai-drama-canvas-research/) 研究包（AI 短剧/视频创作工作台品类，7 仓库 + 生态）。
- 定位：本文件是 [`DEVELOPMENT-WORKFLOW.md`](DEVELOPMENT-WORKFLOW.md) 第 8 节"竞品迭代节奏"的品类化展开，规定 KK-Studio **如何从竞品学习功能与优点、如何转化为本地交付、如何持续增进**。它不改变既有治理权威顺序，也不替代功能卡与任务账本。

## 1. 第一原则：学"共识模式"，不学"单点功能"

单点功能（某个按钮、某个面板）可以随时抄走；共识模式（多数收敛的架构选择）决定产品五年不返工。学习动作按此排序：

1. **共识模式优先对齐**：品类里 ≥3 家独立收敛的做法，直接作为 KK 的设计输入，争论"要不要做"没有意义，只讨论"怎么适配 KK 架构"。
2. **单点亮点按差距评估**：只有 1 家有的做法，先问"它解决了什么 KK 真实存在的痛点"，再决定是否实验；不为对称而做。
3. **KK 已有 REAL 能力不推倒**：对齐模式不等于重写；FEAT-001 画布已 REAL，演进路线是"换底座/加适配层"，不是"废弃重来"。

## 2. 共识基线（2026-10-26 快照）与 KK 对齐状态

| # | 共识模式 | 品类证据 | KK 状态 | 动作 |
|---|---|---|---|---|
| C1 | 无限画布是唯一交互范式（节点+连线+参考关系） | 7/7 | FEAT-001 REAL | 保持；补参考关系语义 |
| C2 | Agent 经 MCP 操作画布（MCP 服务端侧） | 5/7 有显式 MCP/agent 宿主 | FEAT-012 仅客户端 | **优先补**：画布与功能工具化输出为 MCP tools（FEAT-030 契约扩展） |
| C3 | Skills 作为方法载体（版本/锁定/回退） | 4/7 + 独立内容品类 | FEAT-011 PARTIAL | 半对齐：补 skills-lock 式版本锁定与回退 |
| C4 | 插件系统 + 脚手架生成器 | 4/7 | features/plugins PARTIAL | 半对齐：先契约后脚手架 |
| C5 | BYOK + OpenAI 兼容 + 多供应商 + 中转站适配 | 7/7 | FEAT-002/032 同向 | 保持；评估"自定义调用脚本"能力 |
| C6 | 本地优先 / 数据自持 | 3/7 显式 + 其余可自部署 | 本地数据策略已定 | 保持 |
| C7 | 持久任务编排（队列/重试/进度） | Waoowaoo Temporal；影策队列重试 | FEAT-024 PARTIAL | **优先补**（见 §4 L2） |
| C8 | 线性阶段流程 + 人工介入点 | 火宝 4 Agent 分工 + 每步可改 | creation 流程已有阶段 | 半对齐：显式化"每阶段人工确认点" |
| C9 | React 19 + Vite 7/8 + TS 新代次栈 | 前端收敛 | React 18.3 + Vite 7 | 随主版本升级窗口处理，不单独立项 |
| C10 | AGENTS.md 驱动 AI 协作开发 | 7/7 | KK 已有完整体系 | **KK 输出而非输入**：可对外输出经验 |

## 3. KK 的差异化立足点（不跟随清单）

以下为竞品缺失或弱项，是 KK 的护城河，**不因竞品压力而降级或让路**：

- **治理体系**：AGENTS/AI_RULES/ADR/task-ledger/十道门禁。竞品 7 家中无同类（最接近的是 Waoowaoo 的架构门禁脚本）。
- **三端同态战略**：Desktop→Web→Mobile 顺序与双端切换同态证据验收。竞品最多到"五端并行无治理"（Toonflow）。
- **平台层**：账号、云同步、积分/额度（FEAT-017/018/019）。纯开源竞品均无；这是 KK 与"玩具级工作台"的分界线。
- **MCP 双向**：入站（外部 Agent 客户端接入）+ 出站（KK 连接外部 MCP）双链路。竞品只有单侧。
- **记忆契约**：`docs/MEMORY-CONTRACT.md` 产品层用户记忆。竞品无对应物。

## 4. 学习 Backlog（按优先级；均为候选，须走正常任务流）

> 以下不是批准清单。每项进入账本后按 SDLC 执行；静态研究不等于可交付。L0–L3 的工程化展开（Wave 划分、验收、依赖、风险）见 [`docs/changes/2026-10-26-kk-optimization-roadmap/roadmap.md`](../changes/2026-10-26-kk-optimization-roadmap/roadmap.md)（DRAFT，待批准）。

| 优先级 | 动作 | 对应 FEAT/领域 | 来源依据 | 备注 |
|---|---|---|---|---|
| L0 | ComfyUI 出图链接线：补 Tauri invoke 桥，接入 submitImageCommand→executeTask，逐任务取消/重启恢复 | FEAT-004/005 | 二开生态最热需求（huobao-drama-comfyui 等 6+ 二开）；代码已写未接 | 现成活，缺口明确，最高性价比 |
| L1 | 画布底座引入评估：tldraw SDK（商业授权）vs Excalidraw（开源）vs leafer，50 个自研文件降为适配层 | FEAT-001 | C1 共识 + 影策/BeefTV/ComfyArt 均用库 | 需许可与迁移风险评估；ALE 灰度替换 |
| L1 | MCP 服务端侧：画布操作与生成能力输出为 MCP tools | FEAT-012/030 | C2 共识；无限画布 canvas-agent 模式 | 与出站 MCP 客户端共用契约层 |
| L2 | Skills 版本管理：安装锁定（skills-lock 式）、版本回退、私人改写 | FEAT-011 | C3 共识；BeefTV 市场设计 | 先契约后市场 |
| L2 | 持久任务编排：评估 Temporal 式 durable workflow 或轻量替代（journal + 恢复） | FEAT-024 | Waoowaoo 实践 | 与现有 reservation/health/journal 衔接，不引入双轨 |
| L2 | Agent 三段式：规划→执行→回读检查产物 | FEAT-030 | BeefTV 25 节点实例模式 | 适配现有编排契约 |
| L3 | 插件脚手架 + 包市场 | features/plugins | C4 共识；Toonflow 四 scaffold | 契约稳定后再工业化 |
| L3 | 线性流程人工介入点显式化 | creation | C8；火宝模式 | UI 层改进 |
| L3 | 3D 导演台预演（three/fiber） | 画布增强 | 影策/Toonflow/Pi-Paper 均有 | 依赖 L1 底座决策 |
| L3 | 电商垂直场景验证（Canvex 模式） | 新 feature 候选 | 用户业务背景 | 需用户确认场景优先级 |

## 5. 持续增进机制

### 5.1 节奏（挂接 DEVELOPMENT-WORKFLOW.md 第 8 节）

- **每周短观察（30 分钟量级）**：GitHub topic 扫描（`ai-video`、`infinite-canvas`、`short-drama`、`ai-agents`）+ 已跟踪仓库 release/star 增速。
- **每两周路线复盘**：对照 §4 Backlog 与 §2 基线表，更新对齐状态；输出记入 `docs/reference/competitor/` 或对应 change package。
- **触发式研究**：竞品发布重大版本、品类出现新共识模式、或 KK 功能卡出现"竞品已有而 KK 缺"的差距时，随时开研究包。

### 5.2 入库标准（沿用 INDEX.md，不另立）

新材料必须能回答：研究了哪个外部对象、何时、什么模式、留下什么证据、静态/运行/账号/费用边界。关键词命中不自动入库。

### 5.3 学习→落地闭环

```
竞品观察/研究 → 回写 COMPETITOR_CONCLUSIONS.md（结论+边界）
            → 差距映射到 FEAT 卡/账本任务（L0-L3 排序）
            → SDLC 正常流程（spec/plan/门禁/REAL 证据）
            → 合并后更新 §2 基线表对齐状态
```

- 转化率纳入每周任务整理的观察指标（与 DEVELOPMENT-WORKFLOW.md 第 8 节现有指标合并）。
- **禁止**：静态比较、截图或竞品未运行的材料提升 KK 完成度；只有本地实现 + 适用运行验证 + 交付门禁才能关闭候选。

### 5.4 证据与合规纪律

- 一切竞品功能描述默认 `runtime_verified=false`；文章案例、star 数、自述制作记录均为项目自述，引用时标注。
- **许可评估前置**：tldraw 为商业授权（捆绑需 license，无 key 显示 badge）；BeefTV 新内容为 Source Available；引入任何竞品资产前必须过许可评估，禁止直接复制源码/CSS/提示词。
- 不复制竞品服务端假设、模型池或计费逻辑；只复用可公开验证的契约与模式。

## 6. 本方针的维护

- 每次路线复盘检查 §2 基线表是否需修订（新共识出现时新增行，标注日期与证据）。
- 每完成一个 L 级动作，在表格"KK 状态"列更新并注明关联任务/功能卡。
- 本文件与 `docs/reference/competitor/INDEX.md`、`COMPETITOR_CONCLUSIONS.md` 同步更新，保持单一事实源。
