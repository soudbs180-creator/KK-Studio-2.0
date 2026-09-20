# 本地来源审计与未合并变更

审计对象：原 `D:/kk-studio-next` dirty checkout、已验证本地 `main`、本次云端替换候选。原 checkout 的未提交文件没有自动复制到同步候选。

## 已纳入本地 main

本地 main 是当前可复现、可验证的基线，已包含已经 squash 合入的治理、T3b 项目包、T4 统一图片命令和 T5 原生 TaskHost 代码。目录以仓库现有 `src/`、`src-tauri/`、`public/`、`tests/`、`docs/`、`scripts/`、`config/` 和锁文件为准。

## 发现但未自动合并的 dirty checkout 变更

原 checkout 还存在一组未提交的焦点/菜单改进及对应浏览器用例，涉及 `src/components/useDismissible.ts`、`src/components/Modal.tsx`、`src/components/TopBar.tsx`、`src/components/TaskPanelPopover.tsx`、`src/components/settings/SettingsControls.tsx`、`src/components/settings/ConnectionSettings.tsx`、对应 settings 样式，以及三个 modal/settings/topbar 生命周期浏览器用例。它们没有经过本次主线的独立审查和完整验证，因此不属于本次“本地 main 与云端 main 一致”的来源；原 checkout 保持原样，后续应作为独立 UI task branch 评审。

这条边界是有意的：把 dirty checkout 整体覆盖到云端会混入截图、临时文件、运行数据和未验收实现，也会让本地 `main` 与云端 `main` 无法说明来源。

## 目录清理结论

- 删除本地重复的 `docs/migrations/kk-studio-2.0/` 过渡复制目录；只保留当前 change record。
- 删除 change record 中重复的 remote-readme/folder-map；同步规则集中在 `sync-manifest.md`。
- 保留 `docs/evidence/` 与 `docs/reference/` 作为本地审计资料，禁止把它们解释成运行时源码或用户数据。
- 保留跟踪的 `src-tauri/gen/schemas/`，它是 Tauri 契约生成物，不是 `target/` 构建产物。
- `public/KK-Studio-Figma-Editable.zip` 仍需后续确认是否为产品交付资产；本次不删除，也不把它当作运行时依赖。

## 复核命令

```powershell
git rev-parse main^{tree}
git rev-parse origin/chore/TASK-KK2-MAIN-SYNC^{tree}
git diff --check
node scripts/check-governance.mjs
```

两端 tree 相等且 PR 合并后回读 `origin/main` 才能关闭 main 同步任务。
