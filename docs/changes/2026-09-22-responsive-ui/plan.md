# 三档适配实施计划

> 执行方式：superpowers:executing-plans，本任务在同一上下文实施，最后独立审核。已授权范围自主执行。

**Goal:** 修复三档尺寸、图标偏移、面板挤压与异常换行。
**Architecture:** 沿用Sidebar/CanvasHud/Conversation等组件，统一响应式规则由App最后加载。颜色不变，断点和命中尺寸集中管理。世界坐标不按屏幕尺寸缩小。
**Tech Stack:** React18 / TypeScript / CSS / Playwright / Tauri2，零新依赖。
**Spec:** [spec.md](spec.md)

## 约束与重点

三档为<768、768–1200、>1200；保留原图标和桌面来源；旧版代码只做阅读参考；不隐藏未接服务标识。不改用户数据与并发代码。五个重点：短屏键盘、长型号/标题、跨档焦点、聊天覆盖画布命中、深浅主题图标。

- [x] 核对当前代码/规则、Figma/旧版本及三档before截图；基线lint/typecheck/build、351单测通过（隔离快照补齐vendor源码及已有验收文件后）。
- [x] 先修正DESIGN-SYSTEM/UI-STANDARDS/UI-ALIGNMENT/UI_SPEC中冲突的窄屏规则。
- [x] 在tests/browser/responsive-layout.spec.ts记录手机全宽、平板对话最小宽、图标中心和跨档草稿的失败用例。
- [x] 实施共享尺寸、侧栏/底部导航、HUD、首页输入、对话与弹窗的三档布局；保持业务state和dismiss栈。
- [x] build后运行定向Playwright，对照before/after截图迭代；更正已被新产品契约替代的旧窄屏断言并保留回归目的。
- [x] 运行完整verify；独立diff预检；有冲突先核对原目录最新改动，仅回传本任务增量。
- [x] 原工程最终运行链/Web与fresh Tauri取证，更新ledger/PROGRESS/remaining，保留外部未验收项。
