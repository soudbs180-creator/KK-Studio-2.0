# Verification — TASK-GOV-002

状态：候选验证完成，等待 PR 远端检查和合并。当前候选源码 head 为 `2e96910f2b67649a40fe8da7ea492809434110c0`；后续 head 变化后本记录需重新判断。

- 基线 origin/main@8aca3abdd6386b6d6cee7fd9836e27e5aec38eab；独立任务分支/worktree。
- 当前读取 GitHub：private、默认main、protected=false；protection/rulesets API403要求Pro或公开仓库。未改变可见性/套餐，EXT-GIT仍BLOCKED。证据：docs/evidence/ai-sdlc-2026-09-20/remote-audit.json。
- main现有CI run35492697622 failure；167 browser passed、1 failed sidebar motion、1 flaky creation-flow；较早候选通过不能覆盖当前失败。修复后的本地结果已追加，PR #4 的 hosted CI 以最终 head 单独回读。
- 未调用付费模型、未部署生产、未删除分支/tag、未重写主线；模型eval尚未live执行。
- 本轮UI设计未变，不宣称新Figma视觉验收；Desktop原生TaskHost真实运行验收仍属T5。
- 本次候选本地验证：`npm run verify` PASS；治理 30 tasks/0 violations，Node unit 172/172，UI 标准 119 文件/0 违规，Prettier PASS，Vite production build PASS，Playwright production preview `http://127.0.0.1:1423` 固定端口 PASS（169/169）。
- 浏览器运行模式：Vite preview；route `/`；入口为当前构建 `src/main.tsx`，`data-runtime-mode=production`、`data-runtime-entry=src/main.tsx`；产物为 `dist/assets/index-BmJ91wly.js` 与 `dist/assets/index-DipmenTN.css`。截图与 JSON 使用 `test-results/` 临时输出，不覆盖历史 `docs/evidence`。
- Native/Rust 补充：`cargo test --manifest-path src-tauri/Cargo.toml --no-default-features --locked` 58/58 PASS，`cargo fmt --check` PASS，`npm run client:check` PASS；未运行完整 Tauri GUI release/隔离 WebView provider acceptance，T5 仍 PARTIAL。
- 定向门禁：push policy 临时仓库 9/9、delivery policy 12/12、storage contract 1/1；`npm run delivery:check -- --base 8aca3abdd6386b6d6cee7fd9836e27e5aec38eab --head 2e96910f2b67649a40fe8da7ea492809434110c0 --branch codex/TASK-GOV-002-ai-sdlc` 为 0 violations。
- PR 状态：draft PR #4 已创建，首次 head `2420a02d21e258ed43367bde37fa2ef350c16fc5`；补充本状态记录后会产生新的最终 PR head，需以该 head 的 hosted checks 为准。
