# Plan

- ID：2026-09-11-logo-correction
- 顺序：读取最新 Figma → 记录修改前浏览器 → 完整资源导出 → 共用 BrandLogo 与尺寸 tokens → 修正页面引用与桌面图标 → 浏览器复核 → verify → Tauri release 重建 → 更新进度。
- 变更文件：public/design/figma/logo*.svg、sidebar-logo.svg、BrandLogo、相关品牌引用组件、原有样式及 tokens、src-tauri/icons、docs/PROGRESS.md。
- 风险与回滚：保留脏工作区；所有修改只限本次图形和尺寸。before 截图与旧资源保存于 docs/evidence/logo-correction-2026-09-11。
- 验证：npm run verify；相同状态浏览器截图与 DOM；Tauri --no-bundle 构建及图标文件检查。
