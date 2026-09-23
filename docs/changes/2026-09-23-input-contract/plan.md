# 输入规则与实现计划

> 执行方式：superpowers:executing-plans；当前用户已授权修正规范并实现，无逐阶段形式审批。独立上下文完成最终审查。

**Goal:** 首页与对话输入框遵循同一清晰契约，三档显示与交互一致。
**Architecture:** 保留现有业务组件；共享 textarea 尺寸行为与输入容器 CSS，移除失效的旧输入几何。菜单与状态继续由现有 hooks 管理。
**Tech Stack:** React18、TypeScript、CSS、Playwright/Edge、Tauri2，无依赖升级。
**Spec:** [输入契约](spec.md)。

## Constraints / review focus

保护未提交候选、Agent/Provider与用户数据；不移动画布坐标或替换原资产。重点复核多附件+多行的真实点击、型号参数长文本、短屏编辑、IME/失败/切档草稿、菜单焦点与视觉边界。

## Steps

- [x] 保存当前三档同态截图；添加有意义的浏览器回归：多行增长有上限、附件后动作仍可点、焦点只有容器一层。先运行确认现有失败。
- [x] 更新 DESIGN-SYSTEM、UI-STANDARDS、UI_SPEC 的输入条款；新增 ComposerTextarea 与 composer.css 作为共同拥有者。StartComposer/ConversationComposer 共用输入行为，附件进入流布局。
- [x] 统一操作几何，移除重复旧规则。保持实际表单、菜单与Agent克隆契约，使用原图片资产。
- [x] 重新build后核对三档截图与DOM；跑输入、模型、菜单、语音、响应式回归；修订有来源依据的旧精确尺寸断言，保留其交互目的。
- [x] 独立审查源码增量；回传前逐文件比较基线防止覆盖并发改动。原工程先agent:build再verify，新Tauri验证实际JS/CSS字节和输入流程。
- [x] 完整记录证据、剩余限制及账本/PROGRESS/PROJECT_STATE/HANDOFF；不commit/push。
