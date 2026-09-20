# Verification

- ID：desktop-data-stability-20260916
- 范围：审计 T1/T2，本地创作快照读取保护、画布状态与身份。产品整体仍未达到 MUR。
- 基线：HEAD `609f524` 加原有工作区改动；Node 91/91。逐文件原副本位于 `tmp/desktop-data-stability-20260916/baseline`，未 reset、全量暂存或提交。
- 当前状态：T1/T2范围已通过，最终结果见文末；下方中间日志保留历史过程。后续原生素材T3a证据在相邻`2026-09-16-native-assets`目录，不能混用bundle和计数。

## 实现与故障回归

- `src/features/creation/useCreationStorage.ts` / `storage.ts` / `snapshotCodec.ts`：区分读取失败与首次启动；失败禁止空写；重新读取、写失败重试与草稿下载分离；串行防抖保存和 revision CAS。
- `src-tauri/src/creation_storage.rs` / `creation_validation.rs`：真实文件校验、操作系统锁、临时文件 sync、提交替换、有效备份保护、损坏与 pre-canvas 原字节留存。Rust 测试覆盖目录型访问失败、提交前/同步前故障注入、双损坏、未来版本、竞争提交。
- `src/domain/projectCanvas.ts` / `App.tsx` / Canvas hooks：canvas v1，节点坐标、连接、视口、参数进入项目；UUID 替代递增计数器；回调绑定项目；重新读取以 loadEpoch 更新画布。
- 最初 RED：IPC 读失败重试可发空写；刷新 image.x=146 回到82；未知图/重复ID与截断字段。对应 `red-graph.log`、`red-rust-faults.log` 和早期浏览器日志。GREEN 见最终验证日志。
- 独立复核新增 RED：同 activeProjectId 重新读取后收藏列表仍用旧 items，改名会覆盖远端新增；等 revision 但不同内容的 journal 会误标已保存（人为构造的边界输入，未宣称正常 UI 能产生）。`review-red.log` 两项失败；已按权威项目内容和严格版本冲突修正，定向 `review-green.log`。
- UI 成功反馈：写失败重试成功会清除过期错误；恢复草稿入口保留。未保存 JSON 下载不等于完整可移植项目包。

## 已执行验证

| 验证 | 结果 | 证据 |
|---|---|---|
| npm run verify（最后复核前） | exit0；96 Node；UI116/0；typecheck/format/build；136 browser 中135首次通过，1项 page.goto HTTP响应失败重试通过 | `tmp/desktop-data-stability-20260916/verify-final.log` |
| 语音与本轮存储定向复跑、无重试 | 14/14通过；含前次导航波动用例 | `final-scoped.log` |
| Rust测试（画布校验复核前） | 18/18通过 | `rust-final.log` |
| npm run client:check | 通过 | `client-check-final.log` |
| npm run client:build -- --no-bundle | release生成成功；源码有复核修改，最终须再构建取证 | `client-build-final.log` |
| 真实 Tauri release / 独立数据根目录与WebView profile | 4次启动及关闭；A/B位置、边、视口、参数、prompt、UUID恢复；备份恢复和双损坏原件hash保护通过 | `docs/evidence/desktop-data-stability-2026-09-16/native-acceptance.json` |
| Vite development + production preview | 各自真实导入入口、保存/刷新、损坏保护、下载、重新读取；1920与390截图、hover/focus与computed style | 同目录 `browser-runtime.json` |

## UI 来源与实际运行链路

- 已读取本仓库 UI-ALIGNMENT / UI-STANDARDS / UI_SPEC。用户重认证后实时 Figma 读取恢复；文件 `0nU0A7pq6eyjwfwm1TtWkO` 的 Workspace `404:28667` 返回1920×1080根框但子层为空，原 Landing `410:59708` 返回未找到。转读 page `0:1` 的最新节点与通知卡 `410:67354`，未用历史 `1:2` 覆盖。
- 恢复反馈属于工程补充：复用现有 `.start-status`、`.ui-button`、`--bg-surface` / `--ui-*` tokens，允许说明和动作换行，不声称与通知卡原稿尺寸逐像素一致；未重做主页面。
- 启动：`npm run dev -- --host 127.0.0.1` → `http://127.0.0.1:1421/`，development，`/@vite/client` + `/src/main.tsx`。
- production：Playwright 的 `vite preview --host 127.0.0.1 --port 1423 --strictPort` → `http://127.0.0.1:1423/`，production，`/assets/index-*.js`。
- Desktop：`src-tauri/target/release/kk-studio.exe --data-dir <隔离绝对路径>`，独立 `WEBVIEW2_USER_DATA_FOLDER`，`http://tauri.localhost/`，production，WebView2 DPR1.5。先用 `get_storage_root` 验证路径再进行合成CRUD；测试未读取或覆盖真实用户项目。
- `/` 是唯一 URL；内部 active 状态选择 landing / projects / workspace。`src/main.tsx → App.tsx → CreationStorageNotice`；工作台为 `App → Canvas → CanvasNodeLayer → CanvasNodeItem → 节点编辑器`；项目库为 `App → LibraryPage`。CSS入口和最终 computed style 记录于 browser-runtime.json。
- 截图人工检查：1920与390读取保护说明及按钮可见、在视口内；Desktop重开A/B图状态与DOM对应。旧Mobile整体布局裁剪、Web仍有ComfyUI入口等既有问题没有因这次局部验证而算作完成，继续留在平台边界/Mobile阶段。

## 边界与剩余工作

- 本轮完成的是正常保存后关闭/重启与合成故障恢复；未验证突然断电、所有文件系统的持久保证、未提交状态下强杀进程、后台任务继续执行。Windows目录无法通过标准 File sync_all 同步，已在源码标注。
- 现有超长 data URL 现在被读取保护拒绝，尚未由原生素材引用替代；T3要消除限制冲突并接文件仓库、完整项目包。
- 真实Provider、ComfyUI主流程、持久TaskHost、Web capability清理、VPS staging和生产替换仍在审计后续任务内。本次未写VPS、改域名或下线Vercel。
- 最终代码复核后需要刷新完整验证与相同release取证；完成记录追加在下方，不能使用旧bundle证明新修改。

## 最终复核结果

- `verify-reviewed.log`：完整 verify 通过，96/96 Node、138/138浏览器、typecheck、UI116/0、format和build通过，无失败或flaky。
- `review-rust-red.log`：新故障用例先确认原生错误接纳损坏canvas；对齐校验后 `rust-reviewed.log` 20/20通过。
- `client-build-reviewed.log`：重新构建release成功，bundle `index-DLNmKaeA.js`。`native-reviewed.log`与native-acceptance.json确认相同bundle、4次启动/关闭及所有隔离恢复断言通过。
- T1/T2当前定义的范围通过。后续T3a只在完成该前置后开始；其他MUR门禁保持未完成。没有Git提交/合并/推送，也未清理已有未提交实现。
