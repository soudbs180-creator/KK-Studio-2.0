# Plan：有界本地流式修复

TASK-GATEWAY-STREAM-20261018。依赖冷启子任务DONE；父Gateway仍PARTIAL作为需求引用，不构造不可完成的父任务依赖。

- [x] 现有六处生产调用链、主入口未注入与当前版本/保护边界核查；冷启基线00e79、d5完整verify中网关相关现有回归通过。
- [x] 忽略目录受控HTTP生产路径预复现，10失败/2兼容正例通过，全部gate释放且无强停；原失败和fixture receipt保留。正式测试原位再RED后修复。
- [x] 独立实施者窄写adapter.ts/doubao.ts/可选私有chatStream.ts/scheduler.ts/chat.ts/generation-server/http.ts及关联测试；先覆盖首段barrier、首段后失败、两时点取消、filter/refusal与非stream兼容，再补必要解析边界。root独占文档/版本/Git/端口/Native。
- [ ] root按实际backend-only链路官方工具web patch41；定向/本地HTTP集成、全量verify、精确源码独立双轴审查。无需前端重设计或新增依赖。
- [ ] 保全上一40生成产物后官方当前Desktop40重建；原默认资料严格冷启/可编辑保护及当前Native Canvas专项按精确源/产物验收，不冒称真实模型。
- [ ] 父Gateway差距与FEAT-038卡/ledger/当前入口同步；最终精确HEAD/Delivery/私有归档/原两个快捷方式单实例日常还原。

失败保留原件，正常关闭自有fixture/Native，无delete/move/reset/clean/force kill；产品变更有正式回归，现有验证不降级。

新parser异常终结P2与usage/隐私边界已正式RED后修补；46新/144定向GREEN，待新精确源完整verify/独审与当前官方Native。真实Node高水位=1观察write(false)/drain，无mock写结果；测试support安全断言按现有support职责独立，全部新增文件小于600行。

source6df完整verify已通过但独立Standards发现实际SSE停住忽略既有timeoutMs，仍不放行。保留该源/完整verify/真实deadline反例；下一最小attempt deadline/reader及HTTP背压取消贯通先正式RED，再新精确commit完整验证/双轴，不能沿用6df通过批准新源。
