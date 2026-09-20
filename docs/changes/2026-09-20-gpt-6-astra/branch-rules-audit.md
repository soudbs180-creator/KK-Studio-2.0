# TASK-KK2 / TASK-ASTRA 分支、规则与同步审计

审计日期：2026-09-20。本文记录本地稳定主线、原始 dirty checkout 与用户指定 GitHub 仓库的边界；不把未验收的 UI 候选或 GPT-6 Astra 功能实现写成已完成。

## 当前边界

| 位置 | 状态 | 处理 |
| --- | --- | --- |
| D:/kk-studio-next | codex/desktop-data-stability，保留 dirty/index | 不切分支、不 stage/reset/clean/stash；仅作审计参照 |
| D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001 | main，稳定集成 worktree | 唯一首发源；仅通过 fast-forward 接收已审计提交 |
| C:/Users/Administrator/.codex/worktrees/task-astra-001/kk-studio-next | codex/TASK-KK2-main-integration | 文档清理、治理记录与测试修复的隔离写入点 |
| D:/kk-studio-next/.worktrees/TASK-KK2-MAIN-SYNC | chore/TASK-KK2-MAIN-SYNC | 从云端 main 派生的替换候选；只走 PR |
| https://github.com/soudbs180-creator/KK-Studio-2.0 | private，默认分支 main | 目标 2.0 远端；旧仓库 soudbs180-creator/kk-studio 排除 |

本地 main 与目标仓库初始 main 无共同基线。首次同步使用“云端 main 父提交 + 本地已验证 main tree”的替换提交，避免 unrelated-history merge、force push、mirror push 和 direct main push。

## 规则核对

- AGENTS/CONTRIBUTING：main 只接收已审计提交；开发使用 task branch/worktree；禁止普通 direct push、force push 和批量镜像。
- 数据边界：不上传 API key、OAuth token、系统凭据、用户数据、localStorage/IndexedDB 导出、构建产物、临时目录或个人路径。
- 目录边界：应用源代码只放现有 2.0 根目录职责；迁移清单统一放 `docs/changes/2026-09-20-gpt-6-astra/`，删除重复的 `docs/migrations/kk-studio-2.0/`。
- 验证边界：构建通过不等于 UI/Figma/Tauri 完成；dirty checkout 中的 UI 改动登记为独立任务，不进入本次首发候选。
- 历史 task branch 即使未祖先于 main，也不能仅凭 ahead/behind 重复 cherry-pick；以 task ledger 和已合入提交证据为准。

## 目标仓库核对结果

- authenticated GitHub REST 已确认仓库为 private，默认分支为 `main`，当前凭据具备 admin/maintain/push/triage/pull 权限；open PR 当前为空。
- `main` 当前 `protected=false` 且 required checks 为空；rulesets/protection API 返回 403，GitHub 提示当前计划不能启用该功能。因此 EXT-GIT 仍保持 BLOCKED，不能把 workflow 文件冒充托管分支保护。
- quality workflow 已存在并在候选分支运行；CI 结论必须以最终候选 SHA 的 run 为准。

## 同步步骤与验收

1. 在隔离 worktree 中完成文档/治理清理和必要测试修复；运行治理检查、build、client:check 及定向浏览器回归。
2. 将稳定本地 main fast-forward 到该提交；确认原始 dirty checkout 指纹没有变化。
3. 从远端 main 派生 `chore/TASK-KK2-MAIN-SYNC`，写入稳定 main 的完整 Git tree；候选 tree 必须与本地 main 相等。
4. 推送候选分支，创建 PR，等待该 SHA 的 quality workflow 成功；只通过 PR 合并到远端 main。
5. 合并后 fetch 并回读远端 main commit/tree；两端 tree 不一致时保持任务未完成。若需要更新治理状态，使用后续小 PR，直到最终 tree 再次相等。

## 目录结构白名单

首次同步的根目录职责固定为：`.github/`、`config/`、`deploy/`、`design/`、`public/`、`src/`、`src-tauri/`、`tests/`、`scripts/`、`docs/`，以及 `package.json`、`package-lock.json`、`index.html`、工具配置。旧远端的 `apps/`、`packages/`、`services/` 等目录不在本地 2.0 树中，候选提交会删除其当前文件；旧历史仍可追溯。

审计数据 `docs/evidence/`、参考资料 `docs/reference/` 只有在路径、大小和敏感信息扫描通过后随稳定 tree 同步；它们不是第二套运行时目录。
