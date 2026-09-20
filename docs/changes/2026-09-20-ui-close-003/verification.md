# UI-004 收口验证

执行目录：`C:/Users/Administrator/.codex/worktrees/task-ui-close-003/kk-studio-next`。基线提交：`c3ff0871b3db674e0ab073f1445879d84fee3507`。

## 静态与构建基线

- `npm ci`：通过，179 packages，0 vulnerabilities。
- `npm run typecheck`：通过。
- `npm run lint`：通过，Governance 31 tasks / 0 violations。
- `npm run build`：通过；仅保留既有 Vite chunk size 和依赖注释提示。

## 真实浏览器验证

使用独立 Vite development `http://127.0.0.1:1421/` 与 production preview `http://127.0.0.1:1423/`，均使用 Edge、1920×1080，`prefers-reduced-motion: reduce`；随后在 390×844 验证窄屏。

- 进入项目库 → 新建项目 → 帮助与快捷键 → 快捷按键。
- 两种运行模式均确认 Shortcuts 外框 `672×480`、背景 `rgb(31,31,31)`、外框 `rgb(60,60,60)`、圆角 18px；顶部内部 divider 仍为 `rgb(51,51,51)`。
- 全局、画布、文件三个 tab 均可切换；390px 画布 tab 无横向溢出；Escape 关闭并将焦点返回帮助按钮。
- 两种模式 `pageErrors=[]`。

截图与回读 JSON：

- `docs/evidence/2026-09-20-ui-close-003/development-shortcuts.png`
- `docs/evidence/2026-09-20-ui-close-003/development-shortcuts-narrow.png`
- `docs/evidence/2026-09-20-ui-close-003/development.json`
- `docs/evidence/2026-09-20-ui-close-003/preview-shortcuts.png`
- `docs/evidence/2026-09-20-ui-close-003/preview-shortcuts-narrow.png`
- `docs/evidence/2026-09-20-ui-close-003/preview.json`

定向回归：`tests/browser/design-corrections.spec.ts`，4 passed，单 worker、0 retry。

## 未验证及保留范围

- 本任务没有启动或改动 Tauri release；由主协调者在最终 main 上执行 Desktop freshness 和运行态验收。
- Landing、项目库/Skill/ComfyUI、Settings 其它分类仍因当前 Figma 缺稿保持 `PARTIAL`；没有证据支持进一步的像素级修改。
