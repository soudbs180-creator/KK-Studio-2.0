# 工作台整合 Spec

- 工程唯一来源：`D:\kk-studio-next`；`D:\kk-studio` 删除并不得作为运行目录。
- 代码边界：`src/domain`、`src/integrations`、`src/runtime`、`src/components`、`src-tauri`。
- 资源边界：`public/design/figma`、`public/fixtures/demo`、`design/figma-plugin`。
- 运行时根：`%APPDATA%\\kk-studio`，由 `storage_paths.rs` 创建 `app/providers/profile/memory/projects/conversations/assets/models/comfyui/cache/backups/logs`。
- 凭据：系统 Credential Manager service `com.kkstudio.provider`；模型权重保留在外部 ComfyUI 根目录。
- 验收：类型、核心测试、UI 规范、格式、构建、Rust 检查通过；浏览器行为和同状态视觉证据持续补齐。
