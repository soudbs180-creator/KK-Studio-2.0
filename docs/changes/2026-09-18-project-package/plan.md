# Implementation Plan — completed Desktop unit

1. Shared contract/preflight：已完成。确定性 JSON、SHA-256、引用闭包、metadata/schema、secret/path/重复/未知条目拒绝，逻辑层不依赖文件路径或 Tauri。
2. Native transaction：已完成。ZIP32 有界解析和严格 snapshot；导出独占临时文件 + sync/readback + 新目标 hard-link；导入独占 sibling staging + 仓库回读 + 新目录 rename；复用已有 AssetRepository 和 SnapshotRepository。
3. Settings entry：已完成。储存分类提供原生文件选择、预检、独立恢复和打开副本；Web 明示禁用。异步/取消/错误/重复点击/旧 revision 有保护。
4. Acceptance：已完成。129 unit / 156 browser / 50 Rust，全新 release 与 WebView 恢复图、消息、任务和原件；7 个事务故障点和非法包测试；1421/1423/Tauri 三条运行链记录在 verification.md。
5. Governance：以 verification.md 和新证据关闭 T3b Desktop Windows 单元。下一依赖项为 T4，随后 T5、T6。Web File/Blob 传输归 T9；Figma 全状态对齐及真实外部服务保持独立门禁。

偏差已同步 spec：v1 只接受新文件/新目录，既有空目录也拒绝；ZIP32 无 archive comment；导出使用新目标 hard-link，恢复使用目录 rename；不声称写入中取消或断电级事务认证。
