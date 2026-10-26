# 研究结论与使用边界

更新：2026-10-09。以下结论来自 [`INDEX.md`](INDEX.md) 收录的有日期、只读边界和来源的研究包。它们是历史研究输入，不是当前产品状态或供应商能力声明。

## 可作为设计输入的结论

- MiniMax/REA 阶段工作台快照把认知角色、阶段计划、稳定 `work_items`、依赖引用、revision 检查和部分重试作为显式契约。KK 已有 StagePlan 与统一 CreationTask 接口，后续应复用这些边界，而不是创建第二套计划或任务状态。证据：`KW01`、`KW04`、`KW05`、`W02`、`W05`、`W06`。
- 阶段工作台比较指出，审计提交中的 TaskWorkbench 与 AgentHost 尚未完整接到 stage-plan 状态；该缺口由任务账本跟踪，比较本身没有修复或验证当前 HEAD。
- Kaworkai 页面观察支持本地画布的可逆历史、快捷键、吸附偏好、图层定位等基础交互取舍；远程 AI 工具、积分、服务端 board API、竞品 CSS 和多人协作没有进入本地实现范围。
- 未知或外部受理的生成状态必须与普通失败区分；重试和重规划要保留 task identity、revision 和已接受前缀。
- Provider、ComfyUI、MCP、模型和外部账号行为需要 live 或 host-specific evidence。静态 prompt、配置或页面关键词只能描述契约或研究线索，不能证明运行成功。
- AI 短剧/视频工作台品类（2026-10-26，`KW07`）静态研究支持：无限画布是品类唯一交互范式（7/7），KK 的 FEAT-001 方向正确；但画布底座自研与品类共识（tldraw/Excalidraw/Vue Flow/xyflow）相反，且违反 KK 自身反重复造轮条款，应评估引入成熟库。证据：`KW07`。
- 同研究支持：Agent 经 MCP 操作画布是品类共识（5/7 有显式 MCP 或 agent 宿主）；KK 当前只有 MCP 客户端，缺"画布与功能暴露为 MCP 服务端"一侧。Skills 已成独立内容品类（libtv-skills 1.2k★、screen-creative-skills 475★），可对接 FEAT-011。证据：`KW07`。
- 同研究支持："接入本地 ComfyUI"是该品类二开最热方向（huobao-drama-comfyui 等 6+ 二开仓库），与 FEAT-004/005 的既有缺口一致；Waoowaoo 以 Temporal 做持久任务编排，可作为 FEAT-024 的参照。证据：`KW07`。

## 集成事实不能改写成研究结论

- CodeBuddy change package 有本机 WorkBuddy 安装包内 CLI 的受限真实回执。它证明的是 KK → CLI 的局部集成边界，不证明 WorkBuddy 原生 OAuth、自动路由或其他竞品功能。
- Doubao `dbb doctor --deep` 的证据是区域限制下的失败诊断；它不证明豆包生图、记忆共享或其他云端能力。
- `MEMORY-CONTRACT.md` 明确豆包和 WorkBuddy 原生客户端尚未完成共享记忆适配与联调。仓库关键词、登录提示或功能卡文字不能替代该证据。

## 研究边界

MiniMax/REA 阶段比较的 KK 范围为 `D:/kk-studio/KK-Studio-2.0` 在提交 `21d121d2b884b2b7ced4a98eb0e03c590de5c3cd`，分析日期 2026-10-08，模式 `read_only_static_comparison`，`runtime_verified=false`，`product_files_modified=false`。原始包位于工程外 `D:/kk-studio/output/minimax-rea-20261008/`，不把其 packaged instructions、并发、路由、媒体或后端说法当作独立验证。

Kaworkai 的参考页与脚本快照只在 `2026-09-29` 研究记录的范围内有效；本地画布回归中的 fixture、连接拒绝和 P2 阻断仍按原 verification/review 记录处理。当前源码或账本改变后，必须重新核对 source/date/runtime boundary。
