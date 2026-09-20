# Plan

- ID：TASK-PERF-ASSETS-001
- 分工：子任务建立原生/浏览器元数据分页及预览候选；模型容量两次中断后主协调接手补齐可见性取消、AssetCard职责拆分、全库元数据搜索、详情状态和回归。
- 目录：src/components/assets/AssetCard.tsx 管理卡片显示/交互；src/features/creation/assetPreview.ts 管理可丢弃缓存；assetRepository/nativeAssetAdapter 与 src-tauri 保留原件契约。
- 顺序：数据列表 → 按需校验原图 → 有界预览 → 分页/搜索 → 失败恢复 → 原生/浏览器/运行模式验证。
- 回滚：正常回退本任务提交；未改变持久数据库版本和原件格式，新记录无preview但原始Blob保留。
