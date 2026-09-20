# Verification

- ID：TASK-MAIN-CLOSE-002；本轮实施及运行验收 PASS，PR/CI 和同步在合并时单独回读。
- 初始 base：c3ff0871b3db674e0ab073f1445879d84fee3507；整合代码 head：e4fcf83（产品代码候选为 8369185；其后仅合入治理/文档/审计脚本变更）。最终 PR 需合入最新 origin/main 治理规则，准确 head/tree 以 Git 与 PR 记录为准。
- 定向回归：`npm run build` 通过；`frame-accuracy.spec.ts --workers=1 --retries=0 --repeat-each=3` 共 12/12 通过；`creation-flow.spec.ts --grep 工作台消息属于 --workers=1 --retries=0 --repeat-each=5` 共 5/5 通过。新侧栏采样捕获真实 CSSTransition，固定五个时间点并保留全部原有几何断言。连续创作用例在第一张结果实际归档完成后再提交第二次编辑，符合产品同项目执行中的提交门禁。
- 完整 `npm run verify` 通过：172 Node、197 browser，0 failure、0 flaky，UI121/0，lint/typecheck/format/build 通过。新增测试将截图写入 test-results，避免覆盖历史证据；摘要见 `docs/evidence/2026-09-21-main-close-002/browser-summary.json`。
- 分工与证据：页面见 TASK-UI-CLOSE-003，素材性能见 TASK-PERF-ASSETS-001；集成和最终运行证据在本文件完成后补齐。
- Rust `cargo test --no-default-features --locked` 61/61，cargo fmt 通过；`npm run client:build -- --no-bundle` 通过。release 仅有既有 dead-code warning，未关闭检查。
- 素材专项 7/7、0 retry：125 项、每项 2,348,050 字节，总 293,506,250 字节；metadata 列表首次不读取原件，分页/末页搜索/320px 缩略图/详情原件 SHA/损坏重试/音视频控件/键盘回焦通过。
- CI follow-up：Hosted Windows runner 曾在 90 秒 seed 上限触发大库测试超时，并在 1 秒动画等待窗口出现一次 flaky；将该大库用例上限设为 180 秒、共用动画 settle 窗口设为 5 秒，未放宽业务断言。定向 10/10 通过；最终 PR CI 需重新验证。
- Figma：缺失 Frame 不得由浏览器截图或工程设计代替；页面子任务负责回读当前来源。
- 三种运行模式实际验收结果见 `docs/evidence/2026-09-21-main-close-002/runtime/`；三个报告均 `passed: true`、`pageErrors: []`，预览和 Desktop 均加载 `index-C6RT8Uju.js`。

## 运行链路与边界

- 开发：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort`；预览：同命令 `preview --host 127.0.0.1 --port 1423 --strictPort`；Desktop：本候选重新构建的 `src-tauri/target/release/kk-studio.exe --data-dir <isolated>`，独立 WebView profile/CDP9337，并回读 `get_storage_root`。
- 实际 route/import：projects→workspace、文件→资产管理、workspace→快捷按键；`main.tsx→App.tsx→ConversationPanel/ChatComposer`，`useAssetArchive→AssetPanel→AssetCard/AssetDetail`。Web viewport 1920×1080，窄屏 390×844；桌面 viewport/DPR 见 JSON。
- 第一次运行曾因其他任务占用 1423 读取到错误 bundle `index-D2PqpAea.js`，该次明确不计验收。端口释放后仅启动/关闭本任务 PID，并增加 production bundle 一致性断言。
- Landing 410:59708 无有效当前节点，项目库/Skill/ComfyUI/部分设置缺独立现行 Frame，UI-004 保持 PARTIAL。PERF-001 保持 PARTIAL：永久缩略图、大快照和单件大图峰值仍待独立验收。Astra、T5、真实 Provider/ComfyUI、部署及服务器分支保护不由本任务宣称完成。
