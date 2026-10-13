# Verification

- `node node_modules/typescript/bin/tsc --noEmit`：通过。
- `node --test tests/unit/mediaDimensions.test.ts tests/unit/canvasGraph.test.ts tests/unit/modelSelection.test.ts`：6 项通过。
- `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs`：955 项，946 通过、9 跳过、0 失败。
- `node scripts/check-ui-standards.mjs`：217 个文件，0 项违规。
- `node node_modules/typescript/bin/tsc -b`：通过。
- `node node_modules/vite/bin/vite.js build`：通过；仅保留既有 chunk 大小提示。
- 本地生产预览通过浏览器检查：首页模型菜单与扩展三分类、画布任务弹层尺寸、Agent 参考图区域和主 Agent 模型菜单均可见。

## 2026-10-11 增量菜单与场景质量复验

- 复验范围：模型场景菜单、扩展分类、禁用未知用途模型、键盘 Home/End/方向键、响应式输入区，以及 Agent 图片模型刷新归档流程。
- 浏览器证据：`tests/browser/model-picker.spec.ts`、`catalog-pages.spec.ts`、`settings-scroll.spec.ts`、`responsive-layout.spec.ts` 共 34/34；`figma-483-ui.spec.ts` 14/14；Agent Codex 图片归档/切 API 流程 1/1。
- 单元证据：`canvasGraph.test.ts` 与 `mediaDimensions.test.ts` 共 6/6。
- 静态门禁：TypeScript、ESLint、Prettier、`git diff --check`、UI standards、governance、features、project goals、Markdown links、platform/version consistency 均通过。
- 本轮修复：禁用模型不再参与键盘候选；箭头/Home/End 后保持 roving tabindex；场景切换同步 `kind`；场景与扩展面板使用实例唯一 ID；扩展分类改用 `tab`/`tabpanel` 语义；视频菜单明确标注参数仅保留草稿且视频接口未接入。
- 证据边界：以上为本地生产预览与 fixture/Agent 流程，不代表真实付费 Provider、Tauri 安装包、Hosted CI、第二环境安装或用户验收已完成。
- 追加边界：未知用途模型改为可聚焦的 `aria-disabled` 项，保留原因可读性并阻止选择；全禁用搜索结果可由键盘聚焦且不会关闭菜单。模型行置顶按钮名称包含供应商详情，避免同名账号歧义。
- 2026-10-11 全量补验：ESLint（`src`、`tests`、`scripts`）通过；`node --test tests/unit/*.test.ts tests/deploy/*.test.mjs` 为 955 项，946 通过、9 跳过、0 失败。
- 追加浏览器回归：模型/目录/设置/响应式定向集在当前产物上 34/34；Agent 场景原 14 条通过加更新后的图片归档用例 1/1；Figma 483 UI 8/8。
