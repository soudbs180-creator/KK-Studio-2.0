# 竞品与外部研究目录

更新：2026-10-09。本目录只收录有明确外部对象、只读边界、日期和来源的研究材料。它们描述被审计的快照或页面，不能证明 KK Studio 当前能力、真实供应商接入、账号状态、价格或模型质量。

## 纳入标准

材料必须能回答“研究了哪个外部对象、何时、用什么模式、留下什么证据”。同一研究包的 intent/spec/plan/review/verification 作为研究包索引，但只有明确的外部观察或静态比较才是研究结论；本地实现计划和本地回归仍标为 change evidence。仅因文件出现“豆包、WorkBuddy、CodeBuddy、MiniMax、竞品”等关键词，不会自动进入研究目录。日常观察、差距筛选和每周/双周复盘按 [`DEVELOPMENT-WORKFLOW.md`](../../engineering/DEVELOPMENT-WORKFLOW.md) 执行。

## MiniMax Design：2026-09-21 深度审计（五份锚定文档）

| 文档 | 类型 | 结论边界 |
| --- | --- | --- |
| [`intent.md`](../../changes/2026-09-21-minimax-deep-audit/intent.md) | 研究包意图 | 真实安装包和交互审计范围；未执行付费生成、登录或上传 |
| [`plan.md`](../../changes/2026-09-21-minimax-deep-audit/plan.md) | 研究/实施计划 | 只读审计与本地原型的分界；不是 MiniMax 功能证明 |
| [`spec.md`](../../changes/2026-09-21-minimax-deep-audit/spec.md) | 观察与本地映射 | 可观察入口和 KK 原型契约；连接器安装、云端和 Tauri 仍未接入 |
| [`verification.md`](../../changes/2026-09-21-minimax-deep-audit/verification.md) | 研究证据 | Web 开发态的同态行为证据；不证明完整 MiniMax 覆盖或 Tauri release |
| [`review.md`](../../changes/2026-09-21-minimax-deep-audit/review.md) | 边界审查 | 结论为 PARTIAL；独立复核、付费生成和第三方安装边界保留 |

外部审计的截图与运行摘要见 [`docs/evidence/minimax-deep-audit-2026-09-21`](../../evidence/minimax-deep-audit-2026-09-21/)；MiniMax 原始静态分析包在工程外 `D:/kk-studio/output/minimax-rea-20261008`，不复制为产品源码。

另有一份独立的 2026-09-09 本机交互观察 [`minimax-observation-2026-09-09/README.md`](../../evidence/minimax-observation-2026-09-09/README.md)。它是早期坐标观察和 KK 映射记录，已标为历史补充证据；截图中的交互尝试没有被写成节点位移或生成能力事实。

## MiniMax/REA：2026-10-08 阶段工作台比较证据

| 文档 | 类型 | 研究状态 |
| --- | --- | --- |
| [`comparison.md`](../../changes/2026-10-08-stage-workbench/comparison.md) | 比较说明 | `read_only_static_comparison`；竞品没有运行或云端调用 |
| [`kk-workflow-comparison.json`](../../changes/2026-10-08-stage-workbench/evidence/kk-workflow-comparison.json) | 工作流/Agent/Skill/插件对照 | `runtime_verified=false`；行号绑定 2026-10-08 快照 |
| [`kk-generation-comparison.json`](../../changes/2026-10-08-stage-workbench/evidence/kk-generation-comparison.json) | 生成/资产/Gateway 对照 | `runtime_verified=false`；产品文件未修改 |
| [`review-41dd865.md`](../../changes/2026-10-08-stage-workbench/evidence/review-41dd865.md) | 比较审查 | 只读审查，保留静态推断和未知项边界 |
| [`review-dfd4c12.md`](../../changes/2026-10-08-stage-workbench/evidence/review-dfd4c12.md) | 独立阶段工作台审查 | 产品缺陷审查证据，不等同于竞品运行证据 |

该包的 `verify-*.txt`、`browser-no-retry.txt`、`integration-full-verify.txt` 和 `runtime-source-hashes-*.json` 是 KK 本地验证/源指纹日志，已保留在原目录但不作为竞品研究；`integration-plan.md` 是本地合并计划，也不作为外部研究结论。

## Kaworkai 无限画布：2026-09-29 研究包

| 文档 | 类型 | 研究状态 |
| --- | --- | --- |
| [`intent.md`](../../changes/2026-09-29-kaworkai-canvas/intent.md) | 只读研究意图 | 外部页面交互审计；远程生成、积分和云协作明确排除 |
| [`research.md`](../../changes/2026-09-29-kaworkai-canvas/research.md) | 外部页面观察 | 页面脚本快照在工程外 `.tmp/kaworkai-inspect/`；保留实现映射和未知项 |
| [`spec.md`](../../changes/2026-09-29-kaworkai-canvas/spec.md) | 研究到本地契约映射 | 本地画布快照、撤销、吸附和图层检索；不复制竞品 CSS 或远程工具 |
| [`plan.md`](../../changes/2026-09-29-kaworkai-canvas/plan.md) | 研究实施计划 | 本地基础能力的定向实现和验证 |
| [`verification.md`](../../changes/2026-09-29-kaworkai-canvas/verification.md) | 研究/本地验证 | 参考页面只读证据与本地回归分栏；全量画布 fixture 缺口保留 |
| [`review.md`](../../changes/2026-09-29-kaworkai-canvas/review.md) | 研究包审查 | 记录 P2 阻断和后续复核条件，不能当作当前产品 PASS |

参考页面为 `https://www.kaworkai.com/pages/infinite-canvas.html?board=proj-3d526516-3f6`；页面快照不属于交付源码。

## AI 短剧 / 视频创作工作台品类：2026-10-26 静态研究（七个仓库）

| 文档 | 类型 | 结论边界 |
| --- | --- | --- |
| [`intent.md`](../../changes/2026-10-26-ai-drama-canvas-research/intent.md) | 研究包意图 | 用户推荐文章触发；GitHub 只读检索范围；未 clone、未运行、未计费 |
| [`research.md`](../../changes/2026-10-26-ai-drama-canvas-research/research.md) | 外部静态研究 | `read_only_static_research`；`runtime_verified=false`；star 数为 2026-10-26 检索值 |

研究对象为文章推荐的 7 个仓库（Toonflow 19.4k★、火宝短剧 16.6k★、Waoowaoo 14.7k★、无限画布 9.1k★、DramaClaw 6.5k★、BeefTV 1.9k★、影策 1.4k★）及二开/Skills 生态。研究结论的持续学习动作见 [`COMPETITIVE-LEARNING-POLICY.md`](../../engineering/COMPETITIVE-LEARNING-POLICY.md)（2026-10-26 制定，挂接 DEVELOPMENT-WORKFLOW 第 8 节）。该研究不改动任何产品文件，结论仅作设计输入。

## 供应商和 Agent：集成证据与研究的区别

| 材料 | 目录分类 | 可声明的事实 |
| --- | --- | --- |
| [`doubao-status.json`](../../changes/2026-10-01-agent-image-transport/evidence/doubao-status.json) | 负向诊断证据，不是研究 | 2026-09-30 `dbb doctor --deep` 因区域限制无编辑器；没有生图或共享记忆联调 |
| [`2026-09-24-codebuddy-delegation/`](../../changes/2026-09-24-codebuddy-delegation/) | 本地 CodeBuddy CLI 集成 change package，不是竞品研究 | WorkBuddy 安装包内 CodeBuddy CLI 有受限真实短文本回执；不等于 WorkBuddy 原生 OAuth 或自动路由 |
| `docs/MEMORY-CONTRACT.md`、`docs/architecture/DATA-STORAGE.md` | 产品契约，不是研究 | 明确豆包和 WorkBuddy 原生客户端尚未完成共享记忆适配；登录不构成共享证据 |

## 关键词命中但不纳入研究的材料

`rg` 命中 MiniMax、豆包、WorkBuddy 或 CodeBuddy 的历史进度、功能卡、账本、供应商配置、Agent 测试、归档 UI 和 memory 文档，若没有外部对象的可复核观察，就保留在各自领域来源，不复制到本目录。关键词只能触发人工分类，不能生成“竞品研究”标签。

研究结论的复用边界见 [`COMPETITOR_CONCLUSIONS.md`](COMPETITOR_CONCLUSIONS.md)。
