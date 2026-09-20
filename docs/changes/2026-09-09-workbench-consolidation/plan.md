# 工作台整合 Plan

1. 删除旧 `D:\kk-studio`，保留带日期的历史归档和用户数据备份。
2. 将 `src/core` 统一为 `src/domain`，provider 适配器移到 `src/integrations`。
3. 将 Figma 与 demo 资源归入 design/fixtures，移除根目录临时审计文件。
4. 建立浏览器存储契约与 Tauri `AppPaths`，为旧配置提供保留原文件的一次性迁移。
5. 补齐架构、数据分级、开发、评审和 SDLC 文档。
6. 运行 typecheck、unit、UI standards、format、build、cargo check；清理生成物。
