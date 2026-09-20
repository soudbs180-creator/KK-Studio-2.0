# 工作台整合 Verification

- 目录：`D:\kk-studio` 不存在；`D:\kk-studio-next` 保留为唯一工程。
- 代码引用：src/tests 已无 `src/core`、`src/modules` 和旧资源路径引用。
- 存储：`src-tauri/src/storage_paths.rs` 创建专属数据树，旧 `config.json`/`conversations.json` 只读迁移且清空明文 api_key。
- 视觉/行为：此前浏览器 smoke 14/14，UI standards 0 violations；资源路径迁移后需重新执行同样检查。
- 结论：目录与契约 Verified；后端 IPC、真实账号、记忆持久化和模型调用仍是 Prototype，未宣称已接通。
