# Plan：画布轻量性能优化第一批

- Task ID：TASK-CANVAS-PERF-20261024；状态：IN PROGRESS
- [Intent](intent.md) / [Spec](spec.md)；root 集成，基线 `1fbac26b33bdabaad682ad398f5292360eb9c66a`。
- 已读取 AGENTS、AI_RULES、工程流程/编码/测试/分支/版本/评审规则及相关当前源码。
- 已检查现有工作树、分支、账本和重叠任务；当前 checkout 含用户最新画布编组改动，复用它并以文件副本作 patch 基线。不得提交或合并混入他人改动的宽泛 diff。
- 证据目录：工作区 `output/canvas-performance-20261024-8b27aa/`，含 baseline 文件/hash、Git/index 状态及检查日志；不新增依赖。

## 顺序与归属

| 步骤 | 唯一写入者/文件 | 验证 |
| --- | --- | --- |
| 1 | root：本交付包、账本、PROGRESS；浏览器代理独占1423构建前置基线 | baseline test/typecheck/lint，现有手势用例 |
| 2 | root：useCanvasHistory、实际 hook 回归 | 先失败后修复；100帧计数、初始化、应用确认、取消与撤销 |
| 3 | storage 代理：useCanvasPersistence、useCreationStorage、storage及专用测试 | 先失败后修复；无关render指纹、20项目100次提交、journal/保存队列 |
| 4 | render 代理：CanvasConnections/单边、useCanvasNodeLayerHandlers及NodeLayer派生集合、专用测试 | hover/pan/端点失效计数及真实React行为 |
| 5 | root：整合、版本、文档；浏览器代理运行最终复验 | 全量test/typecheck/lint、完整verify、build、DOM/截图与实际bundle |
| 6 | 独立 reviewer：冻结本任务patch对保全基线审查 | 修复可复现问题，准确登记未验项 |

产品编辑已在前置 build 完成后启动，固定端口所有者唯一。跨文件写入不重叠。渲染范围不含 App Context/节点 handler 全链重写；不得以局部收益代称全部节点已隔离。

## 基线与风险控制

2026-10-24 开工前 `npm test`：2295 tests / 2275 pass / 0 fail / 20 skipped；typecheck、lint exit0。health 有58项既有 advisory blocking findings、footguns有1项 advisory，非全项目零技术债。前置真实Edge/1423浏览器基线14/14首试通过。

先保留原实现出现的计数失败，再最小修复。只统计实际执行，不把合成计数当帧率/内存保证。保存频率不降低，未知/受理任务不重试。未通过门禁不发布、不合并主线；已验证代码也不能带入不属于本任务的 dirty/index。原生重建/安装、真实 Provider 与大媒体长时压力若未执行必须写明。

## 实际进展与计划调整

- history/storage/render窄切片已实现；原render代理额度中断后由新代理接管，仅保留并完成已有测试文件，无重复分支/工作树。
- 首次完整verify已通过lint/typecheck、2290单元/204 Agent（各有既有skip）、ui:check；在本批history依赖数组换行格式失败。只格式化该文件后全量format:check通过，生产bundle重建字节不变；原失败保留，第二次完整verify运行中。
- 独审指出旧保存队列harness不调度后续effect/timer，不能证明180ms自动保存。补真实依赖/cleanup和虚拟timer测试，32项队列用例通过；独立变异去除保存effect后新增用例确实失败，证据缺口关闭，产品保存频率未变。
- 浏览器扩展从证据目录运行产生4项相对fixture路径错误及1项旧设置按钮选择器超时；30项通过。保留该轮失败，完整verify从仓库cwd重验，不通过更改产品或放宽断言掩盖。
- Desktop/Web源码版本按项目脚本从2.1.42递增到2.1.43；Mobile保持2.1.42。未安装、发布或合并，不使用版本号代替验收。
