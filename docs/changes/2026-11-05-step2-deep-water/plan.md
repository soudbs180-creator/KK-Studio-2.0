# 实施顺序

任务：TASK-DEEP-WATER-20261105。基准 main@752f7dbd，工作区干净，仅一个 worktree。按用户本次明确要求在 main 收口，不新建重复分支或 worktree。

依赖图：领域/持久化契约 → 功能适配/生产调用 → Figma/共享 UI → 定向回归 → 全量门禁/桌面产物 → 独立审查 → 提交。MCP Schema 与复杂度整理互不依赖，但由同一工作区串行修改。

改动面：cameraOptics/creationModel/Rust 项目包、storyboardPipeline/workflows/useStoryboardWorkflow/App、canvas schema/reducer/MCP vendor/floorplan/runtime、指定共享控件与调用测试、changelog/governance/feature cards。保持公共出口、既有校验、取消和受理幂等逻辑；不引入依赖，不复制 GPL/AGPL 源码。
