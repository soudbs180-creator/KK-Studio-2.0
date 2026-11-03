# 验证记录

- 分支：`feat/TASK-COMFY-IMAGE-20261103-production`（Base `b90d285d`，HEAD `8077aa9e`），版本 Desktop/Web `2.1.64`、Mobile `2.1.44`。
- 设计真值对齐：Figma `ZiadpErDoFweCjG3uHjkM3` 桌面参数与图片编辑节点 `4225:61228`、图片工具栏换行状态 `4238:604`（最大 380px 流式换行、44px 触控命中区、居中跟随卡片）。

| 检查项 | 结果与证据 |
| --- | --- |
| 类型 / 治理 / 功能卡 / 格式 / UI 标准 | `npm run typecheck`、`npm run lint`、`npm run features:check`、`npm run governance:check`、`npm run format:check`、`npm run ui:check` 全部 exit 0（0 报错、0 违规；日志见 `D:/kk-studio/output/logs/comfy-production-2026-11-03/`） |
| 单元测试 | 2514 项（2494 通过、20 既有跳过、0 失败；见 `main-gate-unit.log`）；覆盖工作流参数解析、原生编辑器快照桥接、扩图像素无损保护、未知提交恢复与项目包原图附件导出 |
| 浏览器回归（Edge / Playwright） | 全量 929 项与后续 6 项窄屏/命中区定向修复全部通过（见 `main-gate-browser.log`、`hit-area-browser2.log`、`hit-area-browser3.log`） |
| Desktop Tauri Release 实机与 ComfyUI | 生产包 `http://tauri.localhost/`（EXE SHA256 `3a870f31103eab556addf03f145fbb7d4cfcc6a28cc9f39dd4778628956e4807`）实机验证通过：ComfyUI 双面板参数同步、原生编辑器回写、局部重绘（`desktop-acceptance.json`）、扩图原像素 0 字节篡改（`outpaint-pixels-receipt.json`）、高清修复与图层拆分互补 Alpha 归档落图连线及重启恢复（`artifacts-receipt.json`、`capabilities-ui-receipt.json`）全部 PASS |
