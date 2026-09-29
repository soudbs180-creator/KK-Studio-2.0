# Review：首页/对话输入区与剩余页面反馈收口

- Task ID：TASK-UI-HOME-002
- 时间与时区：2026-09-29，Asia/Shanghai
- Reviewer/context：实现上下文 self-review；Playwright Edge、TypeScript、Vite build
- 独立于实现上下文：否；未启动独立 reviewer
- branch / worktree：`main` / `D:/kk-studio/KK-Studio-2.0`；dirty tree，无新 head SHA
- 参考：本目录 `intent.md`、`spec.md`、`plan.md`、`verification.md`，Figma 节点 `483:753`/`407:29265`

## 评审范围和方式

- 逐项检查 `StartPage`/`StartComposer` 的入口、可见动作、CSS 几何与菜单回归；检查首页移除快捷按钮后文件菜单仍可打开提示词库。
- 使用 390、834、1099、1920 DOM/截图检查首页和移动顶栏；使用 Figma `407:29265` 核对对话输入；使用 DOM smoke 核对设置底部滑块、侧栏切换、画布工具条和“对话”导航。
- 对旧 input-contract、responsive 和资产 fixture 失败项做分类，不为通过旧断言而恢复与 Figma 冲突的布局。

## Findings

| ID | 优先级 | 影响 | 状态 | 处理/后续 |
| --- | --- | --- | --- | --- |
| UI-HOME-R1 | P2 | canvas 图片编辑器专项依赖空白 fixture 中不存在的 `image-preview`/连接卡片 | OPEN，fixture 限制 | 补齐 canvas fixture 后重跑，不把等待超时归因于本轮布局 |
| UI-HOME-R2 | P2 | 触屏首页隐藏批量/隐私视觉入口后只能使用默认值 | OPEN，产品范围待定 | 若需要触屏调整，另设明确“更多生成选项”入口；本轮不自行扩展 Figma 节点 |
| UI-HOME-R3 | P2 | 既有资产列表专项在空白 fixture 中等待“资产管理”按钮超时 | OPEN，范围外 fixture 限制 | 修补资产/项目 fixture 后单独重跑；不归因于本轮首页输入改动 |
| UI-HOME-R4 | P2 | 平板展开态此前使用 304px 覆盖工作区，且开关图标没有体现 Figma 的状态填充 | FIXED | 改为 291px 右向扩展并推动工作区；展开态填充左侧小框；sidebar/frame 定向回归通过 |

未发现本轮新增 P0/P1 或首页/对话输入交互阻断项。

## 门禁与结论

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| Self-review | PASS（范围内） | 本记录、typecheck/build、3 组定向 Playwright、截图 |
| 独立 AI review | NOT RUN | 无独立上下文 |
| 用户视觉/产品验收 | PENDING | 需用户在 1421 页面刷新后回看 |
| CI、推送、合并、发布 | NOT RUN | 工作区未提交 |

结论：PASS WITH FOLLOW-UPS。已授权 Figma 节点对应的首页、对话、设置、侧栏、画布和移动顶栏已实现并完成关键几何/交互核验；canvas fixture、Tauri/真实设备、完整 Landing 节点和用户最终视觉验收仍未关闭。
