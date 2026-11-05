# Figma 本地同步 Implementation Plan

> 执行方式：主代理统一实施并运行门禁；共享壳专人修改独占CSS，独立只读核对设置/项目来源。使用现有授权，不增加过程审批。

**Goal:** 让本地各入口及适用状态完整遵循当前Figma，并保留可追溯的逐项运行证据。

**Architecture:** 在现有组件、语义tokens和页面CSS上修正漂移；公共差异回到共享实现，业务状态选择对应设计变体。

**Tech Stack:** React18、TypeScript、Vite、既有CSS与Playwright/Edge，不新增依赖。

**Spec:** [spec.md](spec.md)。

## 约束与核查重点

保留开工dirty改动；禁止覆盖业务代码、硬编码模型示例、删除合法状态或更改数据身份。检查窄屏触控、长文字、空模型、加载/错误、只读保存保护、Tauri独有控件及CSS加载顺序。

- [ ] 读取01/03/04对应源与get_design_context，保存当前入口/矩形/截图并登记差异。
- [ ] 修正共享壳：`src/styles/sidebar.css`、`desktop-titlebar.css`、`tokens.css`；同步本地派生规范。校验Web/Tauri和侧栏两态。
- [ ] 修正首页：`StartPage.tsx`、`StartComposer.tsx`及其实际CSS/已有参数控件；按媒体/对话源分配组合，保持提交、模型、扩展与授权行为。
- [ ] 修正设置及项目库的已确认源差异，再逐项核对画布/对话、素材、任务及响应状态；依赖未定义设计的部分先登记并解决来源。
- [ ] 使用既有相关浏览器回归、同状态浏览器截图/计算样式验证。每批代码运行typecheck、lint、npm test；合流前完整verify及适用Desktop验证，失败保留。
- [ ] 版本按实际共享产物更新；复核最终diff和源码身份，完成独审、文档/账本和既有合流流程。未达到全量验收不关闭UI-004。
