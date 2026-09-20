# Verification

- Figma 读取与限制：有效节点已记录于 spec；Landing 410:59708 无效，UI-004 仍 PARTIAL。
- 源码变更：快捷键弹层外框消费 --border-default；已有 design-corrections computed border 回归保留。
- npm run typecheck 通过；整合 npm run verify 151 Node/197 browser、0 failure/flaky；整合三模式 runtime 证据见 docs/evidence/2026-09-21-main-close-002/runtime/。
- 同状态运行核对：1920×1080 和 390×844；Escape、外部点击、工具栏菜单切换和窄屏账号弹层关闭均通过。
