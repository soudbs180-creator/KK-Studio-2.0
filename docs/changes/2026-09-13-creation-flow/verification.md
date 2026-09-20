# 验证记录

## 已执行

- `npm run typecheck`：通过。
- `npm test`：20/20 通过。
- `npm run build`：通过；仅保留依赖 Zod 的 Rollup 注释警告。
- 目标源码和样式 Prettier 检查：通过。
- `npm run ui:check`：96 个文件、0 项违规；新增工作台附件、消息、供应商字段和连接状态拆分后仍通过组件边界门禁。
- Chrome 152 headless 本地页面回归：完整 **111/111**；创作流程 5/5；目录/画布 14/14；前端/运行态/生成及其它交互回归通过。回归覆盖未配置时保留草稿并进入设置、工作台附件与未发送文字刷新恢复、配置后 provider 响应回填、任务和消息恢复、独立项目与 Figma shell 几何。
- `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features`：6/6；`cargo fmt --manifest-path src-tauri/Cargo.toml --check`：通过。
- `npm run client:build -- --no-bundle`：通过，生成 2026-09-13 14:26:33 的 `src-tauri/target/release/kk-studio.exe`；该 release 入口已通过 WebView2 CDP 只读确认 `http://tauri.localhost/`、`runtimeMode=production`、`runtimeEntry=src/main.tsx` 和首页可见。当前 CUA 桥接仍不能采集桌面交互截图，因此桌面视觉运行态不标为 Verified。

## 尚未覆盖

- 未配置真实 API Key，因此 provider 验收只使用了兼容接口的浏览器路由响应；仍需用真实图片服务确认模型能力、远程结果链接的有效期和服务端错误语义。
- 浏览器项目快照已迁移到 IndexedDB；桌面项目快照通过 Tauri IPC 写入 `%APPDATA%\\kk-studio\\projects\\creation-v2.json`。桌面 release 已重建，但未完成可视化交互采集。
- 未对真实 Windows Credential Manager 写入测试密钥；凭据命令已编译、注册并由设置页接线，真实密钥应由用户在桌面设置内填写后验证保存、读取和清除。
