# Specification

- 唯一日常工程：D:/kk-studio/KK-Studio-2.0；版本基线 2.0.0，后续按 patch/minor/major 演进。
- 融合 closure dac81ec、安全 9274195、本地能力 31e7eeb 和 MiniMax Skill/MCP 改进 e48ba25；按实际冲突逐项保留两边有效行为，不使用文件日期或整树覆盖。
- 未提交/历史候选保留可恢复源码、index、refs 和校验清单；不得把未经验证的历史实现重新覆盖已验证主线。
- 保留应用 identifier、凭据服务名、IndexedDB/localStorage key、%APPDATA%/kk-studio 和现有项目 schema。
- 备份使用独立 ZIP 的 SHA-256 内容对象和逐路径 manifest；排除明确可重建的 node_modules/dist/target/test-results/.vite/__pycache__。删除前需对象回读校验、用户数据恢复演练和路径边界校验。
- 缩减重复 worktree、临时快照、历史构建和依赖副本；保留源码、必要测试、现行文档、历史 Git 引用和当前可运行产物。
- 验收：完整 verify、Rust fmt/test/check、桌面构建、1421/1423/隔离 Tauri 运行检查；分享包清单与校验；最终目录结构、容量和 refs 回读。
- 远端 PR #8/Actions 是独立门禁；本地融合不冒充远端 main 已合并或真实 Provider/ComfyUI 已完成。
