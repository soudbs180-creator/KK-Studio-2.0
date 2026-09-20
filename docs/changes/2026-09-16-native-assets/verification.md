# Verification

## 结果

T3a（原生素材及引用最终验收）在 `main@c855881` 完成，T3b 完整项目包仍未完成。以下证据只关闭 T3a 的范围，不把项目包、持久 TaskHost、真实 Provider 或 ComfyUI 误报为已完成。

## 可复现命令与结果

- `npm run typecheck`：PASS。
- `npm test`：118/118 PASS。
- `npm run ui:check`：116 files / 0 violations PASS。
- `npm run format:check`：PASS。
- `npm run build`：PASS；production bundle `dist/assets/index-CBwa_Zj7.js`。
- `tests/browser/asset-storage.spec.ts tests/browser/desktop-data-stability.spec.ts`：9/9 PASS，覆盖 Web IDB 与生产浏览器数据边界。
- `cargo test --manifest-path src-tauri/Cargo.toml`：36/36 PASS。
- `npm run client:build -- --no-bundle`：PASS（Node 24 PATH）；release 为 `src-tauri/target/release/kk-studio.exe`。

## Tauri release / WebView2 证据

`docs/evidence/native-assets-2026-09-18/native-acceptance.json` 使用独立数据根目录和三个全新 WebView profile 实测：

- URL `http://tauri.localhost/`，入口 `src/main.tsx`，Edge WebView2 `Edg/153.0.4234.46`，无首轮、重启后或篡改后页面脚本错误。
- 写入 68-byte PNG 后得到 `asset-431ced6916a2a21a156e3870`；记录中的原始 SHA-256、首次读取、删除 profile 后第二次读取和修复后的读取均为 `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`。
- 删除第一个 profile 后，第二个全新 profile 通过 `asset_read` 和 `read_creation_snapshot` 读取同一原件与快照；直接存储恢复通过。启动后的可见 route 仍是首页，因此不把首页文本导航当作项目页视觉验收。
- 篡改 blob 后，第三个 profile 报告 `素材原件 SHA-256 校验失败，已保留原文件`；读取保护文案明确为“项目数据无法完整读取，原件已保留。本次修改仅在内存中”，`creation-v2.json` SHA-256 从 `5efd6f3f293c7485db5c630c122b77b7b755bfb350de02318f1fa5c072dcbec8` 保持不变。
- 恢复 blob 后再次读取回到原始 SHA-256；`asset_list` 初始返回 1 条记录，记录 SHA-256 为 `f0b6ae774bb5f6dac7dadecd556d0686bbf9466ade8c05af26e8b44c0f6c1d35`。

构建绑定见 `docs/evidence/native-assets-2026-09-18/build-artifacts.json`：源码提交 `c8558818f221d924be001ffcfc50365653cf8d55`，bundle SHA-256 `a5dc4d02dc0bba25b42960cccc3bf3bb075dc38c06a20aaba2da025f1bdaea50`，release exe SHA-256 `3d0a58e7ce2e225523e98ccef7eddbc5574ead3724d2386116591704775984d9`。

## 范围限制

本轮没有实现 `.kkproject` 导出/导入包、跨平台归档格式、持久 TaskHost、真实 Provider/ComfyUI、远程发布或 Mobile；这些保持在 T3b 及后续任务中。素材库失败重试 UI 的运行截图也不作为本轮新增承诺，已有代码和单测只证明原生素材存储、引用水合及失败保护。
