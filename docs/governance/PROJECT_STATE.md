# 当前主线状态

- docId: PROJECT_STATE
- status: current
- updatedAt: 2026-11-07
- source: `docs/governance/task-ledger.json`
- supersededBy: null

| 项目 | 当前事实 |
| --- | --- |
| 正式工程 | D:/kk-studio/KK-Studio-2.0，唯一worktree；复用chore/sync-local-main-20261106；本地main同审查分支 |
| 版本 | Desktop / Web 源码2.1.66，Mobile 2.1.44；当前源码不等于已安装或正式发布 |
| 当前任务 | TASK-SYNC-LOCAL-MAIN-20261106（Cursor）：全面治理收口dirty、修门禁与锁表，推审查分支重跑PR #83；不合并main |
| 实现 | 导演机位/预设/同源桥；设定表提炼；MCP Schema；Floorplan；设置页拆分与Mobile token；雷达默认验证命令已改为真实scripts |
| 当前验证 | 本地 typecheck/lint/format/ui/tokens/unit 通过；Hosted 曾在4990025b Verify因Prettier失败、Delivery/Installer绿。推送后以新SHA Hosted为准 |
| 能力边界 | 外部桥无真实侧车；成本回执无真实扣费；UI-004仍PARTIAL；正式独审/已安装Desktop/发布未完成 |
| 工作树 | 仅1树。禁止擅自合并PR、删树、force；允许推送到审查分支触发检查 |

[本次验证](../changes/2026-11-05-step2-deep-water/verification.md) · [审查](../changes/2026-11-05-step2-deep-water/review.md) · [上一阶段历史验证](../changes/2026-11-04-e2e-wiring/verification.md) · [台账](task-ledger.json)

## 2026-11-06 主线与台账续验

- FACT：远端origin/main为9b1038a7；PR #83 HEAD4990025b、OPEN、无冲突但checks不全绿；main相对origin/main为220/0，三个本地分支均无仅存本地提交。GitHub reviews/threads为空，不代表独立审查通过。
- FACT：10个开放PR、89个远端分支已逐项建包含关系。#81 HEAD70a66bae完整包含于#83；#80/#58/#52/#50/#49/#47/#45/#44各有2/12/7/1/6/3/4/7个非祖先提交。不得重复合#81或删除其余独有历史；非祖先与patch不等价不直接证明全部源码缺失。
- FACT：222项静态审计，121 DONE、77 PARTIAL、16 TODO、3 BLOCKED、2 IN_PROGRESS、3 OBSOLETE；1134引用/770证据文件均存在，状态不批量升降。已更正Gateway/DPAPI流、独立Mobile、H3/宽图后继验收与旧P2路由，全部历史失败保留。
- FACT：B1–B4及主要六支柱生产链已有；B5抽查复用共享组件，原控件全集/A2与A3独立编号映射未存。历史verify-4完整通过后verify-5仍有失败，均不覆盖当前候选。硬件调度/DelegationPipeline/externalBridge只有helper或离线契约，不能冒充新增生产接线；不在收口任务扩展功能。
- 下一优先级：当前整合候选完整Verify、当前Desktop来源与Native运行、04设置/05手机同状态验收、正式SHA独审及Hosted复验。像素、真实Provider与产品验收按各自缺口保留，不以门禁退出码代填。

[主线续验与完整包含表](../changes/2026-11-06-ci-gate-repair/verification.md)。

## UI-004 当前同步状态（2026-11-06）

- FACT：旧main@3d7cc573+UI dirty是历史证据时点；原UI源码已包含于4990025b审查起点，当前本轮在审查分支追加04网络和05设置的Figma同步增量。Desktop/Web源码2.1.66，Mobile2.1.44。
- 当前约束：全部通过MCP；有问题先修当前Figma并回读，再同步本地。Figma已正确的设计保留，禁止改设计迁就旧实现。
- FACT：本批修正真实设计字体未加载、三张封面重复和旧Logo；先在Figma修正关闭尺寸说明冲突。真实CDP确认Source Han Sans CN VF已loaded，三封面来自当前Figma，源原图与dist一致。
- FACT：26项定向生产浏览器、typecheck/ui:check/rules:check/build通过；官方Desktop2.1.66重建、EXE659e1eb4141f、inputf2d7addff220，来源指纹稳定、依赖无漂移。首轮构建因并发修改被护栏拒绝，失败和失配收据保留。
- 边界：本批通过不代表全部页面和功能完成；42项功能登记保持REAL7/PARTIAL31/PROTOTYPE3/PLANNED1，未升级真实度。旧verify24的959通过绑定旧来源；当前字体修改后的整套verify、全页六态/像素、Native窗口、独审和正式发布尚未验收。
- FACT：本轮已回读当前Figma04（2:47）、05（91:11）、桌面通用设置47:184及独立手机设置770:97841的高保真上下文/截图，session d00ae207-49e9-4b40-a696-d3e169ec9228；MCP可读不等于已完成像素或六态验收。
- BLOCKED：原127入口IndexedDB旧Agent线程及备份Google会话无法通过完整迁移校验，原件未清空或覆盖；当前读取保护保留。独立任务详情完整设计来源继续由agent追踪。

[UI当前验证与逐轮证据](../changes/2026-11-05-figma-local-sync/verification.md)。

2026-11-07补记：Mobile源码typecheck/435单测、组合Web44浏览器零重试通过；当前320/390两主题设置及按下态有真实截图/DOM，不能代填全页/六态/字体/像素或真机。Rust429通过/1既有忽略、fmt与client:check通过。原始Token泄漏和冻结hash失败已按来源修复并保留日志。Verify05已为2742单元通过/20跳过、205 Agent通过/2跳过、963浏览器通过/1跳过、设计9/9、插件PASS；当前EXE SHA `476FFF2B...CE82`，Native taskhost 11/11。正式SHA独审、Hosted、安装器/已安装版本、全窗口/真机与用户验收仍未完成。
