# W1 Gate Zero 复核记录

## 2026-11-02 contract corrections

当前收尾以本地 main `15ad1617` 为 base。设计只读回读：文件 `ZiadpErDoFweCjG3uHjkM3`，顶部 HUD `655:141110`、底部工具栏 `2149:42515`，session `9d792529-3da8-4049-a29c-35f3e6b17576`。既有控件/功能保持，本次修复触屏事件、可用高度和裁切，不需要新增 Figma 设计。既有 Figma 页面快照在 `D:/kk-studio/output/figma-pages-takeover-2026-11-01/manifest.json`。

下表引用的是逐项清单的稳定 index，逐条查过原错误与当前 PASS；没有按“超时”批量豁免。没有列为 obsolete 的失败继续保留产品修复/待复验状态。

| 原 index                                             | 更正依据                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22、23、28、29、32、104、106、107、124               | 当前四象限设置/五接入渠道与能力优先模型菜单替代旧渠道按钮、旧 region 和发现模型 select。Figma 页面快照及 [UI_RULES](../../UI_RULES.md) 的模型接入/能力选择合同；当前入口映射在 `ModelAccessSettings.tsx`、`ModelPickerMenu.tsx`、`ProviderModelCatalog.tsx`。保留禁用、精确账号、模型发现、取消及迟到响应断言。 |
| 159                                                  | 基础 body 字阶为 16px，旧 14px 断言过时；Figma 控件母版 `551:6356` 与 [UI_RULES](../../UI_RULES.md) 字阶合同。                                                                                                                                                                                                  |
| 163–165、191、193、194、197、198、201、202、206、207 | full radius 采用语义 token 1000px；旧 999px 字面量与 Figma 母版 `551:6356`/底部组合 `2149:42515` 不符。                                                                                                                                                                                                         |
| 190、192                                             | 触控/窄布局命中区 44px；Figma 母版 `551:7196` 与 UI_RULES 的可见框/命中区区分。                                                                                                                                                                                                                                 |
| 223–227                                              | 当前 72px rail、292px 展开壳、画布主体与编辑器坐标；Figma 页面快照、UI_RULES 几何合同及已核准 `canvas-wide-geometry.spec.ts` 的 156px 收起前提，替代 237px。几何/连线/归档/真实点击断言保留。                                                                                                                   |

index 4（原始命中问题）和 27（模型目录刷新结果）继续按产品问题记录；没有因错误上下文出现旧关键词就改成过时断言。结果表为 199 product_defect、29 obsolete_assertion、0 environment_issue；其中 109 项已有定向 PASS，119 项未重跑，不能宣布全量浏览器全绿。

独立只读双轴初审覆盖 `15ad1617..0f317916`：`/root/w1_standards_review` 发现 W1-STD-01/P2（旧聚合置顶 ID 兼容）；`/root/w1_spec_review` 发现 P2（未知操作从 Object.prototype 取值）、迟到路由完成屏障及残留 ADR 链接。`45e75b23` 已补迁移/own-property 校验/回归/屏障/链接，相关纯逻辑 22/22、浏览器 17/17 通过。最终提交的独立复核待回执，初审 CHANGES REQUIRED 不被自审改写成 PASS。

## 最终独立复核回执

- Base：`15ad1617a62df26e67c4ad85d3c65be8d987d1cb`；审查 Head：`a04d5a435cc33c787f785255b437c9b7ed16c384`。
- `/root/w1_final_standards`：**PASS WITH FOLLOW-UPS**。重新读取实际 diff/调用链与门禁日志，确认旧置顶迁移、own-property 拒绝、草稿隔离、目录取消及有界 runtime 替换；没有未关闭合并 blocker。
- `/root/w1_final_spec`：**PASS WITH FOLLOW-UPS**。四项前审问题已复核；29 条 obsolete 分类逐项核对原错误和当前合同，并独立只读回读 Figma（session `d7e9818f-35d3-4035-acad-1bcd3c4b24ad`）。最终 HEAD 的 18/18 浏览器回执已核对，36.13 秒、1 worker、0 unexpected。
- 初审 CHANGES REQUIRED 保留为历史；上述为两个新的独立上下文复核，不是实现者自评。审查未自行重跑浏览器或原生/Hosted，119 条未复验历史失败仍保持开放。
- 本地 main 已由 `15ad1617` 快进到 `a04d5a43`；后续仅收尾文档的提交另做只读 delta 复核，最终 SHA/回收事实保存在工程外 `final-receipt.json`，不把旧 SHA 审查冒称新 SHA。

以下为初始 Gate Zero 复核，保留历史含义。

- Review scope：`main@56e8b9f2` 的一次完整 Edge 运行、串行 Gate Zero 定向回归、W1 包 A/B diff。
- Browser verdict：**CHANGES REQUIRED**。并行基线有 227 项 unexpected，串行复核有 228 项 unexpected；串行仍复现这些失败，因此当前逐项清单全部保留为产品缺陷，不使用“超时即环境”或未举证的过时断言豁免。
- Code-health verdict：**PASS**。`agentCanvas.ts` 阻塞复杂度已降至 0 blocking；仅保留两个已有允许 advisory。
- Windows publish verdict：**BOUNDED PASS**。`EPERM`/`EBUSY` 原子替换窗口固定为 9.45 秒、最多 7 次；11/11 runtime package tests 通过；Hosted 原始 EPERM 证据仍未重跑为成功。

当前 Figma/合同引用、逐项 test title/error/category、以及六个 Gate Zero 任务的后续动作见 [browser-classification.md](./browser-classification.md)；逐项 evidence manifest 为 `D:/kk-studio/output/w1-gate-zero-2026-11-01/browser-failure-classification.json`。
