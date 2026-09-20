# Verification

- ID：T4；本地产品链 Verified。源码提交 `20e1c64`，release bundle `index-DONtT_Pj.js`。
- `npm run verify` PASS：146 unit、164 Edge browser、UI 119/0、lint/typecheck/format/build。定向 12/12 覆盖非根来源生成和编辑、取消晚到、审批取消、冷却、隔离、原件重绘、缺配置、长模型、结果输入/参考栏在默认和展开状态不重叠。来源中断恢复另有 4 项单元测试。
- Rust 51/51、cargo fmt、client:check PASS；`npm run client:build -- --no-bundle` PASS。构建仍提示现有主 bundle >500kB，属于 PERF-001 后续性能范围。
- 三个运行环境分别通过：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort` 的 development；同命令加 `preview --port 1423` 的 production preview；`src-tauri/target/release/kk-studio.exe --data-dir <isolated>` 的 `http://tauri.localhost/` production。均在 `/` 的 workspace 状态走首页→对话→结果继续编辑，2 次 generations + 1 次 edits，编辑 multipart 含归档原件。
- Desktop 验收使用隔离数据根与 2 个全新 WebView profile；恢复相同 3 个成功任务及 sourceItemId、3 条 result edges，原件 SHA-256 `431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460` 一致。测试凭据已清理，页面错误为 0。
- 可复现脚本与 runtime/DOM 截图、命令日志：`docs/evidence/unified-image-command-2026-09-18/`。从 worktree 根执行 `node docs/evidence/unified-image-command-2026-09-18/acceptance.mjs dev|preview|native`；native 需先构建最终 release。
- 运行链路：`src/main.tsx → App.tsx → Canvas → CanvasNodeLayer/CanvasNodeItem → ImageCreationNode / DemoResultNode → CreationComposer → CanvasImageCommand → submitImageCommand → executeTask`；Home / ConversationPanel 同样提交该 command。
- Figma：本轮认证已可用，但目标 Frame 仅返回边界元数据；沿用现有 tokens/共享组件，新增异步提示和健康标签为工程补充。未宣称完整视觉一致。
- 边界：HTTP fixtures 属于产品链路验收，真实付费 Provider 仍未验证；持久 TaskHost 与 unknown 受理恢复仍属 T5。
- 首轮旧图片 demo/模型名断言已按新契约更新；曾在并行构建期间遇到既有 220ms 会话动画采样失败，静态源码未改该动画，定向 12/12 与最终全量 164/164 均通过，未降低或禁用检查。

## 本地 main 集成验收

- 2026-09-18 已 squash 到 main 源码提交 `2de3c68`；与任务分支产品源码 tree 一致。
- 主线最终 npm run verify：146 unit、164 browser（无重试）、UI119/0、lint/typecheck/format/build全部通过；Rust51、fmt、check、release重新通过。
- 主线1421/1423/Tauri三入口与全新profile恢复复验通过，bundle仍为index-DONtT_Pj.js；桌面exe SHA-256为b517d8ae39f0480eb479505bf06c7370071eab759081e47bb4a395f38e7bbee2。详见evidence/unified-image-command-2026-09-18/main。
- 主线首次verify有1项既有220ms动画采样flaky、重试通过；将同一实际CSSAnimation暂停并检查5个固定时间点，保留非零动画、方向位移、最终位置和toolbar不动的断言后，定向4/4和全量164/164无重试通过。未修改产品动画或降低断言。
- 原checkout仍178项dirty；remote为空。最终文档与测试提交不改变已验收产品源码和release bundle。
