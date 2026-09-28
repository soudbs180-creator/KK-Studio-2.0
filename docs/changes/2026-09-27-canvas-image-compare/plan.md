# Plan：画布图片对比

- Task ID：TASK-COMPARE-001
- 状态：READY
- 日期：2026-09-27
- Intent/Spec：`intent.md`、`spec.md`
- Owner / branch / worktree：root / `codex/TASK-COMPARE-001-canvas-compare` / `D:/kk-studio/.worktrees/canvas-compare`
- Base：`origin/main@a89792a`；原目录 `main` dirty，保持原样。

## 开工证据

- 规则：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/{PROMPTING,SDLC,BRANCH-POLICY}.md`、治理账本、Design System 和画布实现已读。
- Node 24.21.0；独立 worktree `npm ci` 通过。基线 `npm run typecheck`、`npm run lint`、`npm run ui:check`、`npm test`（456/456）通过。
- 依赖图：本任务仅依赖现有 Canvas 与图片卡片；不依赖进行中的 UI/Provider 分支。全部文件由当前 worktree 单独写入。

## 实施顺序（每步先写失败测试）

| 步骤 | 文件 | 改动和证明 |
| --- | --- | --- |
| 1 | `tests/unit/imageCompare.test.ts` → `src/features/compare/imageCompare.ts` | 图片资格、顺序、上限、删除/失效剔除；失败测试先行后最小实现 |
| 2 | `tests/browser/image-compare.spec.ts` → `ImageCompareProvider/Controls/Dialog`、`Canvas.tsx`、图片节点、`canvas-compare.css` | 真实入口、2–4 张并排、滑块键盘、加载失败、390px；逐项红绿循环 |
| 3 | FEAT-036 卡/registry、任务账本、`docs/PROGRESS.md`、本交付包 | 登记真实能力与 Web/Desktop 证据边界 |
| 4 | 定向浏览器、全量 `verify`、Desktop 可行的运行检查、自审和独立上下文审查、PR 准备 | 记录真实命令、SHA、截图、遗留门禁 |

## 风险与恢复

- 控件只读，关闭或刷新清空本地临时选择；回滚只需撤销本任务提交，不迁移用户项目。
- 画布拖动和对比操作冲突：按钮拦截 pointerdown；模态对话用现有 `Modal`；浏览器回归覆盖。
- 根目录未提交 UI 文件不拷入任务分支；若未来合并 UI 草案，需按实际冲突和同态截图再验。
- 浏览器固定 1421/1423；若占用先定位当前进程，不抢占其他任务服务。
